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
