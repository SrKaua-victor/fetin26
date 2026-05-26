// Snap-to-roads via OSRM (servidor demo público).
// Para produção, hospede o seu próprio OSRM ou troque por outro provedor.

const OSRM = "https://router.project-osrm.org";

// Encaixa um ponto [lat,lng] na via mais próxima. Fallback: retorna o ponto original.
export async function snapPoint(pos) {
  try {
    const url = `${OSRM}/nearest/v1/driving/${pos[1]},${pos[0]}?number=1`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("OSRM " + res.status);
    const data = await res.json();
    const loc = data?.waypoints?.[0]?.location;
    if (!loc) throw new Error("Sem ponto");
    return [loc[1], loc[0]];
  } catch {
    return pos;
  }
}

// Snap de um segmento entre dois pontos [lat,lng]. Retorna a polilinha completa
// (incluindo as duas extremidades — já encaixadas em vias). Em caso de falha,
// fallback para linha reta entre os pontos originais.
export async function snapSegment(from, to) {
  try {
    const url = `${OSRM}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("OSRM " + res.status);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) throw new Error("Sem rota");
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return [from, to];
  }
}

// Recomputa a polilinha completa a partir de uma lista de âncoras.
// Segmentos são concatenados sequencialmente para respeitar o rate-limit
// do servidor demo do OSRM.
export async function snapPath(anchors) {
  if (!anchors || anchors.length === 0) return [];
  if (anchors.length === 1) return [anchors[0]];
  const out = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    const seg = await snapSegment(anchors[i - 1], anchors[i]);
    out.push(...seg.slice(1));
  }
  return out;
}
