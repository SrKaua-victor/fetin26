import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSetting,
  setSetting,
  seed,
  listRoutes,
  getRoute,
  saveRoute,
  removeRoute,
  listDrivers,
  getDriver,
  findDriverByRegistration,
  createDriver,
  updateDriver,
  deleteDriver,
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  startTrip,
  endTrip,
  getTrip,
  listTrips,
  insertLocation,
  insertLocationBatch,
  bumpTripCounters,
  getTripLocations,
  closeOrphanTrips,
  markStopReached,
  getTripStops,
  setTripStatus,
} from "./db.js";
import {
  verifyPassword,
  hashPassword,
  signToken,
  signAdminToken,
  verifyToken,
  requireDriver,
  requireAdmin,
  initTokenSecret,
} from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Banco ────────────────────────────────────────────────────────────────────
initTokenSecret({ getSetting, setSetting });
seed();

// Viagens que ficaram abertas de uma queda anterior. As paradas há pouco tempo
// sobrevivem de propósito: o motorista pode estar rodando e reconectando agora.
const orphanTrips = closeOrphanTrips();
if (process.env.ADMIN_PASSWORD || !getSetting("admin_password_hash")) {
  setSetting("admin_password_hash", hashPassword(process.env.ADMIN_PASSWORD || "admin123"));
}

const app = express();

// O servidor fica atrás de um túnel, que entrega tudo a partir de 127.0.0.1. Sem
// isto o `req.ip` de todo mundo é o loopback, e o limite de tentativas de login
// passa a ser somado entre todos os usuários — um motorista errando a senha
// bloquearia os outros. Confiamos só no loopback: para forjar X-Forwarded-For
// seria preciso já estar conectando da própria máquina.
app.set("trust proxy", "loopback");

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Log das chamadas de API, desligado por padrão: em viagem sai uma linha por
// posição de GPS. Ligue com LOG_API=1 no .env para descobrir se uma requisição que
// "falhou" no app chegou a alcançar o servidor — sem isso, falha de rede e falha de
// resposta ficam indistinguíveis de quem só vê a mensagem de erro no celular.
if (process.env.LOG_API === "1") {
  app.use("/api", (req, res, next) => {
    const ua = String(req.headers["user-agent"] || "?").slice(0, 70);
    res.on("finish", () => {
      console.log(
        `[api] ${res.statusCode} ${req.method} ${req.originalUrl} ip=${req.ip} xff=${req.headers["x-forwarded-for"] || "-"} origin=${req.headers.origin || "-"} ua="${ua}"`
      );
    });
    next();
  });
  console.log("[api] log de requisições ligado (LOG_API=1)");
}

// ─── Estado em memória (ao vivo) ──────────────────────────────────────────────
const state = {
  routes: new Map(),     // id -> Route
  buses: new Map(),      // id -> Bus (motoristas ativos)
  drivers: new Map(),    // socketId -> { busId, tripId }
};

// Controle de gravação no banco, por viagem
const tripWriters = new Map();      // tripId -> { lastRecordedAt, lastPoint }
const pendingTripCloses = new Map(); // tripId -> timeout (fechamento adiado)

// Se o celular cai da rede, a viagem só é encerrada depois desse tempo —
// assim uma reconexão rápida continua a mesma viagem em vez de abrir outra.
const RECONNECT_GRACE_MS = 90000;

// Ônibus remontado a partir de posição HTTP não tem socket para avisar quando o
// motorista sai do ar, então precisa de uma varredura — senão ficaria parado no
// mapa para sempre.
const ORPHAN_BUS_TIMEOUT_MS = 3 * 60 * 1000;

// Grava no banco no máximo a cada 2s, e só se o ônibus andou 15m —
// mais um "heartbeat" a cada 30s para registrar ônibus parado.
const SAVE_MIN_INTERVAL_MS = 2000;
const SAVE_MIN_METERS = 15;
const SAVE_HEARTBEAT_MS = 30000;

// Raio para considerar que o ônibus chegou na parada. Acima da precisão típica
// do GPS (10 a 20 m) para não perder chegadas, e abaixo do espaçamento entre
// paradas para não marcar a vizinha junto.
const STOP_REACHED_METERS = 50;

/**
 * Ocorrências que o motorista pode informar.
 *
 * Códigos fixos, não texto livre: o rótulo é escolhido por quem exibe, então dá
 * para traduzir ou reescrever sem migrar o banco, e o motorista dirigindo toca
 * um botão em vez de digitar.
 */
const TRIP_STATUS_REASONS = ["traffic", "accident", "breakdown", "boarding", "other"];

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
if (listRoutes().length === 0) saveRoute(exampleRoute);
for (const route of listRoutes()) state.routes.set(route.id, route);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

function validRouteBody(body = {}) {
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120) return false;
  if (body.stops !== undefined && !Array.isArray(body.stops)) return false;
  if (body.path !== undefined && !Array.isArray(body.path)) return false;
  if ((body.stops || []).some((s) => !s || typeof s.name !== "string" || !isValidCoord(Number(s.lat), Number(s.lng)))) return false;
  if ((body.path || []).some((p) => !Array.isArray(p) || !isValidCoord(Number(p[0]), Number(p[1])))) return false;
  return true;
}

const loginAttempts = new Map();
function loginLimited(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return res.status(429).json({ error: "Muitas tentativas. Aguarde um minuto." });
  recent.push(now);
  loginAttempts.set(key, recent);

  // Sem esta limpeza o mapa guardaria uma entrada por IP que já tentou entrar,
  // para sempre. É barato: só roda quando o mapa passa de mil chaves.
  if (loginAttempts.size > 1000) {
    for (const [ip, stamps] of loginAttempts) {
      if (stamps.every((t) => now - t >= 60_000)) loginAttempts.delete(ip);
    }
  }
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "bustrack", time: new Date().toISOString() }));
app.post("/api/admin/login", loginLimited, (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (username !== (process.env.ADMIN_USERNAME || "admin") ||
      !verifyPassword(password, getSetting("admin_password_hash"))) {
    return res.status(401).json({ error: "Usuário ou senha incorretos" });
  }
  res.json({ token: signAdminToken(username), user: { username } });
});

function routeName(routeId) {
  return state.routes.get(routeId)?.name || null;
}

/** O socket.io só manda o callback de ack quando o cliente pede — e ele vem
 *  como último argumento, que pode ser o primeiro se o evento não tiver payload. */
function ackOf(args) {
  const fn = args[args.length - 1];
  return typeof fn === "function" ? fn : () => {};
}

// ─── REST: Rotas ──────────────────────────────────────────────────────────────
app.get("/api/routes", (req, res) => {
  res.json([...state.routes.values()]);
});

app.get("/api/routes/:id", (req, res) => {
  const route = state.routes.get(req.params.id);
  if (!route) return res.status(404).json({ error: "Rota não encontrada" });
  res.json(route);
});

app.post("/api/routes", requireAdmin, (req, res) => {
  if (!validRouteBody(req.body)) return res.status(400).json({ error: "Dados da rota inválidos" });
  const route = {
    id: randomUUID(),
    name: req.body.name || "Nova Rota",
    color: req.body.color || "#3B82F6",
    stops: req.body.stops || [],
    path: req.body.path || [],
    active: req.body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  state.routes.set(route.id, saveRoute(route));
  io.emit("routes:updated", [...state.routes.values()]);
  res.status(201).json(route);
});

app.put("/api/routes/:id", requireAdmin, (req, res) => {
  const route = state.routes.get(req.params.id);
  if (!route) return res.status(404).json({ error: "Rota não encontrada" });
  const updated = { ...route, ...req.body, id: route.id };
  if (!validRouteBody(updated)) return res.status(400).json({ error: "Dados da rota inválidos" });
  state.routes.set(route.id, saveRoute(updated));
  io.emit("routes:updated", [...state.routes.values()]);
  res.json(updated);
});

app.delete("/api/routes/:id", requireAdmin, (req, res) => {
  if (!state.routes.has(req.params.id))
    return res.status(404).json({ error: "Rota não encontrada" });
  state.routes.delete(req.params.id);
  removeRoute(req.params.id);
  io.emit("routes:updated", [...state.routes.values()]);
  res.json({ success: true });
});

// ─── REST: Ônibus ao vivo ─────────────────────────────────────────────────────
app.get("/api/buses", (req, res) => {
  res.json([...state.buses.values()]);
});

// ─── REST: Login do motorista ─────────────────────────────────────────────────
app.post("/api/driver/login", loginLimited, (req, res) => {
  const { registration, password } = req.body || {};
  if (!registration || !password) {
    return res.status(400).json({ error: "Informe matrícula e senha" });
  }

  const row = findDriverByRegistration(registration);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: "Matrícula ou senha incorreta" });
  }
  if (!row.active) {
    return res.status(403).json({ error: "Motorista inativo. Procure a administração." });
  }

  const driver = { id: row.id, name: row.name, registration: row.registration };
  res.json({
    token: signToken({ driverId: row.id, name: row.name, registration: row.registration }),
    driver,
  });
});

app.get("/api/driver/me", requireDriver, (req, res) => {
  const driver = getDriver(req.driver.sub);
  if (!driver || !driver.active) {
    return res.status(401).json({ error: "Motorista não encontrado ou inativo" });
  }
  res.json(driver);
});

// ─── REST: Posições em segundo plano ──────────────────────────────────────────
// O app Android usa esta rota quando está em segundo plano: depois de ~5 min o
// Android estrangula as requisições feitas de dentro da WebView, então o envio
// passa a sair pelo HTTP nativo em vez do socket.
app.post("/api/driver/locations", requireDriver, (req, res) => {
  const { tripId, points } = req.body || {};

  const trip = getTrip(tripId);
  if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
  if (trip.driverId && trip.driverId !== req.driver.sub) {
    return res.status(403).json({ error: "Esta viagem é de outro motorista" });
  }
  if (trip.endedAt) return res.status(409).json({ error: "Viagem já encerrada" });

  const valid = (Array.isArray(points) ? points : [])
    .filter((p) => isValidCoord(Number(p?.lat), Number(p?.lng)))
    .slice(0, 1000);
  if (valid.length === 0) return res.status(400).json({ error: "Nenhuma posição válida" });

  const saved = persistPoints(tripId, valid);

  // Mantém o ônibus se mexendo no mapa do passageiro e do admin
  const last = valid[valid.length - 1];
  let bus = [...state.buses.values()].find((b) => b.tripId === tripId);

  // Em segundo plano o app manda posição por HTTP, sem passar pelo socket. Se o
  // backend reiniciou no meio do percurso, o ônibus sumiu do estado em memória —
  // e sem remontá-lo aqui as posições seguiriam sendo gravadas no banco enquanto o
  // ônibus ficaria invisível no mapa, com o motorista rodando normalmente, até o
  // app reconectar o socket.
  if (!bus) {
    const vehicle = trip.vehicleId ? getVehicle(trip.vehicleId) : null;
    bus = {
      id: trip.vehicleId || tripId,
      driverId: trip.driverId ?? null,
      driverName: trip.driverName || "Motorista",
      vehicleId: trip.vehicleId ?? null,
      plate: trip.plate ?? null,
      model: vehicle?.model ?? null,
      capacity: vehicle?.capacity ?? null,
      tripId,
      routeId: trip.routeId ?? null,
      socketId: null,
      lat: null,
      lng: null,
      speed: 0,
      heading: 0,
      lastUpdate: new Date().toISOString(),
      online: true,
      startedAt: trip.startedAt,
      reachedStops: getTripStops(trip.id),
      status: trip.status,
    };
    state.buses.set(bus.id, bus);
    io.emit("buses:updated", [...state.buses.values()]);
    console.log(
      `[driver] ${bus.driverName}${bus.plate ? ` (${bus.plate})` : ""} voltou ao mapa — viagem ${tripId} remontada a partir do banco`
    );
  }

  const updated = {
    ...bus,
    lat: last.lat,
    lng: last.lng,
    speed: last.speed || 0,
    heading: last.heading || 0,
    lastUpdate: new Date().toISOString(),
    online: true,
  };
  state.buses.set(bus.id, updated);
  io.emit("bus:moved", {
    busId: bus.id,
    routeId: bus.routeId,
    plate: bus.plate,
    lat: updated.lat,
    lng: updated.lng,
    speed: updated.speed,
    heading: updated.heading,
    lastUpdate: updated.lastUpdate,
  });

  // Checa contra o lote inteiro, não só a última posição: em segundo plano o app
  // acumula e envia de dez em dez segundos, então uma parada pode estar no meio
  // do lote e nunca ser a posição mais recente.
  handleStopArrivals(updated, valid);

  // Chegou posição por HTTP: o motorista está em viagem, então não encerra por inatividade
  const pendingClose = pendingTripCloses.get(tripId);
  if (pendingClose) {
    clearTimeout(pendingClose);
    pendingTripCloses.delete(tripId);
  }

  res.json({ ok: true, received: valid.length, saved });
});

// ─── REST: Veículos (placas) ──────────────────────────────────────────────────
app.get("/api/vehicles", (req, res) => {
  res.json(listVehicles({ activeOnly: req.query.active === "1" }));
});

app.post("/api/vehicles", requireAdmin, (req, res) => {
  if (!req.body?.plate) return res.status(400).json({ error: "Placa é obrigatória" });
  if (!Number.isInteger(Number(req.body.capacity ?? 40)) || Number(req.body.capacity ?? 40) < 1 || Number(req.body.capacity ?? 40) > 200)
    return res.status(400).json({ error: "Capacidade deve estar entre 1 e 200" });
  try {
    res.status(201).json(createVehicle(req.body));
  } catch (err) {
    const duplicate = String(err.message).includes("UNIQUE");
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? "Já existe um veículo com essa placa" : err.message,
    });
  }
});

app.put("/api/vehicles/:id", requireAdmin, (req, res) => {
  try {
    const vehicle = updateVehicle(req.params.id, req.body || {});
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado" });
    res.json(vehicle);
  } catch (err) {
    const duplicate = String(err.message).includes("UNIQUE");
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? "Já existe um veículo com essa placa" : err.message,
    });
  }
});

app.delete("/api/vehicles/:id", requireAdmin, (req, res) => {
  if (!deleteVehicle(req.params.id))
    return res.status(404).json({ error: "Veículo não encontrado" });
  res.json({ success: true });
});

// ─── REST: Motoristas (cadastro pelo admin) ───────────────────────────────────
app.get("/api/drivers", requireAdmin, (req, res) => {
  res.json(listDrivers());
});

app.post("/api/drivers", requireAdmin, (req, res) => {
  const { name, registration, password } = req.body || {};
  if (!name || !registration || !password) {
    return res.status(400).json({ error: "Informe nome, matrícula e senha" });
  }
  if (String(password).length < 6) return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres" });
  try {
    res.status(201).json(createDriver(req.body));
  } catch (err) {
    const duplicate = String(err.message).includes("UNIQUE");
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? "Já existe um motorista com essa matrícula" : err.message,
    });
  }
});

app.put("/api/drivers/:id", requireAdmin, (req, res) => {
  try {
    const driver = updateDriver(req.params.id, req.body || {});
    if (!driver) return res.status(404).json({ error: "Motorista não encontrado" });
    res.json(driver);
  } catch (err) {
    const duplicate = String(err.message).includes("UNIQUE");
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? "Já existe um motorista com essa matrícula" : err.message,
    });
  }
});

app.delete("/api/drivers/:id", requireAdmin, (req, res) => {
  if (!deleteDriver(req.params.id))
    return res.status(404).json({ error: "Motorista não encontrado" });
  res.json({ success: true });
});

// ─── REST: Histórico de viagens ───────────────────────────────────────────────
app.get("/api/trips", requireAdmin, (req, res) => {
  res.json(
    listTrips({
      limit: req.query.limit,
      driverId: req.query.driverId,
      vehicleId: req.query.vehicleId,
      routeId: req.query.routeId,
    })
  );
});

app.get("/api/trips/:id", requireAdmin, (req, res) => {
  const trip = getTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });
  res.json(trip);
});

app.get("/api/trips/:id/locations", requireAdmin, (req, res) => {
  if (!getTrip(req.params.id)) return res.status(404).json({ error: "Viagem não encontrada" });
  res.json(getTripLocations(req.params.id, { limit: req.query.limit }));
});

// ─── Frontends (builds de produção, quando existem) ───────────────────────────
// Servir os três pelo próprio backend deixa tudo atrás de um endereço só: o túnel
// expõe apenas a 3001 e os apps falam em same-origin — sem CORS e sem endereço
// embutido no build, então trocar a URL do servidor não obriga a recompilar nada.
const webRoot = join(__dirname, "..", "..");
const webApps = [
  { name: "Site do passageiro", mount: "/",       dir: join(webRoot, "frontend-user", "dist") },
  { name: "Painel admin",       mount: "/admin",  dir: join(webRoot, "frontend-admin", "dist") },
  { name: "App do motorista",   mount: "/motorista", dir: join(webRoot, "frontend-driver", "dist") },
];

// Download do APK: o motorista abre este endereço no celular e instala direto,
// sem cabo nem Play Store. Só aparece quando existe um build gerado.
const apkPath = join(
  webRoot, "frontend-driver", "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"
);
app.get("/bustrack.apk", (_req, res) => {
  if (!existsSync(apkPath)) {
    return res.status(404).json({ error: "APK ainda não foi gerado" });
  }
  res.download(apkPath, "bustrack-motorista.apk");
});

// Endereço antigo, de quando as páginas usavam nomes em inglês. As rotas de API
// (/api/driver/...) continuam como estão — mudá-las quebraria os APKs instalados.
app.get(["/driver", "/driver/*"], (req, res) =>
  res.redirect(302, `/motorista${req.path.slice("/driver".length)}`)
);

// As sub-rotas vêm primeiro: montar "/" antes engoliria /admin e /motorista
const served = [];
for (const { name, mount, dir } of webApps) {
  if (mount === "/" || !existsSync(dir)) continue;
  app.use(mount, express.static(dir));
  app.get(`${mount}/*`, (_req, res) => res.sendFile(join(dir, "index.html")));
  served.push(`${name} → ${mount}`);
}

const userDist = webApps[0].dir;
if (existsSync(userDist)) {
  app.use(express.static(userDist));
  // Fallback do SPA. /api fica de fora para responder 404 de verdade em vez de HTML.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(join(userDist, "index.html"));
  });
  served.unshift(`${webApps[0].name} → /`);
} else if (existsSync(webApps[2].dir)) {
  app.get("/", (_req, res) => res.redirect("/motorista"));
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] conectado: ${socket.id}`);

  socket.emit("init", {
    routes: [...state.routes.values()],
    buses: [...state.buses.values()],
  });

  // Motorista entra em serviço.
  // App real: { token, vehicleId, routeId, tripId? }
  // Simulador legado: { driverName, routeId }
  socket.on("driver:register", (...args) => {
    const reply = ackOf(args);
    const payload = typeof args[0] === "object" && args[0] !== null ? args[0] : {};
    const { token, vehicleId, routeId, busId, tripId: resumeTripId } = payload;

    let driverId = null;
    let driverName = payload.driverName || "Motorista";

    if (token) {
      const session = verifyToken(token);
      if (!session) {
        reply({ ok: false, error: "Sessão expirada. Faça login novamente." });
        return;
      }
      const driver = getDriver(session.sub);
      if (!driver || !driver.active) {
        reply({ ok: false, error: "Motorista não encontrado ou inativo" });
        return;
      }
      driverId = driver.id;
      driverName = driver.name;
    } else if (process.env.ALLOW_LEGACY_SIMULATOR === "1") {
      driverName = payload.driverName || "Simulador";
    } else {
      reply({ ok: false, error: "Autenticação obrigatória" });
      return;
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = getVehicle(vehicleId);
      if (!vehicle) {
        reply({ ok: false, error: "Veículo não encontrado" });
        return;
      }
      if (!vehicle.active) {
        reply({ ok: false, error: `O veículo ${vehicle.plate} está inativo` });
        return;
      }
      // Impede dois motoristas no mesmo ônibus ao mesmo tempo
      const inUse = [...state.buses.values()].find(
        (b) => b.vehicleId === vehicle.id && b.online && b.socketId !== socket.id
      );
      if (inUse) {
        reply({
          ok: false,
          error: `O veículo ${vehicle.plate} já está em uso por ${inUse.driverName}`,
        });
        return;
      }
    }

    // Retoma a viagem quando o app reconecta; senão abre uma nova no banco
    let trip = resumeTripId ? getTrip(resumeTripId) : null;
    if (trip && trip.driverId !== driverId) {
      reply({ ok: false, error: "Esta viagem pertence a outro motorista" });
      return;
    }
    if (trip && trip.endedAt) trip = null;
    if (trip) {
      const pending = pendingTripCloses.get(trip.id);
      if (pending) {
        clearTimeout(pending);
        pendingTripCloses.delete(trip.id);
      }
      console.log(`[driver] viagem ${trip.id} retomada após reconexão`);
    }
    if (!trip) {
      trip = startTrip({
        driverId,
        driverName,
        vehicleId: vehicle?.id ?? null,
        plate: vehicle?.plate ?? null,
        routeId: routeId ?? null,
        routeName: routeName(routeId),
      });
    }

    const bus = {
      id: busId || vehicle?.id || randomUUID(),
      driverId,
      driverName,
      vehicleId: vehicle?.id ?? null,
      plate: vehicle?.plate ?? null,
      model: vehicle?.model ?? null,
      capacity: vehicle?.capacity ?? null,
      tripId: trip.id,
      routeId,
      socketId: socket.id,
      lat: null,
      lng: null,
      speed: 0,
      heading: 0,
      lastUpdate: null,
      online: true,
      startedAt: trip.startedAt,
      reachedStops: getTripStops(trip.id),
      status: trip.status,
    };
    state.buses.set(bus.id, bus);
    state.drivers.set(socket.id, { busId: bus.id, tripId: trip.id });
    // Retomada de viagem mantém o writer, para o throttle não gravar um ponto duplicado
    if (!tripWriters.has(trip.id)) {
      tripWriters.set(trip.id, { lastRecordedAt: 0, lastPoint: null });
    }

    io.emit("buses:updated", [...state.buses.values()]);
    reply({ ok: true, bus, tripId: trip.id });
    console.log(
      `[driver] ${driverName}${vehicle ? ` (${vehicle.plate})` : ""} entrou em serviço — viagem ${trip.id}`
    );
  });

  // Posição do motorista: sempre transmite ao vivo, grava no banco com throttle
  socket.on("driver:location", ({ lat, lng, speed, heading, accuracy, recordedAt } = {}) => {
    const driverInfo = state.drivers.get(socket.id);
    if (!driverInfo) return;

    const bus = state.buses.get(driverInfo.busId);
    if (!bus) return;
    if (!isValidCoord(Number(lat), Number(lng))) return;

    const updated = {
      ...bus,
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      accuracy: accuracy ?? null,
      lastUpdate: new Date().toISOString(),
    };
    state.buses.set(bus.id, updated);

    io.emit("bus:moved", {
      busId: bus.id,
      routeId: bus.routeId,
      plate: bus.plate,
      lat,
      lng,
      speed: updated.speed,
      heading: updated.heading,
      lastUpdate: updated.lastUpdate,
    });

    const point = {
      lat,
      lng,
      speed,
      heading,
      accuracy,
      recordedAt: recordedAt || updated.lastUpdate,
    };
    persistPoints(driverInfo.tripId, [point]);
    handleStopArrivals(updated, [point]);
  });

  // Buffer descarregado pelo app depois de ficar sem internet
  socket.on("driver:location:batch", (...args) => {
    const reply = ackOf(args);
    const points = Array.isArray(args[0]) ? args[0] : [];
    const driverInfo = state.drivers.get(socket.id);
    if (!driverInfo || points.length === 0) {
      reply({ ok: false, saved: 0 });
      return;
    }

    const valid = points
      .filter((p) => isValidCoord(Number(p?.lat), Number(p?.lng)))
      .slice(0, 1000);
    if (valid.length === 0) {
      reply({ ok: false, saved: 0 });
      return;
    }

    const saved = persistPoints(driverInfo.tripId, valid);

    // O buffer vem de um período sem rede: as paradas atingidas nesse intervalo
    // só são descobertas agora.
    const bus = state.buses.get(driverInfo.busId);
    if (bus) handleStopArrivals(bus, valid);

    reply({ ok: true, saved: valid.length });
    console.log(
      `[driver] buffer de ${valid.length} posições recebido (${saved} gravadas) na viagem ${driverInfo.tripId}`
    );
  });

  // Motorista informa (ou desfaz) uma ocorrência: trânsito, pane, embarque longo.
  // Chega ao passageiro na hora, junto com o horário em que começou.
  socket.on("driver:status", (...args) => {
    const reply = ackOf(args);
    const payload = typeof args[0] === "object" && args[0] !== null ? args[0] : {};
    const reason = payload.reason ?? null;

    if (reason !== null && !TRIP_STATUS_REASONS.includes(reason)) {
      reply({ ok: false, error: "Ocorrência desconhecida" });
      return;
    }

    const driverInfo = state.drivers.get(socket.id);
    if (!driverInfo?.tripId) {
      reply({ ok: false, error: "Nenhuma viagem em andamento" });
      return;
    }

    const trip = setTripStatus(driverInfo.tripId, reason);
    if (!trip) {
      reply({ ok: false, error: "Viagem não encontrada" });
      return;
    }

    const bus = state.buses.get(driverInfo.busId);
    if (bus) {
      state.buses.set(bus.id, { ...bus, status: trip.status });
      io.emit("bus:status", { busId: bus.id, tripId: trip.id, status: trip.status });
    }

    reply({ ok: true, status: trip.status });
    console.log(
      `[ocorrência] ${bus?.plate || "viagem " + trip.id.slice(0, 8)}: ${reason || "normalizado"}`
    );
  });

  // Motorista encerra a viagem pelo app
  socket.on("driver:stop", (...args) => {
    finishDriver(socket.id, { graceful: true });
    ackOf(args)({ ok: true });
  });

  socket.on("disconnect", () => {
    finishDriver(socket.id, { graceful: false });
    console.log(`[socket] desconectado: ${socket.id}`);
  });
});

/**
 * Marca as paradas por onde o ônibus passou.
 *
 * Roda para toda posição recebida, de propósito — fora do throttle de gravação.
 * O throttle descarta posições próximas entre si, e é justamente parado na
 * parada que o ônibus gera posições assim: filtrar antes de checar faria perder
 * chegadas curtas.
 *
 * Devolve as paradas registradas agora (só as inéditas), para quem chama avisar
 * os clientes uma única vez.
 */
function registerStopArrivals(bus, points) {
  const route = bus?.routeId ? state.routes.get(bus.routeId) : null;
  if (!route?.stops?.length || !bus.tripId) return [];

  // O que já foi registrado, para nem tentar de novo. Sem isto o laço faria uma
  // escrita por posição e por parada: um lote acumulado offline (até 1000
  // posições) numa linha de 12 paradas dispararia 12 mil INSERTs, todos
  // descartados pela chave composta. A lista em memória basta — a chave continua
  // garantindo a unicidade se ela estiver desatualizada.
  const already = new Set((bus.reachedStops || getTripStops(bus.tripId)).map((s) => s.stopId));

  const reached = [];
  for (const point of points) {
    for (const stop of route.stops) {
      if (already.has(stop.id)) continue;

      const meters = distanceMeters(point, { lat: stop.lat, lng: stop.lng });
      if (meters > STOP_REACHED_METERS) continue;

      const at = point.recordedAt || new Date().toISOString();
      if (markStopReached(bus.tripId, stop, at)) {
        already.add(stop.id);
        reached.push({ stopId: stop.id, stopName: stop.name, reachedAt: at });
        console.log(`[parada] ${bus.plate || bus.driverName} chegou em "${stop.name}"`);
      }
    }
  }
  return reached;
}

/**
 * Roda a detecção e, havendo novidade, avisa os clientes e atualiza o ônibus em
 * memória para quem entrar depois já receber a lista completa.
 */
function handleStopArrivals(bus, points) {
  const reached = registerStopArrivals(bus, points);
  if (reached.length === 0) return;

  const current = state.buses.get(bus.id);
  if (current) {
    state.buses.set(bus.id, {
      ...current,
      reachedStops: getTripStops(bus.tripId),
    });
  }

  for (const stop of reached) {
    io.emit("bus:stop-reached", { busId: bus.id, tripId: bus.tripId, ...stop });
  }
}

/**
 * Grava posições no banco respeitando o throttle e acumulando a distância.
 *
 * O filtro usa o horário de cada leitura (`recordedAt`), não o relógio do servidor:
 * um lote de 10 posições coletadas ao longo de 10 s chega tudo de uma vez quando o
 * app está em segundo plano, e pelo relógio do servidor quase tudo seria descartado.
 */
function persistPoints(tripId, points) {
  let writer = tripWriters.get(tripId);
  if (!writer) {
    writer = { lastRecordedAt: 0, lastPoint: null };
    tripWriters.set(tripId, writer);
  }

  const keep = [];
  let distance = 0;

  for (const point of points) {
    const requestedStamp = new Date(point.recordedAt || 0).getTime();
    const now = Date.now();
    const stamp = Number.isFinite(requestedStamp) && Math.abs(requestedStamp - now) < 300_000 ? requestedStamp : now;
    const recordedAt = new Date(stamp).toISOString();
    const elapsed = stamp - writer.lastRecordedAt;
    const moved = writer.lastPoint ? distanceMeters(writer.lastPoint, point) : Infinity;

    const shouldSave =
      !writer.lastPoint ||
      elapsed >= SAVE_HEARTBEAT_MS ||
      (elapsed >= SAVE_MIN_INTERVAL_MS && moved >= SAVE_MIN_METERS);

    if (!shouldSave) continue;

    keep.push({ ...point, recordedAt });
    if (Number.isFinite(moved) && moved < 2000) distance += moved;
    writer.lastRecordedAt = stamp;
    writer.lastPoint = { lat: point.lat, lng: point.lng };
  }

  if (keep.length === 0) return 0;

  if (keep.length === 1) insertLocation(tripId, keep[0]);
  else insertLocationBatch(tripId, keep);

  bumpTripCounters(tripId, { points: keep.length, distanceM: distance });
  return keep.length;
}

/**
 * Encerra o turno do motorista.
 * `graceful: false` (queda de conexão) adia o fechamento da viagem, dando chance de reconectar.
 * `graceful: true` (botão "Encerrar viagem") fecha na hora.
 */
function finishDriver(socketId, { graceful }) {
  const driverInfo = state.drivers.get(socketId);
  if (!driverInfo) return;
  state.drivers.delete(socketId);

  const bus = state.buses.get(driverInfo.busId);
  if (bus && bus.socketId === socketId) {
    if (graceful) {
      state.buses.delete(bus.id);
    } else {
      state.buses.set(bus.id, { ...bus, online: false });
    }
    io.emit("buses:updated", [...state.buses.values()]);
  }

  const { tripId } = driverInfo;
  if (!tripId) return;

  if (graceful) {
    endTrip(tripId);
    tripWriters.delete(tripId);
    pendingTripCloses.delete(tripId);
    return;
  }

  // Queda de conexão: espera a reconexão antes de fechar a viagem
  clearTimeout(pendingTripCloses.get(tripId));
  pendingTripCloses.set(
    tripId,
    setTimeout(() => {
      endTrip(tripId);
      tripWriters.delete(tripId);
      pendingTripCloses.delete(tripId);
      // Remove o ônibus offline que ficou no mapa
      const stale = state.buses.get(driverInfo.busId);
      if (stale && !stale.online) {
        state.buses.delete(stale.id);
        io.emit("buses:updated", [...state.buses.values()]);
      }
      console.log(`[driver] viagem ${tripId} encerrada por inatividade`);
    }, RECONNECT_GRACE_MS)
  );
}

// Tira do mapa os ônibus sem socket que pararam de mandar posição. Quem tem socket
// já é tratado no `disconnect`, então não entra na varredura.
setInterval(() => {
  const cutoff = Date.now() - ORPHAN_BUS_TIMEOUT_MS;
  let changed = false;

  for (const [id, bus] of state.buses) {
    if (bus.socketId) continue;
    const seenAt = bus.lastUpdate ? new Date(bus.lastUpdate).getTime() : 0;
    if (seenAt >= cutoff) continue;

    state.buses.delete(id);
    changed = true;
    console.log(`[driver] ônibus ${bus.plate || id} saiu do mapa: sem posição há mais de 3 min`);
  }

  if (changed) io.emit("buses:updated", [...state.buses.values()]);
}, 60_000).unref();

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚌 BusTrack backend rodando em http://localhost:${PORT}`);
  for (const line of served) console.log(`   ${line}`);
  if (orphanTrips) {
    console.log(`   ${orphanTrips} viagem(ns) abandonada(s) fechada(s) na inicialização`);
  }
  if (served.length < 3) {
    console.log("   (rode `npm run build:all` na raiz para servir os três frontends)");
  }
});
