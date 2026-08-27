import React, { useMemo } from "react";
import { Bus, Clock, Close, Gauge, MapPin, Users } from "./Icons";

const styles = {
  panel: {
    position: "absolute",
    top: 16,
    right: 16,
    width: "var(--detail-w)",
    maxHeight: "calc(100% - 32px)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 900,
  },
  header: {
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid var(--border)",
  },
  avatar: (color) => ({
    width: 44,
    height: 44,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: `0 8px 18px -4px ${color}66`,
    flexShrink: 0,
  }),
  name: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  routeLine: {
    marginTop: 3,
    fontSize: 12,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-soft)",
    background: "var(--hover)",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },

  etaBlock: {
    padding: "18px 18px 16px",
    borderBottom: "1px solid var(--border)",
  },
  etaLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  etaValue: {
    fontFamily: "var(--font-display)",
    fontSize: 32,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  etaUnit: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  etaSub: {
    marginTop: 6,
    fontSize: 12,
    color: "var(--text-soft)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  metricsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 1,
    background: "var(--border)",
    borderBottom: "1px solid var(--border)",
  },
  metric: {
    padding: "14px 16px",
    background: "var(--surface)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  metricValue: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },

  timelineWrap: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 18px 20px",
  },
  timelineLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeline: {
    position: "relative",
    paddingLeft: 22,
  },
  timelineLine: {
    position: "absolute",
    left: 7,
    top: 8,
    bottom: 8,
    width: 2,
    background: "var(--border-strong)",
  },
  stop: (state) => ({
    position: "relative",
    paddingBottom: 16,
  }),
  stopDot: (state, color) => {
    const base = {
      position: "absolute",
      left: -22,
      top: 2,
      width: 16,
      height: 16,
      borderRadius: "50%",
      border: `3px solid var(--surface-solid)`,
      boxShadow: "0 0 0 2px var(--border-strong)",
    };
    if (state === "passed") return { ...base, background: "var(--text-muted)" };
    if (state === "next")
      return {
        ...base,
        background: color,
        boxShadow: `0 0 0 2px ${color}, 0 0 0 6px ${color}33`,
        animation: "pulse-dot 1.6s ease-in-out infinite",
      };
    return { ...base, background: "var(--surface-solid)", boxShadow: "0 0 0 2px var(--border-strong)" };
  },
  stopName: (state) => ({
    fontFamily: "var(--font-display)",
    fontWeight: state === "next" ? 700 : 600,
    fontSize: 13,
    color: state === "passed" ? "var(--text-muted)" : "var(--text)",
    textDecoration: state === "passed" ? "line-through" : "none",
    letterSpacing: "-0.01em",
  }),
  stopMeta: {
    marginTop: 2,
    fontSize: 11.5,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 8,
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

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeRouteState(bus, route) {
  if (!route || !bus?.lat) {
    return { passedIdx: -1, nextStop: null, distanceToNextKm: 0, etaMin: null };
  }
  const stops = route.stops;
  const distances = stops.map((s) => haversine([bus.lat, bus.lng], [s.lat, s.lng]));
  const nearestIdx = distances.indexOf(Math.min(...distances));

  // Próxima parada: a partir do ponto mais próximo, decidimos pelo "ordem" → assumimos que ela é a próxima
  const nextStop = stops[nearestIdx] || null;
  const passedIdx = nearestIdx - 1;
  const distanceKm = distances[nearestIdx] || 0;

  const speed = bus.speed && bus.speed > 4 ? bus.speed : 18; // km/h, fallback se parado
  const etaMin = distanceKm > 0 ? Math.max(1, Math.round((distanceKm / speed) * 60)) : 0;

  return { passedIdx, nextStop, distanceToNextKm: distanceKm, etaMin };
}

export default function BusDetail({ bus, route, onClose }) {
  if (!bus || !route) return null;
  const color = route.color || "#2563eb";

  const { passedIdx, nextStop, distanceToNextKm, etaMin } = useMemo(
    () => computeRouteState(bus, route),
    [bus.lat, bus.lng, bus.speed, route]
  );

  const isStopped = !bus.speed || bus.speed < 1;
  const occupancyEstimate = (() => {
    if (isStopped) return { label: "Embarcando", chip: "chip-warn" };
    if (bus.speed > 40) return { label: "Tranquilo", chip: "chip-online" };
    if (bus.speed > 15) return { label: "Moderado", chip: "chip-info" };
    return { label: "Movimentado", chip: "chip-accent" };
  })();

  return (
    <aside className="slide-in-right detail-panel" style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.avatar(color)}>
          <Bus size={20} />
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={styles.name}>{bus.driverName}</div>
          <div style={styles.routeLine}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {route.name}
            </span>
          </div>
        </div>
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Fechar"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--hover)")}
        >
          <Close size={16} />
        </button>
      </div>

      <div style={styles.etaBlock}>
        <div style={styles.etaLabel}>Tempo até a próxima parada</div>
        <div style={styles.etaValue}>
          {etaMin === null || etaMin === 0 ? (
            <>
              <span>Agora</span>
            </>
          ) : (
            <>
              <span>{etaMin}</span>
              <span style={styles.etaUnit}>min</span>
            </>
          )}
        </div>
        <div style={styles.etaSub}>
          <MapPin size={14} style={{ color }} />
          <span>
            {nextStop ? (
              <>
                Próxima: <strong style={{ color: "var(--text)" }}>{nextStop.name}</strong>
              </>
            ) : (
              "Calculando…"
            )}
            {distanceToNextKm > 0 && (
              <span style={{ marginLeft: 6, color: "var(--text-muted)" }}>
                · {(distanceToNextKm * 1000).toFixed(0)} m
              </span>
            )}
          </span>
        </div>
      </div>

      <div style={styles.metricsRow}>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>
            <Gauge size={12} /> Velocidade
          </div>
          <div style={styles.metricValue}>
            {bus.speed ? Math.round(bus.speed) : 0}{" "}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>km/h</span>
          </div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>
            <Users size={12} /> Lotação
          </div>
          <div style={{ ...styles.metricValue, fontSize: 14 }}>
            <span className={`chip ${occupancyEstimate.chip}`} style={{ fontSize: 11 }}>
              {occupancyEstimate.label}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.timelineWrap}>
        <div style={styles.timelineLabel}>
          <span>Trajeto da linha</span>
          <span className="chip chip-online" style={{ fontSize: 10 }}>
            <span className="live-dot" /> ao vivo
          </span>
        </div>
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {route.stops.map((s, idx) => {
            const state =
              idx < passedIdx ? "passed" : idx === passedIdx + 1 || nextStop?.id === s.id ? "next" : "upcoming";
            return (
              <div key={s.id} style={styles.stop(state)}>
                <div style={styles.stopDot(state, color)} />
                <div style={styles.stopName(state)}>{s.name}</div>
                <div style={styles.stopMeta}>
                  <span>Parada #{s.order + 1}</span>
                  {state === "next" && (
                    <span className="chip chip-info" style={{ fontSize: 10 }}>
                      <Clock size={10} /> Próxima
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
