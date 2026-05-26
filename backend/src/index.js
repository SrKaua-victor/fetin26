import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

// ─── Estado em memória ────────────────────────────────────────────────────────
const state = {
  routes: new Map(),     // id -> Route
  buses: new Map(),      // id -> Bus (motoristas ativos)
  drivers: new Map(),    // socketId -> driverInfo
};

// ─── Dados iniciais de exemplo ────────────────────────────────────────────────
const exampleRoute = {
  id: "route-1",
  name: "Linha 01 - Centro / Terminal",
  color: "#FF6B35",
  stops: [
    { id: "s1", name: "Terminal Central", lat: -22.8535, lng: -45.3860, order: 0 },
    { id: "s2", name: "Praça da República", lat: -22.8490, lng: -45.3820, order: 1 },
    { id: "s3", name: "Hospital Municipal", lat: -22.8450, lng: -45.3780, order: 2 },
    { id: "s4", name: "Escola Estadual", lat: -22.8410, lng: -45.3740, order: 3 },
    { id: "s5", name: "Shopping Center", lat: -22.8370, lng: -45.3700, order: 4 },
    { id: "s6", name: "Parque Industrial", lat: -22.8330, lng: -45.3660, order: 5 },
  ],
  path: [
    [-22.8535, -45.3860],
    [-22.8510, -45.3840],
    [-22.8490, -45.3820],
    [-22.8470, -45.3800],
    [-22.8450, -45.3780],
    [-22.8430, -45.3760],
    [-22.8410, -45.3740],
    [-22.8390, -45.3720],
    [-22.8370, -45.3700],
    [-22.8350, -45.3680],
    [-22.8330, -45.3660],
  ],
  active: true,
  createdAt: new Date().toISOString(),
};
state.routes.set(exampleRoute.id, exampleRoute);

// ─── REST API ─────────────────────────────────────────────────────────────────

// Rotas
app.get("/api/routes", (req, res) => {
  res.json([...state.routes.values()]);
});

app.get("/api/routes/:id", (req, res) => {
  const route = state.routes.get(req.params.id);
  if (!route) return res.status(404).json({ error: "Rota não encontrada" });
  res.json(route);
});

app.post("/api/routes", (req, res) => {
  const route = {
    id: uuidv4(),
    name: req.body.name || "Nova Rota",
    color: req.body.color || "#3B82F6",
    stops: req.body.stops || [],
    path: req.body.path || [],
    active: req.body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  state.routes.set(route.id, route);
  io.emit("routes:updated", [...state.routes.values()]);
  res.status(201).json(route);
});

app.put("/api/routes/:id", (req, res) => {
  const route = state.routes.get(req.params.id);
  if (!route) return res.status(404).json({ error: "Rota não encontrada" });
  const updated = { ...route, ...req.body, id: route.id };
  state.routes.set(route.id, updated);
  io.emit("routes:updated", [...state.routes.values()]);
  res.json(updated);
});

app.delete("/api/routes/:id", (req, res) => {
  if (!state.routes.has(req.params.id))
    return res.status(404).json({ error: "Rota não encontrada" });
  state.routes.delete(req.params.id);
  io.emit("routes:updated", [...state.routes.values()]);
  res.json({ success: true });
});

// Ônibus ativos
app.get("/api/buses", (req, res) => {
  res.json([...state.buses.values()]);
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] conectado: ${socket.id}`);

  // Envia estado inicial
  socket.emit("init", {
    routes: [...state.routes.values()],
    buses: [...state.buses.values()],
  });

  // Motorista se registra
  socket.on("driver:register", ({ driverName, routeId, busId }) => {
    const bus = {
      id: busId || uuidv4(),
      driverName: driverName || "Motorista",
      routeId,
      socketId: socket.id,
      lat: null,
      lng: null,
      speed: 0,
      heading: 0,
      lastUpdate: null,
      online: true,
    };
    state.buses.set(bus.id, bus);
    state.drivers.set(socket.id, { busId: bus.id });
    socket.busId = bus.id;

    io.emit("buses:updated", [...state.buses.values()]);
    console.log(`[driver] ${driverName} registrado na rota ${routeId}`);
  });

  // Atualização de posição do motorista
  socket.on("driver:location", ({ lat, lng, speed, heading }) => {
    const driverInfo = state.drivers.get(socket.id);
    if (!driverInfo) return;

    const bus = state.buses.get(driverInfo.busId);
    if (!bus) return;

    const updated = {
      ...bus,
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      lastUpdate: new Date().toISOString(),
    };
    state.buses.set(bus.id, updated);

    // Broadcast para todos os clientes
    io.emit("bus:moved", {
      busId: bus.id,
      routeId: bus.routeId,
      lat,
      lng,
      speed: updated.speed,
      heading: updated.heading,
      lastUpdate: updated.lastUpdate,
    });
  });

  // Desconexão
  socket.on("disconnect", () => {
    const driverInfo = state.drivers.get(socket.id);
    if (driverInfo) {
      const bus = state.buses.get(driverInfo.busId);
      if (bus) {
        const updated = { ...bus, online: false };
        state.buses.set(bus.id, updated);
        io.emit("buses:updated", [...state.buses.values()]);
      }
      state.drivers.delete(socket.id);
    }
    console.log(`[socket] desconectado: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚌 BusTrack backend rodando em http://localhost:${PORT}`);
});
