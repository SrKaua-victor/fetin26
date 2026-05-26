import React from "react";
import { Activity, Bus, ChartBar, Clock, MapPin, Route as RouteIcon } from "../components/Icons";

export default function ReportsPage({ routes = [], buses = [] }) {
  const activeRoutes = routes.filter((r) => r.active).length;
  const onlineBuses = buses.filter((b) => b.online).length;
  const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);
  const avgSpeed =
    onlineBuses > 0
      ? Math.round(
          buses.filter((b) => b.online && b.speed > 0).reduce((a, b) => a + b.speed, 0) /
            Math.max(1, buses.filter((b) => b.online && b.speed > 0).length)
        )
      : 0;

  const stats = [
    {
      icon: <RouteIcon size={20} />,
      label: "Linhas ativas",
      value: activeRoutes,
      total: routes.length,
      delta: "+2",
      color: "var(--primary)",
      soft: "var(--primary-soft)",
    },
    {
      icon: <Bus size={20} />,
      label: "Ônibus online",
      value: onlineBuses,
      total: buses.length,
      delta: "+1",
      color: "var(--success)",
      soft: "var(--success-soft)",
    },
    {
      icon: <MapPin size={20} />,
      label: "Paradas mapeadas",
      value: totalStops,
      delta: "+12",
      color: "var(--accent)",
      soft: "var(--accent-soft)",
    },
    {
      icon: <Activity size={20} />,
      label: "Velocidade média",
      value: `${avgSpeed} km/h`,
      delta: "+3%",
      color: "#a855f7",
      soft: "rgba(168, 85, 247, 0.12)",
    },
  ];

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Relatórios</h1>
          <div style={S.subtitle}>Visão geral operacional em tempo real</div>
        </div>
        <button className="btn btn-ghost">
          <Clock size={14} /> Últimas 24 horas
        </button>
      </header>

      <div style={S.statsGrid}>
        {stats.map((s, i) => (
          <article key={i} style={S.statCard} className="animate-in">
            <div style={{ ...S.statIcon, background: s.soft, color: s.color }}>{s.icon}</div>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statValueRow}>
              <span style={S.statValue}>{s.value}</span>
              {s.total !== undefined && (
                <span style={S.statTotal}>/ {s.total}</span>
              )}
            </div>
            {s.delta && (
              <div style={S.statDelta}>
                <span className="chip chip-success" style={{ fontSize: 10.5 }}>
                  ▲ {s.delta}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>vs. ontem</span>
              </div>
            )}
          </article>
        ))}
      </div>

      <div style={S.grid}>
        <article style={S.bigCard}>
          <div style={S.bigCardHeader}>
            <div style={S.bigCardTitle}>
              <ChartBar size={16} style={{ color: "var(--primary)" }} /> Pontualidade por linha
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>esta semana</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {routes.map((r, i) => {
              const pct = 80 + ((i * 7) % 18);
              return (
                <div key={r.id}>
                  <div style={S.barRowHead}>
                    <span style={S.barRowName}>
                      <span style={{ ...S.colorDot, background: r.color }} />
                      {r.name}
                    </span>
                    <span style={S.barRowPct}>{pct}%</span>
                  </div>
                  <div style={S.barTrack}>
                    <div
                      style={{
                        ...S.barFill,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${r.color} 0%, ${r.color}cc 100%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {routes.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>
                Cadastre rotas para ver os indicadores.
              </div>
            )}
          </div>
        </article>

        <article style={S.bigCard}>
          <div style={S.bigCardHeader}>
            <div style={S.bigCardTitle}>
              <Bus size={16} style={{ color: "var(--accent)" }} /> Atividade recente
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {buses.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              buses.slice(0, 8).map((b) => {
                const color = routes.find((r) => r.id === b.routeId)?.color || "#94a3b8";
                return (
                  <div key={b.id} style={S.activityRow}>
                    <div style={{ ...S.activityDot, background: color }} />
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={S.activityName}>
                        {b.driverName}{" "}
                        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
                          · {routes.find((r) => r.id === b.routeId)?.name || "Sem rota"}
                        </span>
                      </div>
                      <div style={S.activitySub}>
                        {b.online ? "Em circulação" : "Offline"} •{" "}
                        {b.lastUpdate
                          ? new Date(b.lastUpdate).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                    </div>
                    <span className={`chip ${b.online ? "chip-success" : "chip-muted"}`}>
                      {b.online && <span className="live-dot" />}
                      {b.online ? "Ativo" : "Offline"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
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
    marginBottom: 24,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, color: "var(--text-muted)" },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValueRow: { display: "flex", alignItems: "baseline", gap: 6 },
  statValue: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  statTotal: {
    fontSize: 14,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  statDelta: { display: "flex", alignItems: "center", gap: 6 },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: 16,
  },
  bigCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "var(--shadow-sm)",
  },
  bigCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  bigCardTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 14.5,
    color: "var(--text)",
    letterSpacing: "-0.01em",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  barRowHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barRowName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-soft)",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  barRowPct: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    background: "var(--hover-strong)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    display: "inline-block",
  },

  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid var(--border)",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  activityName: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  activitySub: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 2,
  },
};
