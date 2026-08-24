import { registerPlugin } from "@capacitor/core";
import { isNative } from "./api";

// No app Android o GPS roda num foreground service: continua enviando com a
// tela apagada e o app em segundo plano. No navegador não existe esse recurso,
// então caímos no watchPosition, que só funciona com o app aberto.
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

const WEB_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 2000,
};

export function describeWebError(err) {
  switch (err?.code) {
    case 1:
      return "Permissão de localização negada. Libere o GPS para este site nas configurações do navegador.";
    case 2:
      return "Não foi possível obter o sinal de GPS. Verifique se a localização do aparelho está ligada.";
    case 3:
      return "O GPS demorou demais para responder. Tentando de novo…";
    default:
      return err?.message || "Erro desconhecido ao ler o GPS.";
  }
}

function describeNativeError(err) {
  if (err?.code === "NOT_AUTHORIZED") {
    return "Permissão de localização negada. Abra as configurações do app e libere o acesso à localização o tempo todo.";
  }
  return err?.message || "Erro ao ler o GPS.";
}

/** Abre as configurações do app no Android (para o motorista liberar a permissão). */
export function openLocationSettings() {
  if (isNative) return BackgroundGeolocation.openSettings();
  return Promise.resolve();
}

/**
 * Começa a acompanhar a posição.
 * Devolve uma função para parar o rastreamento.
 */
export async function startTracking({ onPosition, onError, plate }) {
  if (isNative) {
    const id = await BackgroundGeolocation.addWatcher(
      {
        // Ter backgroundMessage é o que mantém o rastreamento em segundo plano.
        // O Android exige essa notificação fixa enquanto o serviço estiver ativo.
        backgroundTitle: plate ? `Em viagem — ${plate}` : "BusTrack — Em viagem",
        backgroundMessage: "Enviando sua localização para a central.",
        requestPermissions: true,
        stale: false,
        // 0 = toda leitura do GPS. O backend já limita o que vai para o banco.
        distanceFilter: 0,
      },
      (location, error) => {
        if (error) {
          onError?.(describeNativeError(error), { code: error.code });
          return;
        }
        if (!location) return;
        onPosition({
          lat: location.latitude,
          lng: location.longitude,
          // O plugin devolve m/s; o resto do sistema trabalha em km/h
          speed: location.speed != null ? Math.max(0, location.speed * 3.6) : 0,
          heading: location.bearing ?? 0,
          accuracy: location.accuracy ?? null,
          recordedAt: new Date(location.time ?? Date.now()).toISOString(),
        });
      }
    );

    return () => BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
  }

  if (!("geolocation" in navigator)) {
    onError?.("Este aparelho não tem GPS disponível.");
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) =>
      onPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : 0,
        heading: pos.coords.heading ?? 0,
        accuracy: pos.coords.accuracy ?? null,
        recordedAt: new Date(pos.timestamp).toISOString(),
      }),
    (err) => onError?.(describeWebError(err)),
    WEB_OPTIONS
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Confere a permissão antes de abrir a viagem.
 * No app nativo quem pede a permissão é o próprio watcher, então não há o que checar aqui.
 */
export function requestPermission() {
  if (isNative) {
    return new Promise(async (resolve, reject) => {
      let watcherId;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (watcherId) BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
        if (error) reject(error); else resolve(true);
      };
      const timer = setTimeout(() => finish(new Error("O GPS demorou demais para responder.")), 20000);
      try {
        watcherId = await BackgroundGeolocation.addWatcher(
          { requestPermissions: true, stale: false, distanceFilter: 0 },
          (_location, error) => {
            finish(error ? new Error(describeNativeError(error)) : null);
          }
        );
        if (settled) BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
      } catch (error) {
        finish(new Error(describeNativeError(error)));
      }
    });
  }
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Este aparelho não tem GPS disponível."));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => reject(new Error(describeWebError(err))),
      WEB_OPTIONS
    );
  });
}
