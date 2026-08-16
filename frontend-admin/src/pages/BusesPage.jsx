import React, { useState } from "react";
import { Bus, Clock, Gauge, MapPin, Search, Users } from "../components/Icons";

export default function BusesPage({ buses, routes }) {
  const [query, setQuery] = useState("");

  function routeName(id) {
    return routes.find((r) => r.id === id)?.name || "Sem rota";
  }
  function routeColor(id) {
    return routes.find((r) => r.id === id)?.color || "#94a3b8";
  }

  const filtered = buses.filter((b) => {
    const term = query.toLowerCase();
    return (
      (b.driverName || "").toLowerCase().includes(term) ||
      (b.plate || "").toLowerCase().includes(term) ||
      routeName(b.routeId).toLowerCase().includes(term)
    );
  });
  const onlineCount = buses.filter((b) => b.online).length;

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Ônibus</h1>
          <div style={S.subtitle}>
            <span className="chip chip-success">
              <span className="live-dot" /> {onlineCount} online
            </span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {buses.length} no total
            </span>
          </div>
        </div>

        <div style={{ position: "relative", width: 280 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar motorista ou linha"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      {buses.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>
            <Bus size={28} />
          </div>
          <div style={S.emptyTitle}>Nenhum ônibus registrado</div>
          <div style={S.emptyText}>
            Os motoristas aparecerão aqui quando fizerem login no app.
          </div>
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map((b) => {
            const color = routeColor(b.routeId);
            return (
              <article
                key={b.id}
                style={S.card(b.online)}
                className="animate-in"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                <div style={S.cardTop}>
                  <div style={S.avatar(color)}>
                    <Bus size={20} />
                  </div>
                  <span className={`chip ${b.online ? "chip-success" : "chip-muted"}`}>
                    {b.online && <span className="live-dot" />}
                    {b.online ? "Online" : "Offline"}
                  </span>
                </div>

                <div style={S.nameRow}>
                  <span style={S.name}>{b.driverName}</span>
                  {b.plate && <span style={S.plate}>{b.plate}</span>}
                </div>
                <div style={S.routeLine}>
                  <span style={S.routeColorDot(color)} />
                  {routeName(b.routeId)}
                </div>

                <div style={S.stats}>
                  <Stat
                    icon={<Gauge size={12} />}
                    label="Velocidade"
                    value={b.speed ? `${Math.round(b.speed)} km/h` : "0 km/h"}
                  />
                  <Stat
                    icon={<Clock size={12} />}
                    label="Atualização"
                    value={
                      b.lastUpdate
                        ? new Date(b.lastUpdate).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={S.stat}>
      <div style={S.statLabel}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={S.statValue}>{value}</div>
    </div>
  );
}

const S = {
  wrap: {
    marginTop: "var(--topbar-h)",
    padding: "28px 40px 40px",
    minHeight: "calc(100vh - var(--topbar-h))",
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    marginBottom: 8,
  },
  subtitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: (online) => ({
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "var(--shadow-sm)",
    opacity: online ? 1 : 0.7,
    transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
    cursor: "pointer",
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  avatar: (color) => ({
    width: 48,
    height: 48,
    borderRadius: 13,
    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: `0 8px 18px -4px ${color}55`,
  }),
  nameRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  plate: {
    fontFamily: "var(--font-display)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "var(--text-soft)",
    background: "var(--hover)",
    border: "1px solid var(--border)",
    borderRadius: 7,
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
  routeLine: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 12.5,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  routeColorDot: (c) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: c,
    display: "inline-block",
  }),
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid var(--border)",
  },
  stat: { display: "flex", flexDirection: "column", gap: 3 },
  statLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13.5,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  empty: {
    background: "var(--surface)",
    border: "1.5px dashed var(--border-strong)",
    borderRadius: 18,
    padding: "60px 24px",
    textAlign: "center",
    color: "var(--text-muted)",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "var(--primary-soft)",
    color: "var(--primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 16,
    color: "var(--text)",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "var(--text-muted)",
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
