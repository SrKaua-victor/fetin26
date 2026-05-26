import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

const CENTER = [-22.8535, -45.386];

const TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
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

function stopPin(order, color) {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div class="stop-pin" style="background:${color}">${order + 1}</div>`,
  });
}

function anchorPin(idx, color, isLast) {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `
      <div class="anchor-dot" style="
        background: ${isLast ? color : "#ffffff"};
        border: 3px solid ${color};
        box-shadow: 0 4px 10px ${color}55, 0 1px 2px rgba(15,23,42,0.18);
      "></div>
    `,
  });
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

function ClickHandler({ onClick, disabled }) {
  useMapEvents({
    click(e) {
      if (!disabled) onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function Recenter({ route }) {
  const map = useMap();
  useEffect(() => {
    if (route?.path?.length >= 2) {
      const bounds = L.latLngBounds(route.path);
      map.flyToBounds(bounds, { padding: [80, 80], duration: 0.6 });
    }
  }, [route?.id]);
  return null;
}

export default function RouteMapEditor({
  route,
  mode,
  onAddWaypoint,
  onAddStop,
  onRemoveStop,
  onRemoveWaypoint,
  onMoveWaypoint,
  onMoveStop,
  onRenameStop,
  buses = [],
  theme = "light",
  busy = false,
}) {
  if (!route) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
          fontSize: 14,
        }}
      >
        Selecione uma rota ou crie uma nova
      </div>
    );
  }

  const tiles = theme === "dark" ? TILES.dark : TILES.light;
  const activeBuses = buses.filter(
    (b) => b.online && b.lat && b.routeId === route.id
  );

  // Âncoras = pontos clicados pelo usuário (fallback: path para rotas antigas).
  const anchors = route.anchors?.length ? route.anchors : route.path || [];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MapContainer
        center={route.path?.[0] || CENTER}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer key={theme} url={tiles.url} attribution={tiles.attribution} />

        <ClickHandler
          disabled={
            busy ||
            mode === "view" ||
            mode === "schedules" ||
            mode === "settings"
          }
          onClick={(pos) => {
            if (mode === "path") onAddWaypoint(pos);
            else if (mode === "stop") onAddStop(pos);
          }}
        />

        {route.path?.length > 1 && (
          <>
            <Polyline
              positions={route.path}
              pathOptions={{
                color: route.color,
                weight: 12,
                opacity: 0.14,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
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
          </>
        )}

        {mode === "path" &&
          anchors.map((pos, i) => (
            <Marker
              key={`wp-${i}`}
              position={pos}
              icon={anchorPin(i, route.color, i === anchors.length - 1)}
              draggable={!busy}
              eventHandlers={{
                contextmenu: () => onRemoveWaypoint(i),
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onMoveWaypoint?.(i, [ll.lat, ll.lng]);
                },
              }}
            >
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: 160 }}>
                  <div
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--text)",
                    }}
                  >
                    Ponto #{i + 1}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Arraste para mover o ponto
                    <br />
                    Clique direito para remover
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {route.stops?.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopPin(stop.order, route.color)}
            draggable={mode === "stop" && !busy}
            eventHandlers={{
              contextmenu: () => mode === "stop" && onRemoveStop(stop.id),
              dragend: (e) => {
                if (mode !== "stop") return;
                const ll = e.target.getLatLng();
                onMoveStop?.(stop.id, [ll.lat, ll.lng]);
              },
            }}
          >
            <Popup>
              <StopPopupBody
                stop={stop}
                color={route.color}
                canEdit={mode === "stop"}
                onRename={(name) => onRenameStop?.(stop.id, name)}
              />
            </Popup>
          </Marker>
        ))}

        {activeBuses.map((bus) => (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lng]}
            icon={busIcon(route.color)}
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
        ))}

        <Recenter route={route} />
      </MapContainer>

      {busy && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-md)",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text-soft)",
            fontFamily: "var(--font-display)",
          }}
        >
          <div className="spinner" />
          Calculando rota nas ruas…
        </div>
      )}
    </div>
  );
}

function StopPopupBody({ stop, color, canEdit, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stop.name);

  // Reseta o draft quando a parada muda
  useEffect(() => {
    setDraft(stop.name);
    setEditing(false);
  }, [stop.id, stop.name]);

  function commit() {
    const clean = draft.trim();
    if (clean && clean !== stop.name) onRename?.(clean);
    setEditing(false);
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minWidth: 200 }}>
      {editing ? (
        <form
          onSubmit={(e) => { e.preventDefault(); commit(); }}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            placeholder="Nome da parada"
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 8,
              border: `1.5px solid ${color}`,
              fontSize: 13.5,
              fontFamily: "Plus Jakarta Sans, sans-serif",
              fontWeight: 600,
              color: "var(--text)",
              background: "var(--surface)",
              outline: "none",
            }}
          />
          <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
            Enter para salvar · Esc para cancelar
          </div>
        </form>
      ) : (
        <>
          <div
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            {stop.name}
          </div>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: color,
                background: `${color}1a`,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              Parada #{stop.order + 1}
            </span>
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text-soft)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                }}
              >
                ✎ Renomear
              </button>
            )}
          </div>
          {canEdit && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Arraste para reposicionar · Clique direito para remover
            </div>
          )}
        </>
      )}
    </div>
  );
}
