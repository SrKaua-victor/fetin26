// Implementações das ações rápidas (Exportar / Duplicar / Relatório / Compartilhar).
import { pathLengthKm } from "./geometry";

function downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function safeName(name) {
  return (name || "rota")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Exporta a rota como GeoJSON (linha + paradas como pontos).
export function exportRouteGeoJSON(route) {
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: route.id,
          name: route.name,
          color: route.color,
          active: route.active,
          stopCount: route.stops.length,
          waypointCount: route.path.length,
          lengthKm: +pathLengthKm(route.path).toFixed(3),
        },
        geometry: {
          type: "LineString",
          coordinates: route.path.map(([lat, lng]) => [lng, lat]),
        },
      },
      ...route.stops.map((s) => ({
        type: "Feature",
        properties: { id: s.id, name: s.name, order: s.order, lineId: route.id, lineName: route.name },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      })),
    ],
  };
  downloadFile(`${safeName(route.name)}.geojson`, "application/geo+json", JSON.stringify(geojson, null, 2));
}

// Abre uma janela impressa com o relatório da linha.
export function openRouteReport(route) {
  const km = pathLengthKm(route.path).toFixed(2);
  const stopsRows = route.stops
    .map(
      (s, i) =>
        `<tr><td class="num">${(i + 1).toString().padStart(2, "0")}</td><td>${escapeHtml(s.name)}</td><td class="coords">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>Relatório · ${escapeHtml(route.name)}</title>
<style>
  :root {
    --primary: #2563eb;
    --accent: ${route.color};
    --text: #0f172a;
    --muted: #64748b;
    --border: #e2e8f0;
    --bg: #f8fafc;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; color: var(--text); margin: 0; background: var(--bg); padding: 40px; }
  .wrap { max-width: 720px; margin: 0 auto; background: white; padding: 36px 40px; border-radius: 16px; box-shadow: 0 20px 60px -20px rgba(15,23,42,0.18); }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 18px; border-bottom: 1px solid var(--border); }
  .logo { width: 44px; height: 44px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; }
  h1 { font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.03em; }
  .sub { color: var(--muted); font-size: 13px; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 28px 0; }
  .stat { padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
  .stat .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .stat .value { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin-top: 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  td.num { width: 50px; color: var(--muted); font-weight: 700; }
  td.coords { color: var(--muted); font-family: ui-monospace, monospace; font-size: 12px; text-align: right; }
  footer { margin-top: 24px; font-size: 11px; color: var(--muted); }
  @media print {
    body { padding: 0; background: white; }
    .wrap { box-shadow: none; padding: 0; }
  }
</style></head><body>
  <div class="wrap">
    <header>
      <div class="logo">${escapeHtml(route.name.charAt(0).toUpperCase())}</div>
      <div>
        <h1>${escapeHtml(route.name)}</h1>
        <div class="sub">Relatório operacional — BusTrack Admin</div>
      </div>
    </header>
    <div class="grid">
      <div class="stat"><div class="label">Paradas</div><div class="value">${route.stops.length}</div></div>
      <div class="stat"><div class="label">Pontos no traçado</div><div class="value">${route.path.length}</div></div>
      <div class="stat"><div class="label">Extensão</div><div class="value">${km} <span style="font-size:14px;color:var(--muted);font-weight:500">km</span></div></div>
      <div class="stat"><div class="label">Status</div><div class="value" style="font-size:14px;color:${route.active ? "#16a34a" : "#64748b"}">${route.active ? "Ativa" : "Inativa"}</div></div>
      <div class="stat"><div class="label">Cor da linha</div><div class="value" style="font-size:14px"><span style="display:inline-block;width:18px;height:18px;border-radius:5px;background:${route.color};vertical-align:middle;margin-right:6px"></span>${route.color}</div></div>
      <div class="stat"><div class="label">Gerado em</div><div class="value" style="font-size:14px">${new Date().toLocaleString("pt-BR")}</div></div>
    </div>
    <h2>Paradas</h2>
    <table>
      <thead><tr><th>#</th><th>Nome</th><th style="text-align:right">Coordenadas</th></tr></thead>
      <tbody>${stopsRows || `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px 0">Nenhuma parada cadastrada</td></tr>`}</tbody>
    </table>
    <footer>BusTrack · Relatório gerado automaticamente · ID ${route.id}</footer>
  </div>
  <script>setTimeout(() => window.print(), 250);</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    downloadFile(`${safeName(route.name)}-relatorio.html`, "text/html", html);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// Copia um resumo compartilhável para a área de transferência.
export async function shareRoute(route) {
  const km = pathLengthKm(route.path).toFixed(1);
  const text =
    `🚌 ${route.name}\n` +
    `${route.stops.length} paradas · ${km} km · ${route.active ? "Ativa" : "Inativa"}\n` +
    `${route.stops.map((s, i) => `  ${i + 1}. ${s.name}`).join("\n")}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: route.name, text });
      return "shared";
    } catch (e) {
      if (e.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
