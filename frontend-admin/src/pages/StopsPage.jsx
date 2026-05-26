import React, { useMemo, useState } from "react";
import { MapPin, Search } from "../components/Icons";

export default function StopsPage({ routes }) {
  const [query, setQuery] = useState("");

  const allStops = useMemo(() => {
    return routes.flatMap((r) =>
      r.stops.map((s) => ({
        ...s,
        routeId: r.id,
        routeName: r.name,
        routeColor: r.color,
      }))
    );
  }, [routes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStops;
    return allStops.filter(
      (s) => s.name.toLowerCase().includes(q) || s.routeName.toLowerCase().includes(q)
    );
  }, [allStops, query]);

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Paradas</h1>
          <div style={S.subtitle}>
            {allStops.length} paradas em {routes.length} linhas
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
            placeholder="Buscar parada ou linha"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>
            <MapPin size={28} />
          </div>
          <div style={S.emptyTitle}>Nenhuma parada encontrada</div>
        </div>
      ) : (
        <div style={S.table}>
          <div style={S.tableHeader}>
            <span style={{ width: 50 }}>#</span>
            <span style={{ flex: 1 }}>Parada</span>
            <span style={{ flex: 1 }}>Linha</span>
            <span style={{ width: 180, textAlign: "right" }}>Coordenadas</span>
          </div>
          {filtered.map((s, i) => (
            <div key={`${s.routeId}-${s.id}`} style={S.row} className="animate-in">
              <div style={S.cellIndex}>{(s.order + 1).toString().padStart(2, "0")}</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={S.pin(s.routeColor)}>
                  <MapPin size={14} />
                </div>
                <span style={S.stopName}>{s.name}</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.colorDot(s.routeColor)} />
                <span style={S.routeLabel}>{s.routeName}</span>
              </div>
              <div style={S.coords}>
                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
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
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  table: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 22px",
    background: "var(--surface-soft)",
    borderBottom: "1px solid var(--border)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 22px",
    borderBottom: "1px solid var(--border)",
    transition: "background 0.18s ease",
    cursor: "pointer",
  },
  cellIndex: {
    width: 50,
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--text-muted)",
    letterSpacing: "-0.01em",
  },
  pin: (color) => ({
    width: 32,
    height: 32,
    borderRadius: 10,
    background: `${color}1a`,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
  stopName: {
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  colorDot: (c) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: c,
    flexShrink: 0,
  }),
  routeLabel: {
    fontSize: 12.5,
    color: "var(--text-soft)",
  },
  coords: {
    width: 180,
    textAlign: "right",
    fontSize: 11.5,
    color: "var(--text-muted)",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
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
  },
};
