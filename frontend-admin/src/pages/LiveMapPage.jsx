import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Activity, Bus } from "../components/Icons";

const CENTER = [-22.8535, -45.386];

// O CARTO passou a exigir chave de API: sem ela os tiles voltam com "API KEY
// REQUIRED" carimbado por cima do mapa. Os tiles oficiais do OpenStreetMap são
// livres e não pedem chave. Como não existe variante escura oficial, o tema dark
// sai de um filtro CSS aplicado sobre os mesmos tiles (.map-tiles-dark).
const OSM = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

const TILES = {
  light: { ...OSM, className: "" },
  dark: { ...OSM, className: "map-tiles-dark" },
};

function shade(hex, percent) {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const f = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (n >> 16) + f));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + f));
    const b = Math.min(255, Math.max(0, (n & 0xff) + f));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  } catch {
    return hex;
  }
}

function busIcon(color) {
  return L.divIcon({
    className: "",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html: `
      <div class="bus-marker-wrap">
        <div class="bus-pulse-ring" style="background:${color}33"></div>
        <div class="bus-pulse-ring delayed" style="background:${color}33"></div>
        <div class="bus-icon" style="background-image: linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%); box-shadow: 0 6px 18px ${color}66, 0 2px 4px rgba(15,23,42,0.18)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="3" width="16" height="15" rx="3"/>
            <path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/>
          </svg>
        </div>
        <div class="bus-status-dot"></div>
      </div>
    `,
  });
}

export default function LiveMapPage({ buses, routes, theme = "light" }) {
  const activeBuses = buses.filter((b) => b.online && b.lat);
  const tiles = theme === "dark" ? TILES.dark : TILES.light;
  const activeRoutes = routes.filter((r) => r.active);

  return (
    <div
      style={{
        marginTop: "var(--topbar-h)",
        height: "calc(100vh - var(--topbar-h))",
        position: "relative",
      }}
    >
      <MapContainer
        center={CENTER}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          key={theme}
          url={tiles.url}
          attribution={tiles.attribution}
          className={tiles.className}
          maxZoom={19}
        />

        {activeRoutes.map((route) => (
          <React.Fragment key={route.id}>
            <Polyline
              positions={route.path}
              pathOptions={{
                color: route.color,
                weight: 10,
                opacity: 0.14,
                lineCap: "round",
              }}
            />
            <Polyline
              positions={route.path}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.85,
                lineCap: "round",
              }}
            />
          </React.Fragment>
        ))}

        {activeBuses.map((bus) => {
          const color = routes.find((r) => r.id === bus.routeId)?.color || "#2563eb";
          return (
            <Marker
              key={bus.id}
              position={[bus.lat, bus.lng]}
              icon={busIcon(color)}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif" }}>
                  <div
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: "var(--text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    🚌 {bus.driverName}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                    {bus.speed ? `${Math.round(bus.speed)} km/h` : "Parado"}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div style={S.headerCard} className="glass slide-in-up">
        <div style={S.headerTop}>
          <div style={S.headerIcon}>
            <Activity size={16} />
          </div>
          <div>
            <div style={S.headerTitle}>Mapa ao vivo</div>
            <div style={S.headerSub}>
              <span className="live-dot" /> {activeBuses.length} ônibus em circulação
            </div>
          </div>
        </div>
      </div>

      <div style={S.legend} className="glass slide-in-up">
        <div style={S.legendTitle}>Linhas ativas</div>
        <div style={S.legendList}>
          {activeRoutes.map((r) => {
            const count = activeBuses.filter((b) => b.routeId === r.id).length;
            return (
              <div key={r.id} style={S.legendItem}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    background: r.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-soft)", fontWeight: 600 }}>
                  {r.name}
                </span>
                <span className={`chip ${count > 0 ? "chip-success" : "chip-muted"}`}>
                  {count > 0 && <span className="live-dot" />}
                  {count} ativo{count !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const S = {
  headerCard: {
    position: "absolute",
    top: 16,
    left: 16,
    padding: "14px 18px",
    zIndex: 800,
    minWidth: 240,
  },
  headerTop: { display: "flex", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    background: "var(--primary-soft)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  headerSub: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legend: {
    position: "absolute",
    bottom: 24,
    right: 16,
    padding: "14px 16px",
    width: 280,
    zIndex: 800,
  },
  legendTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--text)",
    marginBottom: 10,
    letterSpacing: "-0.01em",
  },
  legendList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" },
  legendItem: { display: "flex", alignItems: "center", gap: 8 },
};
