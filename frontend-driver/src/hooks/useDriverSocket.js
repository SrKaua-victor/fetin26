import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { isNative } from "../lib/api";
import { postLocations } from "../lib/nativeHttp";
import { distanceMeters } from "../lib/geo";

const ACTIVE_TRIP_KEY = "bustrack.driver.trip";
const MAX_BUFFER = 2000; // ~1h de pontos guardados enquanto estiver sem sinal
const ACK_TIMEOUT = 10000;
// Com o app em segundo plano as posições sobem em lote por HTTP nativo a cada 10s
const BACKGROUND_FLUSH_MS = 10000;

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

/**
 * Conexão do motorista com a central.
 * Mantém a viagem viva mesmo com quedas de rede: as posições vão para um buffer
 * local e são enviadas em lote assim que a conexão volta.
 */
export function useDriverSocket({ token, serverUrl }) {
  const socketRef = useRef(null);
  const tripRef = useRef(readActiveTrip());
  const bufferRef = useRef([]);
  const tokenRef = useRef(token);
  const registeredRef = useRef(false);
  const lastHttpFlushRef = useRef(0);
  const httpBusyRef = useRef(false);
  const lastPointRef = useRef(null);

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
    if (!active?.tripId || httpBusyRef.current || bufferRef.current.length === 0) return;

    httpBusyRef.current = true;
    const batch = bufferRef.current.slice(0, 500);
    try {
      await postLocations(active.tripId, batch);
      bufferRef.current = bufferRef.current.slice(batch.length);
      setPending(bufferRef.current.length);
      setSent((n) => n + batch.length);
      setLastSentAt(new Date().toISOString());
      lastHttpFlushRef.current = Date.now();
    } catch {
      // Sem rede ou servidor fora: o buffer continua guardado para a próxima tentativa
    } finally {
      httpBusyRef.current = false;
    }
  }, []);

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
    });
    socketRef.current = socket;

    socket.on("connect", async () => {
      setConnected(true);
      // Reconectou no meio de uma viagem: retoma a mesma viagem e manda o buffer
      const active = tripRef.current;
      if (active?.tripId) {
        try {
          await register({
            vehicleId: active.vehicleId,
            routeId: active.routeId,
            tripId: active.tripId,
          });
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

    // Voltou para primeiro plano: manda pelo socket o que ficou acumulado
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (!socket.connected) socket.connect();
      flushBuffer();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      socket.disconnect();
    };
  }, [register, flushBuffer, serverUrl]);

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
      lastPointRef.current = null;
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
      setPending(bufferRef.current.length);

      // No app nativo dá para tentar o HTTP mesmo em primeiro plano:
      // o socket pode estar caído enquanto a rede já voltou
      if (isNative && Date.now() - lastHttpFlushRef.current >= BACKGROUND_FLUSH_MS) {
        lastHttpFlushRef.current = Date.now();
        flushOverHttp();
      }
    },
    [flushBuffer, flushOverHttp]
  );

  const stopTrip = useCallback(async () => {
    const socket = socketRef.current;
    // Não perde o que ficou no buffer ao encerrar
    if (bufferRef.current.length && isNative) await flushOverHttp();
    if (socket?.connected) {
      await flushBuffer();
      try {
        await socket.timeout(ACK_TIMEOUT).emitWithAck("driver:stop");
      } catch {
        // se o ack não voltar, o servidor encerra a viagem na desconexão
      }
    }
    bufferRef.current = [];
    setPending(0);
    registeredRef.current = false;
    setRegistered(false);
    setSessionError(null);
    persistTrip(null);
  }, [flushBuffer, flushOverHttp, persistTrip]);

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
