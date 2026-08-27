import React, { useMemo, useState } from "react";
import { Bus, MapPin, Search, Star, StarFill, Sun, Moon, Wifi, Users } from "./Icons";

const styles = {
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "var(--panel-w)",
    height: "100%",
    background: "var(--surface)",
    borderRight: "1px solid var(--border)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    boxShadow: "var(--shadow)",
  },

  header: {
    padding: "20px 22px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--text)",
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6 0%, #f97316 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: "0 6px 16px -4px rgba(37,99,235,0.45)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-soft)",
    background: "var(--hover)",
    transition: "all 0.2s ease",
  },

  statusCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-soft)",
    lineHeight: 1.2,
  },
  statusSub: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    marginTop: 2,
  },

  searchWrap: {
    position: "relative",
    padding: "0 22px 12px",
  },
  searchInput: {
    width: "100%",
    height: 42,
    padding: "0 12px 0 38px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    fontSize: 13.5,
    outline: "none",
    transition: "all 0.2s ease",
  },
  searchIcon: {
    position: "absolute",
    left: 34,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: "0 22px 12px",
  },
  statCard: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
  },
  statValue: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    fontWeight: 500,
    marginTop: 2,
  },

  tabs: {
    display: "flex",
    gap: 6,
    padding: "0 22px 8px",
  },
  tab: (active) => ({
    flex: 1,
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 12.5,
    fontWeight: 600,
    color: active ? "var(--primary)" : "var(--text-muted)",
    background: active ? "var(--primary-soft)" : "transparent",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  }),

  section: {
    padding: "12px 22px 6px",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scroll: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 20,
  },

  routeCard: (active) => ({
    margin: "4px 14px",
    padding: "12px 14px",
    borderRadius: 14,
    background: active ? "var(--surface-solid)" : "transparent",
    border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
    boxShadow: active ? "var(--shadow-sm)" : "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
  }),
  routeColor: (color) => ({
    width: 6,
    alignSelf: "stretch",
    minHeight: 32,
    borderRadius: 4,
    background: color,
    flexShrink: 0,
  }),
  routeName: {
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    letterSpacing: "-0.01em",
  },
  routeMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
    fontSize: 11.5,
    color: "var(--text-muted)",
  },
  routeMetaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  favBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    background: "transparent",
    transition: "all 0.2s ease",
    flexShrink: 0,
  },

  busCard: (active) => ({
    margin: "4px 14px",
    padding: "10px 12px",
    borderRadius: 14,
    background: active ? "var(--surface-solid)" : "var(--surface2)",
    border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
    boxShadow: active ? "var(--shadow-sm)" : "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 12,
  }),
  busAvatar: (color) => ({
    width: 38,
    height: 38,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color || "#3b82f6"} 0%, ${color ? shade(color, -15) : "#2563eb"} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexShrink: 0,
    boxShadow: `0 6px 14px -4px ${color || "#3b82f6"}55`,
  }),
  busName: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  busMeta: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  emptyState: {
    margin: "12px 18px",
    padding: "20px 16px",
    textAlign: "center",
    border: "1.5px dashed var(--border-strong)",
    borderRadius: 14,
    color: "var(--text-muted)",
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  skeletonItem: {
    margin: "6px 14px",
    padding: "12px 14px",
    height: 64,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
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

export default function Sidebar({
  connected,
  routes,
  buses,
  selectedRoute,
  onSelectRoute,
  selectedBusId,
  onSelectBus,
  favorites,
  onToggleFavorite,
  theme,
  onToggleTheme,
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // all | favorites
  // No celular o painel vira uma folha sobre o mapa; começa recolhida para o
  // mapa ficar visível de cara. No desktop este estado não tem efeito nenhum.
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeBuses = useMemo(() => buses.filter((b) => b.online && b.lat), [buses]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = routes;
    if (tab === "favorites") list = list.filter((r) => favorites.has(r.id));
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    return list;
  }, [routes, query, tab, favorites]);

  const routeColorById = useMemo(
    () => Object.fromEntries(routes.map((r) => [r.id, r.color])),
    [routes]
  );

  return (
    <aside className={`panel${sheetOpen ? " panel-open" : ""}`} style={styles.panel}>
      {/* Só aparece no celular, onde o painel vira folha sobre o mapa (ver index.css) */}
      <button
        className="sheet-grab"
        onClick={() => setSheetOpen((v) => !v)}
        aria-label={sheetOpen ? "Recolher a lista de linhas" : "Expandir a lista de linhas"}
        aria-expanded={sheetOpen}
      >
        <span className="sheet-grab-bar" />
      </button>

      <div style={styles.header}>
        <div style={styles.topRow}>
          <div style={styles.logo}>
            <div style={styles.logoMark}>
              <Bus size={18} />
            </div>
            BusTrack
          </div>
          <button
            style={styles.iconBtn}
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div style={styles.statusCard}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: connected ? "var(--online-soft)" : "rgba(239,68,68,0.12)",
              color: connected ? "var(--online)" : "var(--danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wifi size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.statusText}>
              {connected ? "Conectado em tempo real" : "Reconectando…"}
            </div>
            <div style={styles.statusSub}>
              {connected ? "Posições atualizadas a cada segundo" : "Verifique sua conexão"}
            </div>
          </div>
          {connected && <span className="live-dot" />}
        </div>
      </div>

      <div style={styles.searchWrap}>
        <Search size={16} style={styles.searchIcon} />
        <input
          style={styles.searchInput}
          placeholder="Pesquisar linhas, paradas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {routes.length}
            <span className="chip chip-info" style={{ fontSize: 9 }}>linhas</span>
          </div>
          <div style={styles.statLabel}>Cadastradas no sistema</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {activeBuses.length}
            {activeBuses.length > 0 && <span className="live-dot" style={{ marginLeft: 2 }} />}
          </div>
          <div style={styles.statLabel}>Ônibus online agora</div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={styles.tab(tab === "all")} onClick={() => setTab("all")}>
          Todas
        </button>
        <button style={styles.tab(tab === "favorites")} onClick={() => setTab("favorites")}>
          <Star size={13} /> Favoritas
        </button>
      </div>

      <div style={styles.scroll}>
        <div style={styles.section}>
          <span>Linhas</span>
          {selectedRoute && (
            <button
              onClick={() => onSelectRoute(null)}
              style={{
                fontSize: 10.5,
                color: "var(--primary)",
                textTransform: "none",
                letterSpacing: 0,
                fontWeight: 600,
              }}
            >
              Limpar filtro
            </button>
          )}
        </div>

        {filteredRoutes.length === 0 ? (
          <div style={styles.emptyState}>
            {tab === "favorites"
              ? "Você ainda não favoritou nenhuma linha. Toque na estrela ao lado de uma linha para salvá-la."
              : "Nenhuma linha encontrada com esse termo."}
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const active = selectedRoute === route.id;
            const isFav = favorites.has(route.id);
            const onlineCount = activeBuses.filter((b) => b.routeId === route.id).length;
            return (
              <div
                key={route.id}
                style={styles.routeCard(active)}
                onClick={() => onSelectRoute(active ? null : route.id)}
                className="animate-in"
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={styles.routeColor(route.color)} />
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={styles.routeName}>{route.name}</div>
                  <div style={styles.routeMeta}>
                    <span style={styles.routeMetaItem}>
                      <MapPin size={11} /> {route.stops.length} paradas
                    </span>
                    {onlineCount > 0 ? (
                      <span className="chip chip-online">
                        <span className="live-dot" /> {onlineCount} ativo{onlineCount > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Sem ônibus</span>
                    )}
                  </div>
                </div>
                <button
                  style={styles.favBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(route.id);
                  }}
                  aria-label="Favoritar linha"
                  title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {isFav ? (
                    <StarFill size={16} style={{ color: "var(--accent)" }} />
                  ) : (
                    <Star size={16} />
                  )}
                </button>
              </div>
            );
          })
        )}

        <div style={styles.section}>
          <span>Ônibus online</span>
          {activeBuses.length > 0 && (
            <span className="chip chip-online" style={{ fontSize: 10 }}>
              <span className="live-dot" /> ao vivo
            </span>
          )}
        </div>

        {activeBuses.length === 0 ? (
          <div style={styles.emptyState}>
            Nenhum ônibus online no momento.<br />
            <span style={{ fontSize: 11.5, opacity: 0.7 }}>
              Eles aparecem aqui em tempo real quando começam a rodar.
            </span>
          </div>
        ) : (
          activeBuses.map((bus) => {
            const color = routeColorById[bus.routeId] || "#3b82f6";
            const active = selectedBusId === bus.id;
            return (
              <div
                key={bus.id}
                style={styles.busCard(active)}
                onClick={() => onSelectBus(active ? null : bus.id)}
                className="animate-in"
              >
                <div style={styles.busAvatar(color)}>
                  <Bus size={18} />
                </div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={styles.busName}>{bus.driverName}</div>
                  <div style={styles.busMeta}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Users size={11} />
                      {bus.speed > 0 ? `${Math.round(bus.speed)} km/h` : "Parado"}
                    </span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span className="chip chip-online" style={{ padding: "2px 8px" }}>
                      <span className="live-dot" /> ao vivo
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
