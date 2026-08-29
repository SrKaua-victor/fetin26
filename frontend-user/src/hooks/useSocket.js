import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || undefined;

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("init", ({ routes, buses }) => {
      setRoutes(routes);
      setBuses(buses);
    });

    socket.on("routes:updated", (routes) => setRoutes(routes));
    socket.on("buses:updated", (buses) => setBuses(buses));

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

    // O servidor avisa uma vez por parada alcançada. Acumulamos aqui em vez de
    // recarregar a lista de ônibus: só muda o que precisa mudar, e a timeline
    // atualiza no instante da chegada.
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

  return { connected, routes, buses };
}
