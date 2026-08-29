import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useAdminSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [buses, setBuses] = useState([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SERVER_URL || undefined, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("init", ({ buses }) => setBuses(buses));
    socket.on("buses:updated", setBuses);
    socket.on("bus:moved", ({ busId, lat, lng, speed, heading, lastUpdate }) => {
      setBuses((prev) =>
        prev.map((b) =>
          b.id === busId ? { ...b, lat, lng, speed, heading, lastUpdate } : b
        )
      );
    });

    // Ocorrência informada pelo motorista (trânsito, pane…), ou null ao normalizar
    socket.on("bus:status", ({ busId, status }) => {
      setBuses((prev) => prev.map((b) => (b.id === busId ? { ...b, status } : b)));
    });

    // Chegada em parada, avisada uma vez por parada. Acumula na lista do ônibus
    // em vez de recarregar tudo — só muda o que precisa mudar.
    socket.on("bus:stop-reached", ({ busId, stopId, stopName, reachedAt }) => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b.id !== busId) return b;
          const already = b.reachedStops || [];
          if (already.some((s) => s.stopId === stopId)) return b;
          return { ...b, reachedStops: [...already, { stopId, stopName, reachedAt }] };
        })
      );
    });

    return () => socket.disconnect();
  }, []);

  return { connected, buses };
}
