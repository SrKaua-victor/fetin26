import { useEffect, useRef, useState } from "react";

/**
 * Mantém a tela do celular acesa durante a viagem — sem isso o navegador
 * suspende o GPS quando o aparelho bloqueia.
 */
export function useWakeLock(active) {
  const lockRef = useRef(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquire() {
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lockRef.current.release();
          return;
        }
        setHeld(true);
        lockRef.current.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    }

    // O bloqueio cai quando o app vai para segundo plano; recupera ao voltar
    function onVisibility() {
      if (document.visibilityState === "visible" && !lockRef.current?.released) acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      setHeld(false);
    };
  }, [active]);

  return held;
}
