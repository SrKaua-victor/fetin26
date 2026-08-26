import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { isNative } from "../lib/api";
import { postLocations } from "../lib/nativeHttp";
import { distanceMeters } from "../lib/geo";

const ACTIVE_TRIP_KEY = "bustrack.driver.trip";
const BUFFER_KEY = "bustrack.driver.locationBuffer";
const MAX_BUFFER = 2000; // ~1h de pontos guardados enquanto estiver sem sinal
const ACK_TIMEOUT = 10000;
// Com o app em segundo plano as posições sobem em lote por HTTP nativo a cada 10s
const BACKGROUND_FLUSH_MS = 10000;
// Cadência da cópia do buffer no localStorage. Ver `persistBuffer`.
const PERSIST_MIN_INTERVAL_MS = 5000;
const PERSIST_EVERY_POINTS = 25;

function isBackground() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function readActiveTrip() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_TRIP_KEY) || "null");
  } catch {
    return null;
  }
}
function readBuffer() {
  try { const value = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function storeBuffer(points) {
  if (points.length) localStorage.setItem(BUFFER_KEY, JSON.stringify(points));
  else localStorage.removeItem(BUFFER_KEY);
}

/**
 * Conexão do motorista com a central.
 * Mantém a viagem viva mesmo com quedas de rede: as posições vão para um buffer
 * local e são enviadas em lote assim que a conexão volta.
 */
export function useDriverSocket({ token, serverUrl }) {
  const socketRef = useRef(null);
  const tripRef = useRef(readActiveTrip());
  const bufferRef = useRef(readBuffer());
  const tokenRef = useRef(token);
  const registeredRef = useRef(false);
  const lastHttpFlushRef = useRef(0);
  // Guarda o envio HTTP em andamento (não só um booleano) para quem chegar depois
  // poder esperá-lo em vez de desistir.
  const httpFlushRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastPersistRef = useRef(0);
  const sincePersistRef = useRef(0);

  const [connected, setConnected] = useState(false);
  // `registered` = o servidor reconhece esta viagem. Só com ele as posições contam.
  const [registered, setRegistered] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [trip, setTrip] = useState(tripRef.current);
  const [pending, setPending] = useState(0);
  const [sent, setSent] = useState(0);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [distance, setDistance] = useState(0);

  tokenRef.current = token;

  /**
   * Copia o buffer para o localStorage sem fazer isso a cada leitura do GPS.
   *
   * `storeBuffer` serializa o array inteiro, que chega a MAX_BUFFER pontos. Como o
   * watcher roda com distanceFilter 0, vinha uma posição por segundo — em segundo
   * plano isso era um JSON.stringify de milhares de objetos por segundo durante toda
   * a viagem, gastando CPU e bateria à toa. A cópia existe para o caso de o sistema
   * matar o app, então basta estar razoavelmente em dia: grava a cada 25 pontos ou
   * 5 segundos, o que vier primeiro. `force` grava na hora, nos momentos em que
   * perder pontos importaria (app indo para segundo plano, fim de viagem).
   */
  const persistBuffer = useCallback((force = false) => {
    sincePersistRef.current += 1;
    const due =
      force ||
      sincePersistRef.current >= PERSIST_EVERY_POINTS ||
      Date.now() - lastPersistRef.current >= PERSIST_MIN_INTERVAL_MS;
    if (!due) return;

    sincePersistRef.current = 0;
    lastPersistRef.current = Date.now();
    storeBuffer(bufferRef.current);
  }, []);

  const persistTrip = useCallback((value) => {
    tripRef.current = value;
    setTrip(value);
    if (value) localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(value));
    else localStorage.removeItem(ACTIVE_TRIP_KEY);
  }, []);

  const flushBuffer = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected || bufferRef.current.length === 0) return;

    const batch = bufferRef.current.slice(0, 1000);
    try {
      const res = await socket.timeout(ACK_TIMEOUT).emitWithAck("driver:location:batch", batch);
      if (res?.ok) {
        bufferRef.current = bufferRef.current.slice(batch.length);
        storeBuffer(bufferRef.current);
        setPending(bufferRef.current.length);
        setSent((n) => n + res.saved);
        setLastSentAt(new Date().toISOString());
      }
    } catch {
      // sem conexão ainda — o buffer continua guardado para a próxima tentativa
    }
  }, []);

  /**
   * Sobe o buffer por HTTP nativo. É o caminho usado com o app em segundo plano,
   * onde o socket da WebView deixa de ser confiável.
   */
  const flushOverHttp = useCallback(async () => {
    const active = tripRef.current;
    if (!active?.tripId || bufferRef.current.length === 0) return;

    // Já existe um envio em andamento: espera esse terminar em vez de desistir.
    // Desistir aqui fazia o encerramento da viagem falhar reclamando de posições
    // pendentes que, na verdade, já estavam subindo naquele instante.
    if (httpFlushRef.current) {
      await httpFlushRef.current.catch(() => {});
      return;
    }

    const run = (async () => {
      const batch = bufferRef.current.slice(0, 500);
      await postLocations(active.tripId, batch);
      bufferRef.current = bufferRef.current.slice(batch.length);
      storeBuffer(bufferRef.current);
      setPending(bufferRef.current.length);
      setSent((n) => n + batch.length);
      setLastSentAt(new Date().toISOString());
      lastHttpFlushRef.current = Date.now();
    })();

    httpFlushRef.current = run;
    try {
      await run;
    } catch {
      // Sem rede ou servidor fora: o buffer continua guardado para a próxima tentativa
    } finally {
      httpFlushRef.current = null;
    }
  }, []);

  /**
   * Esvazia o buffer usando as duas vias disponíveis, em rodadas.
   * Cada flush leva no máximo um lote (1000 pelo socket, 500 por HTTP), então um
   * buffer cheio não cabe em uma chamada só. Para quando esvazia ou quando uma
   * rodada inteira não consegue enviar nada. Devolve quantos pontos sobraram.
   */
  const drainBuffer = useCallback(async () => {
    // Teto de rodadas: MAX_BUFFER dividido pelo menor lote, com folga
    for (let round = 0; round < 8 && bufferRef.current.length; round++) {
      const before = bufferRef.current.length;
      if (socketRef.current?.connected) await flushBuffer();
      if (bufferRef.current.length && isNative) await flushOverHttp();
      if (bufferRef.current.length === before) break;
    }
    return bufferRef.current.length;
  }, [flushBuffer, flushOverHttp]);

  /** Registra (ou retoma) a viagem no servidor. */
  const register = useCallback(
    async ({ vehicleId, routeId, tripId }) => {
      const socket = socketRef.current;
      if (!socket?.connected) throw new Error("Sem conexão com o servidor");

      const res = await socket.timeout(ACK_TIMEOUT).emitWithAck("driver:register", {
        token: tokenRef.current,
        vehicleId,
        routeId,
        tripId,
      });
      if (!res?.ok) throw new Error(res?.error || "Não foi possível iniciar a viagem");
      registeredRef.current = true;
      setRegistered(true);
      setSessionError(null);
      return res;
    },
    []
  );

  // Conexão única, viva enquanto o app estiver aberto
  useEffect(() => {
    // Sem serverUrl (navegador) conecta na própria origem, que o Vite faz proxy
    const socket = io(serverUrl || undefined, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Vale para o transporte de polling, que é HTTP comum e por isso também
      // seria interceptado pela página de aviso do ngrok. Ver lib/api.js.
      extraHeaders: { "ngrok-skip-browser-warning": "true" },
    });
    socketRef.current = socket;

    socket.on("connect", async () => {
      setConnected(true);
      // Reconectou no meio de uma viagem: retoma a mesma viagem e manda o buffer
      const active = tripRef.current;
      if (active?.tripId) {
        try {
          const resumed = await register({
            vehicleId: active.vehicleId,
            routeId: active.routeId,
            tripId: active.tripId,
          });
          if (resumed.tripId !== active.tripId) {
            persistTrip({ ...active, tripId: resumed.tripId, startedAt: resumed.bus?.startedAt || active.startedAt });
          }
          await flushBuffer();
        } catch (err) {
          // A viagem não voltou (token expirado, veículo tomado por outro motorista…).
          // Precisa aparecer na tela: as posições não estão mais chegando na central.
          registeredRef.current = false;
          setRegistered(false);
          setSessionError(
            `${err.message} Encerre a viagem e entre de novo para continuar enviando.`
          );
        }
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
      registeredRef.current = false;
      setRegistered(false);
    });
    socket.on("init", ({ routes: list }) => setRoutes(list || []));
    socket.on("routes:updated", (list) => setRoutes(list || []));

    function onVisibility() {
      // Indo para segundo plano é justamente quando o sistema pode matar o app:
      // garante que o buffer em memória chegou ao localStorage antes disso.
      if (document.visibilityState !== "visible") {
        persistBuffer(true);
        return;
      }
      // Voltou para primeiro plano: manda pelo socket o que ficou acumulado
      if (!socket.connected) socket.connect();
      flushBuffer();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      socket.disconnect();
    };
  }, [register, flushBuffer, serverUrl, persistTrip, persistBuffer]);

  const startTrip = useCallback(
    async ({ vehicleId, routeId, plate, routeName }) => {
      const res = await register({ vehicleId, routeId });
      const active = {
        tripId: res.tripId,
        vehicleId,
        routeId,
        plate,
        routeName,
        startedAt: res.bus?.startedAt || new Date().toISOString(),
      };
      bufferRef.current = [];
      storeBuffer([]);
      lastPointRef.current = null;
      sincePersistRef.current = 0;
      lastPersistRef.current = Date.now();
      setPending(0);
      setSent(0);
      setDistance(0);
      persistTrip(active);
      return active;
    },
    [register, persistTrip]
  );

  const sendLocation = useCallback(
    (point) => {
      const socket = socketRef.current;
      if (!tripRef.current) return;

      // Distância percorrida na viagem, mostrada no painel.
      // Saltos acima de 2 km entre leituras são erro de GPS, não deslocamento.
      if (lastPointRef.current) {
        const step = distanceMeters(lastPointRef.current, point);
        if (step > 1 && step < 2000) setDistance((d) => d + step);
      }
      lastPointRef.current = { lat: point.lat, lng: point.lng };

      // App em segundo plano no celular: acumula e sobe em lote por HTTP nativo.
      // O socket da WebView não é confiável aqui — o Android estrangula depois de
      // alguns minutos, e as posições parariam de chegar sem nenhum aviso.
      if (isNative && isBackground()) {
        bufferRef.current.push(point);
        if (bufferRef.current.length > MAX_BUFFER) bufferRef.current.shift();
        persistBuffer();
        setPending(bufferRef.current.length);

        if (Date.now() - lastHttpFlushRef.current >= BACKGROUND_FLUSH_MS) {
          lastHttpFlushRef.current = Date.now();
          flushOverHttp();
        }
        return;
      }

      if (socket?.connected && registeredRef.current) {
        socket.emit("driver:location", point);
        setSent((n) => n + 1);
        setLastSentAt(new Date().toISOString());
        if (bufferRef.current.length) flushBuffer();
        return;
      }

      // Offline: guarda para enviar quando a conexão voltar
      bufferRef.current.push(point);
      if (bufferRef.current.length > MAX_BUFFER) bufferRef.current.shift();
      persistBuffer();
      setPending(bufferRef.current.length);

      // No app nativo dá para tentar o HTTP mesmo em primeiro plano:
      // o socket pode estar caído enquanto a rede já voltou
      if (isNative && Date.now() - lastHttpFlushRef.current >= BACKGROUND_FLUSH_MS) {
        lastHttpFlushRef.current = Date.now();
        flushOverHttp();
      }
    },
    [flushBuffer, flushOverHttp, persistBuffer]
  );

  const stopTrip = useCallback(async () => {
    const socket = socketRef.current;

    // Não perde o que ficou no buffer ao encerrar. Vai em rodadas: antes isto era
    // um único flush, então quem tivesse mais pontos que um lote ficava preso sem
    // conseguir fechar a viagem, mesmo com a conexão perfeita.
    const left = await drainBuffer();
    if (left) {
      throw new Error(
        `Ainda ${left === 1 ? "há 1 posição pendente" : `há ${left} posições pendentes`}. ` +
          "Conecte-se à internet antes de encerrar."
      );
    }

    if (socket?.connected) {
      try {
        await socket.timeout(ACK_TIMEOUT).emitWithAck("driver:stop");
      } catch {
        // se o ack não voltar, o servidor encerra a viagem na desconexão
      }
    }
    bufferRef.current = [];
    storeBuffer([]);
    setPending(0);
    registeredRef.current = false;
    setRegistered(false);
    setSessionError(null);
    persistTrip(null);
  }, [drainBuffer, persistTrip]);

  return {
    connected,
    registered,
    sessionError,
    routes,
    trip,
    pending,
    sent,
    lastSentAt,
    distance,
    startTrip,
    sendLocation,
    stopTrip,
  };
}
