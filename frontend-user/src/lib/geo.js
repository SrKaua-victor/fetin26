const EARTH_R = 6371; // km

export function haversineKm(a, b) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

/**
 * Distância de um ponto ao segmento AB, em km.
 *
 * Precisa ser ao segmento, não aos vértices: o traçado das rotas tem pontos
 * esparsos, então um ônibus parado no meio de uma reta longa pode estar a
 * centenas de metros do vértice mais próximo sem ter saído do caminho.
 *
 * Projeta em coordenadas planas antes de resolver. Nas distâncias em jogo aqui
 * (dezenas a centenas de metros) o erro é desprezível, e a conta fica barata —
 * isto roda para cada ônibus a cada atualização de GPS.
 */
export function distanceToSegmentKm(p, a, b) {
  const latRef = (((a[0] + b[0]) / 2) * Math.PI) / 180;
  const kx = (Math.PI / 180) * EARTH_R * Math.cos(latRef); // km por grau de longitude
  const ky = (Math.PI / 180) * EARTH_R; // km por grau de latitude

  const px = p[1] * kx;
  const py = p[0] * ky;
  const ax = a[1] * kx;
  const ay = a[0] * ky;
  const bx = b[1] * kx;
  const by = b[0] * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  // Segmento degenerado (vértices repetidos): cai para distância ponto a ponto
  const t =
    lenSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Menor distância do ponto até o traçado inteiro, em km. */
export function distanceToPathKm(p, path) {
  if (!path?.length) return Infinity;
  if (path.length === 1) return haversineKm(p, path[0]);

  let min = Infinity;
  for (let i = 1; i < path.length; i++) {
    const d = distanceToSegmentKm(p, path[i - 1], path[i]);
    if (d < min) min = d;
  }
  return min;
}

/** Parada mais próxima do ponto, ou null se a rota não tiver paradas. */
export function nearestStop(p, stops) {
  if (!stops?.length) return null;

  let best = null;
  let bestDist = Infinity;
  for (const stop of stops) {
    const d = haversineKm(p, [stop.lat, stop.lng]);
    if (d < bestDist) {
      bestDist = d;
      best = stop;
    }
  }
  return best;
}
