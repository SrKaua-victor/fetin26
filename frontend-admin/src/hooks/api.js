const BASE = "http://localhost:3001/api";

export async function getRoutes() {
  const r = await fetch(`${BASE}/routes`);
  return r.json();
}

export async function createRoute(data) {
  const r = await fetch(`${BASE}/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function updateRoute(id, data) {
  const r = await fetch(`${BASE}/routes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function deleteRoute(id) {
  await fetch(`${BASE}/routes/${id}`, { method: "DELETE" });
}

export async function getBuses() {
  const r = await fetch(`${BASE}/buses`);
  return r.json();
}

// ─── Frota (veículos e motoristas, persistidos em SQLite) ─────────────────────
async function send(path, method, data) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "Erro ao falar com o servidor");
  return body;
}

export const getVehicles    = ()         => send("/vehicles", "GET");
export const createVehicle  = (data)     => send("/vehicles", "POST", data);
export const updateVehicle  = (id, data) => send(`/vehicles/${id}`, "PUT", data);
export const deleteVehicle  = (id)       => send(`/vehicles/${id}`, "DELETE");

export const getDrivers     = ()         => send("/drivers", "GET");
export const createDriver   = (data)     => send("/drivers", "POST", data);
export const updateDriver   = (id, data) => send(`/drivers/${id}`, "PUT", data);
export const deleteDriver   = (id)       => send(`/drivers/${id}`, "DELETE");

// ─── Histórico de viagens ─────────────────────────────────────────────────────
export const getTrips          = (params = "") => send(`/trips${params}`, "GET");
export const getTripLocations  = (id)          => send(`/trips/${id}/locations`, "GET");
