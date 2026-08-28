import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { distanceToPathKm, haversineKm, nearestStop } from "../lib/geo";

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

function busIcon(color = "#2563eb") {
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div class="bus-marker-wrap">
        <div class="bus-pulse-ring" style="background: ${color}33"></div>
        <div class="bus-pulse-ring delayed" style="background: ${color}33"></div>
        <div class="bus-icon" style="background-image: linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%); box-shadow: 0 6px 18px ${color}66, 0 2px 4px rgba(15,23,42,0.18)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white">
            <rect x="4" y="3" width="16" height="15" rx="3"/>
            <path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/>
          </svg>
        </div>
        <div class="bus-status-dot"></div>
      </div>
    `,
  });
}

function stopIcon(color = "#2563eb", size = 14) {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="stop-dot" style="border-color: ${color}"></div>`,
  });
}

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

function MapController({ selectedBus, fitBounds }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBus?.lat && selectedBus?.lng) {
      map.flyTo([selectedBus.lat, selectedBus.lng], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedBus?.lat, selectedBus?.lng]);

  useEffect(() => {
    if (fitBounds?.length >= 2) {
      const bounds = L.latLngBounds(fitBounds);
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.7 });
    }
  }, [fitBounds]);

  return null;
}

/**
 * A partir de que distância do traçado consideramos o ônibus fora da rota.
 *
 * Abaixo disso a diferença é ruído de GPS (precisão típica de 10 a 20 m) ou a
 * largura da própria via, não desvio de verdade — marcar como desvio nesse caso
 * encheria o mapa de linhas tracejadas com o ônibus andando normalmente.
 */
const OFF_ROUTE_KM = 0.06; // 60 m

/**
 * Liga o ônibus fora do traçado à próxima parada.
 *
 * Devolve null quando o ônibus está na rota — aí não há nada a desenhar e o
 * traçado original aparece sozinho, como sempre.
 */
function computeDetour(bus, route) {
  if (!bus?.lat || !route?.path?.length || !route.stops?.length) return null;

  const from = [bus.lat, bus.lng];
  if (distanceToPathKm(from, route.path) <= OFF_ROUTE_KM) return null;

  const stop = nearestStop(from, route.stops);
  if (!stop) return null;

  return {
    positions: [from, [stop.lat, stop.lng]],
    stop,
    distanceKm: haversineKm(from, [stop.lat, stop.lng]),
  };
}

export default function BusMap({ routes, buses, selectedRoute, selectedBus, theme }) {
  const activeRoutes = selectedRoute
    ? routes.filter((r) => r.id === selectedRoute)
    : routes.filter((r) => r.active);

  const activeBuses = buses.filter(
    (b) => b.online && b.lat && (selectedRoute ? b.routeId === selectedRoute : true)
  );

  const routeColorById = Object.fromEntries(routes.map((r) => [r.id, r.color]));
  const routeById = Object.fromEntries(routes.map((r) => [r.id, r]));

  const fitBounds =
    selectedRoute && activeRoutes[0]?.path?.length
      ? activeRoutes[0].path
      : null;

  const tiles = theme === "dark" ? TILES.dark : TILES.light;

  return (
    <MapContainer
      center={CENTER}
      zoom={14}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
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
          {/* Halo / sombra suave */}
          <Polyline
            positions={route.path}
            pathOptions={{
              color: route.color,
              weight: 12,
              opacity: 0.12,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          {/* Linha principal */}
          <Polyline
            positions={route.path}
            pathOptions={{
              color: route.color,
              weight: 5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          {/* Paradas */}
          {route.stops.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={stopIcon(route.color)}
            >
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160 }}>
                  <div
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {stop.name}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: route.color,
                      background: `${route.color}1a`,
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: route.color,
                      }}
                    />
                    Parada #{stop.order + 1} • {route.name}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </React.Fragment>
      ))}

      {/* Desvios: ônibus fora do traçado ligado à próxima parada.
          Vem antes dos marcadores para a linha passar por baixo deles, e o
          traçado original continua desenhado como sempre — este trecho é um
          acréscimo, não uma substituição. */}
      {activeBuses.map((bus) => {
        const detour = computeDetour(bus, routeById[bus.routeId]);
        if (!detour) return null;

        const color = routeColorById[bus.routeId] || "#2563eb";
        return (
          <Polyline
            key={`detour-${bus.id}`}
            positions={detour.positions}
            pathOptions={{
              color,
              weight: 4,
              // Translúcido e tracejado: sinaliza trecho provisório, e deixa o
              // traçado oficial visível por baixo quando os dois se cruzam.
              opacity: 0.45,
              dashArray: "8 10",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {activeBuses.map((bus) => {
        const color = routeColorById[bus.routeId] || "#2563eb";
        return (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lng]}
            icon={busIcon(color)}
            zIndexOffset={1000}
          >
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", minWidth: 180 }}>
                <div
                  style={{
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  🚌 {bus.driverName}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {bus.speed ? `${Math.round(bus.speed)} km/h` : "Parado"}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#16a34a",
                    background: "#dcfce7",
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#16a34a",
                    }}
                  />
                  Online ao vivo
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapController selectedBus={selectedBus} fitBounds={fitBounds} />
    </MapContainer>
  );
}
