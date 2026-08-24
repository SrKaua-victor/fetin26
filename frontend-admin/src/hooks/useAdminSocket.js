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

    return () => socket.disconnect();
  }, []);

  return { connected, buses };
}
