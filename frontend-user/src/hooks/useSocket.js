import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

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

    return () => socket.disconnect();
  }, []);

  return { connected, routes, buses };
}
