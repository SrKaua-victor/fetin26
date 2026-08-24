// Camada de persistência (SQLite via módulo nativo do Node — sem dependências extras).
// Requer Node >= 22.5. O arquivo do banco fica em backend/data/bustrack.db
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { hashPassword } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "bustrack.db");

mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    registration  TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone         TEXT,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id         TEXT PRIMARY KEY,
    plate      TEXT NOT NULL UNIQUE,
    model      TEXT,
    capacity   INTEGER NOT NULL DEFAULT 40,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routes (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL,
    stops_json TEXT NOT NULL DEFAULT '[]',
    path_json  TEXT NOT NULL DEFAULT '[]',
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id          TEXT PRIMARY KEY,
    driver_id   TEXT,
    driver_name TEXT NOT NULL,
    vehicle_id  TEXT,
    plate       TEXT,
    route_id    TEXT,
    route_name  TEXT,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    points      INTEGER NOT NULL DEFAULT 0,
    distance_m  REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id     TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    speed       REAL,
    heading     REAL,
    accuracy    REAL,
    recorded_at TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_locations_trip    ON locations(trip_id, id);
  CREATE INDEX IF NOT EXISTS idx_trips_started     ON trips(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_trips_open        ON trips(ended_at);
`);

function mapRoute(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, color: row.color,
    stops: JSON.parse(row.stops_json), path: JSON.parse(row.path_json),
    active: !!row.active, createdAt: row.created_at };
}

export function listRoutes() {
  return db.prepare("SELECT * FROM routes ORDER BY name").all().map(mapRoute);
}
export function getRoute(id) {
  return mapRoute(db.prepare("SELECT * FROM routes WHERE id = ?").get(id));
}
export function saveRoute(route) {
  db.prepare(`INSERT INTO routes (id,name,color,stops_json,path_json,active,created_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,
    stops_json=excluded.stops_json,path_json=excluded.path_json,active=excluded.active`).run(
      route.id, route.name, route.color, JSON.stringify(route.stops), JSON.stringify(route.path),
      route.active ? 1 : 0, route.createdAt);
  return getRoute(route.id);
}
export function removeRoute(id) {
  return db.prepare("DELETE FROM routes WHERE id = ?").run(id).changes > 0;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function getSetting(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
}

export function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

// ─── Mapeadores (SQLite guarda boolean como 0/1) ──────────────────────────────
function mapDriver(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    registration: row.registration,
    phone: row.phone,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

function mapVehicle(row) {
  if (!row) return null;
  return {
    id: row.id,
    plate: row.plate,
    model: row.model,
    capacity: row.capacity,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

function mapTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    vehicleId: row.vehicle_id,
    plate: row.plate,
    routeId: row.route_id,
    routeName: row.route_name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    points: row.points,
    distanceM: row.distance_m,
  };
}

// ─── Motoristas ───────────────────────────────────────────────────────────────
export function listDrivers() {
  return db.prepare("SELECT * FROM drivers ORDER BY name").all().map(mapDriver);
}

export function getDriver(id) {
  return mapDriver(db.prepare("SELECT * FROM drivers WHERE id = ?").get(id));
}

/** Retorna a linha crua, com password_hash — usado só no login. */
export function findDriverByRegistration(registration) {
  return db
    .prepare("SELECT * FROM drivers WHERE registration = ? COLLATE NOCASE")
    .get(String(registration).trim());
}

export function createDriver({ name, registration, password, phone, active = true }) {
  const driver = {
    id: randomUUID(),
    name: String(name).trim(),
    registration: String(registration).trim(),
    password_hash: hashPassword(password),
    phone: phone ? String(phone).trim() : null,
    active: active ? 1 : 0,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO drivers (id, name, registration, password_hash, phone, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    driver.id,
    driver.name,
    driver.registration,
    driver.password_hash,
    driver.phone,
    driver.active,
    driver.created_at
  );
  return getDriver(driver.id);
}

export function updateDriver(id, patch) {
  const current = db.prepare("SELECT * FROM drivers WHERE id = ?").get(id);
  if (!current) return null;

  const next = {
    name: patch.name !== undefined ? String(patch.name).trim() : current.name,
    registration:
      patch.registration !== undefined
        ? String(patch.registration).trim()
        : current.registration,
    password_hash: patch.password ? hashPassword(patch.password) : current.password_hash,
    phone: patch.phone !== undefined ? (patch.phone ? String(patch.phone).trim() : null) : current.phone,
    active: patch.active !== undefined ? (patch.active ? 1 : 0) : current.active,
  };

  db.prepare(
    `UPDATE drivers SET name = ?, registration = ?, password_hash = ?, phone = ?, active = ?
     WHERE id = ?`
  ).run(next.name, next.registration, next.password_hash, next.phone, next.active, id);

  return getDriver(id);
}

export function deleteDriver(id) {
  return db.prepare("DELETE FROM drivers WHERE id = ?").run(id).changes > 0;
}

// ─── Veículos (placas) ────────────────────────────────────────────────────────
export function listVehicles({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? "SELECT * FROM vehicles WHERE active = 1 ORDER BY plate"
    : "SELECT * FROM vehicles ORDER BY plate";
  return db.prepare(sql).all().map(mapVehicle);
}

export function getVehicle(id) {
  return mapVehicle(db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id));
}

export function createVehicle({ plate, model, capacity = 40, active = true }) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO vehicles (id, plate, model, capacity, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(plate).trim().toUpperCase(),
    model ? String(model).trim() : null,
    Number(capacity) || 40,
    active ? 1 : 0,
    new Date().toISOString()
  );
  return getVehicle(id);
}

export function updateVehicle(id, patch) {
  const current = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  if (!current) return null;

  const next = {
    plate: patch.plate !== undefined ? String(patch.plate).trim().toUpperCase() : current.plate,
    model: patch.model !== undefined ? (patch.model ? String(patch.model).trim() : null) : current.model,
    capacity: patch.capacity !== undefined ? Number(patch.capacity) || 0 : current.capacity,
    active: patch.active !== undefined ? (patch.active ? 1 : 0) : current.active,
  };

  db.prepare(
    "UPDATE vehicles SET plate = ?, model = ?, capacity = ?, active = ? WHERE id = ?"
  ).run(next.plate, next.model, next.capacity, next.active, id);

  return getVehicle(id);
}

export function deleteVehicle(id) {
  return db.prepare("DELETE FROM vehicles WHERE id = ?").run(id).changes > 0;
}

// ─── Viagens ──────────────────────────────────────────────────────────────────
export function startTrip({ driverId, driverName, vehicleId, plate, routeId, routeName }) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO trips (id, driver_id, driver_name, vehicle_id, plate, route_id, route_name, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    driverId ?? null,
    driverName || "Motorista",
    vehicleId ?? null,
    plate ?? null,
    routeId ?? null,
    routeName ?? null,
    new Date().toISOString()
  );
  return getTrip(id);
}

export function getTrip(id) {
  return mapTrip(db.prepare("SELECT * FROM trips WHERE id = ?").get(id));
}

export function endTrip(id) {
  db.prepare("UPDATE trips SET ended_at = ? WHERE id = ? AND ended_at IS NULL").run(
    new Date().toISOString(),
    id
  );
  return getTrip(id);
}

/** Fecha viagens que ficaram abertas (ex: backend reiniciou no meio de um percurso). */
export function closeOrphanTrips() {
  const result = db
    .prepare(
      `UPDATE trips
          SET ended_at = COALESCE(
            (SELECT MAX(recorded_at) FROM locations WHERE locations.trip_id = trips.id),
            started_at
          )
        WHERE ended_at IS NULL`
    )
    .run();
  return result.changes;
}

export function listTrips({ limit = 50, driverId, vehicleId, routeId } = {}) {
  const where = [];
  const params = [];
  if (driverId) { where.push("driver_id = ?"); params.push(driverId); }
  if (vehicleId) { where.push("vehicle_id = ?"); params.push(vehicleId); }
  if (routeId) { where.push("route_id = ?"); params.push(routeId); }

  const sql = `SELECT * FROM trips
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY started_at DESC
               LIMIT ?`;
  const safeLimit = Math.min(500, Math.max(1, Number.parseInt(limit, 10) || 50));
  return db.prepare(sql).all(...params, safeLimit).map(mapTrip);
}

// ─── Posições ─────────────────────────────────────────────────────────────────
const insertLocationStmt = db.prepare(
  `INSERT INTO locations (trip_id, lat, lng, speed, heading, accuracy, recorded_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const bumpTripStmt = db.prepare(
  "UPDATE trips SET points = points + ?, distance_m = distance_m + ? WHERE id = ?"
);

export function insertLocation(tripId, { lat, lng, speed, heading, accuracy, recordedAt }) {
  insertLocationStmt.run(
    tripId,
    Number(lat),
    Number(lng),
    speed === undefined || speed === null ? null : Number(speed),
    heading === undefined || heading === null ? null : Number(heading),
    accuracy === undefined || accuracy === null ? null : Number(accuracy),
    recordedAt || new Date().toISOString()
  );
}

/** Grava várias posições de uma vez (usado quando o app reconecta e descarrega o buffer). */
export function insertLocationBatch(tripId, points) {
  db.exec("BEGIN");
  try {
    for (const p of points) insertLocation(tripId, p);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function bumpTripCounters(tripId, { points = 0, distanceM = 0 }) {
  bumpTripStmt.run(points, distanceM, tripId);
}

export function getTripLocations(tripId, { limit = 5000 } = {}) {
  const safeLimit = Math.min(10000, Math.max(1, Number.parseInt(limit, 10) || 5000));
  return db
    .prepare(
      "SELECT lat, lng, speed, heading, accuracy, recorded_at FROM locations WHERE trip_id = ? ORDER BY id LIMIT ?"
    )
    .all(tripId, safeLimit)
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      speed: r.speed,
      heading: r.heading,
      accuracy: r.accuracy,
      recordedAt: r.recorded_at,
    }));
}

export function getLastLocation(tripId) {
  const row = db
    .prepare("SELECT lat, lng, speed, heading, recorded_at FROM locations WHERE trip_id = ? ORDER BY id DESC LIMIT 1")
    .get(tripId);
  if (!row) return null;
  return {
    lat: row.lat,
    lng: row.lng,
    speed: row.speed,
    heading: row.heading,
    recordedAt: row.recorded_at,
  };
}

// ─── Seed inicial ─────────────────────────────────────────────────────────────
export function seed() {
  const driverCount = db.prepare("SELECT COUNT(*) AS n FROM drivers").get().n;
  if (driverCount === 0) {
    createDriver({ name: "João Silva",     registration: "1001", password: "1234" });
    createDriver({ name: "Maria Oliveira", registration: "1002", password: "1234" });
    console.log("[db] motoristas de exemplo criados (matrículas 1001 e 1002, senha 1234)");
  }

  const vehicleCount = db.prepare("SELECT COUNT(*) AS n FROM vehicles").get().n;
  if (vehicleCount === 0) {
    createVehicle({ plate: "ABC1D23", model: "Mercedes-Benz O500", capacity: 42 });
    createVehicle({ plate: "BUS2A45", model: "Volvo B270F",        capacity: 38 });
    createVehicle({ plate: "XYZ7K89", model: "Marcopolo Torino",   capacity: 45 });
    console.log("[db] veículos de exemplo criados (ABC1D23, BUS2A45, XYZ7K89)");
  }
}
