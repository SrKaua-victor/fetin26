import { useEffect, useRef, useState } from "react";
import { startTracking, requestPermission } from "../lib/location";

/**
 * Acompanha a posição do aparelho enquanto `active` for true.
 * Chama `onPosition` a cada leitura nova do GPS.
 * No app Android o rastreamento continua em segundo plano; na web, só com o app aberto.
 */
export function useGeolocation({ active, onPosition, plate }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const callbackRef = useRef(onPosition);

  callbackRef.current = onPosition;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let stop = null;
    setError(null);

    startTracking({
      plate,
      onPosition: (point) => {
        setPosition(point);
        setError(null);
        callbackRef.current?.(point);
      },
      onError: (message) => setError(message),
    })
      .then((stopFn) => {
        // Se a viagem foi encerrada enquanto o watcher subia, para na hora
        if (cancelled) stopFn();
        else stop = stopFn;
      })
      .catch((err) => setError(err.message));

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, plate]);

  return { position, error, requestPermission };
}
