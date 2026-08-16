import React, { useState } from "react";
import { Bell, Bus, ChevronDown, Map, Moon, Route, Sun, MapPin, ChartBar, Users } from "./Icons";

const styles = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "var(--topbar-h)",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    gap: 32,
    zIndex: 2000,
    boxShadow: "var(--shadow-sm)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 70%, #f97316 130%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: "0 8px 20px -6px rgba(37,99,235,0.55)",
  },
  brandText: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 18,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  brandTag: {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    fontSize: 13,
    color: "var(--text-muted)",
    letterSpacing: 0,
  },
  nav: {
    display: "flex",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  navBtn: (active) => ({
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 14px",
    borderRadius: 10,
    background: active ? "var(--primary-soft)" : "transparent",
    color: active ? "var(--primary)" : "var(--text-soft)",
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    transition: "all 0.18s ease",
  }),
  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  iconBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-soft)",
    background: "transparent",
    transition: "all 0.18s ease",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    padding: "0 4px",
    borderRadius: 999,
    background: "var(--accent)",
    color: "white",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(249,115,22,0.45)",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "0 12px",
    height: 36,
    borderRadius: 10,
    background: "var(--success-soft)",
    color: "var(--success)",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "var(--font-display)",
  },
  statusOff: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
  },
  divider: {
    width: 1,
    height: 28,
    background: "var(--border)",
  },
  avatarWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 10px 4px 4px",
    borderRadius: 12,
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
  },
  avatarInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    lineHeight: 1.1,
  },
  avatarName: {
    fontFamily: "var(--font-display)",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  avatarRole: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
};

const NAV_ITEMS = [
  { id: "routes",   label: "Rotas",        Icon: Route },
  { id: "buses",    label: "Ônibus",       Icon: Bus },
  { id: "fleet",    label: "Frota",        Icon: Users },
  { id: "stops",    label: "Paradas",      Icon: MapPin },
  { id: "map",      label: "Mapa ao vivo", Icon: Map },
  { id: "reports",  label: "Relatórios",   Icon: ChartBar },
];

export default function Topbar({ connected, activePage, onNavigate, theme, onToggleTheme }) {
  const [hovered, setHovered] = useState(null);
  return (
    <header style={styles.bar}>
      <div style={styles.brand}>
        <div style={styles.brandMark}>
          <Bus size={18} />
        </div>
        <div style={styles.brandText}>
          BusTrack
          <span style={styles.brandTag}>Admin</span>
        </div>
      </div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
              style={styles.navBtn(active)}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>

      <div style={styles.right}>
        <div style={{ ...styles.status, ...(!connected ? styles.statusOff : {}) }}>
          <span
            className="live-dot"
            style={{
              background: connected ? "var(--success)" : "var(--danger)",
            }}
          />
          {connected ? "Online" : "Offline"}
        </div>

        <button
          style={styles.iconBtn}
          onClick={onToggleTheme}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Alternar tema"
          title="Alternar tema"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          style={styles.iconBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell size={18} />
          <span style={styles.badge}>3</span>
        </button>

        <div style={styles.divider} />

        <div
          style={styles.avatarWrap}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-soft)")}
        >
          <div style={styles.avatar}>A</div>
          <div style={styles.avatarInfo}>
            <span style={styles.avatarName}>Admin</span>
            <span style={styles.avatarRole}>Administrador</span>
          </div>
          <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>
    </header>
  );
}
