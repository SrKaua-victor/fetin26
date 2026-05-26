// Geometria esférica simples para uso no editor de rotas.

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ponto mais próximo do segmento AB ao ponto P, retornado como [lat, lng].
// Usa projeção equirretangular local — suficientemente precisa para distâncias urbanas.
export function closestOnSegment(a, b, p) {
  const cosLat = Math.cos((a[0] * Math.PI) / 180);
  const ax = a[1] * cosLat, ay = a[0];
  const bx = b[1] * cosLat, by = b[0];
  const px = p[1] * cosLat, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { point: a, t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return { point: [qy, qx / cosLat], t };
}

// Encontra o ponto mais próximo na polilinha ao ponto P.
// Retorna { point, distKm, segIdx, t } ou null se polyline tem < 2 pontos.
export function snapToPolyline(point, polyline) {
  if (!polyline || polyline.length < 2) return null;
  let best = { distKm: Infinity, point: null, segIdx: -1, t: 0 };
  for (let i = 0; i < polyline.length - 1; i++) {
    const { point: q, t } = closestOnSegment(polyline[i], polyline[i + 1], point);
    const d = haversineKm(point, q);
    if (d < best.distKm) best = { distKm: d, point: q, segIdx: i, t };
  }
  return best;
}

export function pathLengthKm(path = []) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i]);
  return total;
}
