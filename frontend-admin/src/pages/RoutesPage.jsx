import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RouteMapEditor from "../components/RouteMapEditor";
import SchedulesEditor, { defaultSchedule, generateDepartures } from "../components/SchedulesEditor";
import RouteSettings from "../components/RouteSettings";
import Toast from "../components/Toast";
import {
  Activity, ArrowUp, ChartBar, ChevronRight, Clock, Compass, Copy, Download,
  Gauge, MapPin, Plus, Route as RouteIcon, Search, Share, Trash, Users
} from "../components/Icons";
import { getRoutes, createRoute, updateRoute, deleteRoute } from "../hooks/api";
import { haversineKm, pathLengthKm, snapToPolyline } from "../lib/geometry";
import { snapPath, snapPoint, snapSegment } from "../lib/routing";
import { exportRouteGeoJSON, openRouteReport, shareRoute } from "../lib/routeActions";

const COLORS = [
  "#f97316", "#06b6d4", "#2563eb", "#eab308",
  "#ec4899", "#a855f7", "#16a34a",
];

const TABS = [
  { id: "view",      label: "Visualizar" },
  { id: "path",      label: "Traçado" },
  { id: "stop",      label: "Paradas" },
  { id: "schedules", label: "Horários" },
  { id: "settings",  label: "Configurações" },
];

// Tolerância para o usuário colocar uma parada perto do traçado (em km).
const STOP_SNAP_THRESHOLD_KM = 0.12; // ~120 m

/* ───── helpers ───── */
function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
}
function nextStopFor(bus, route) {
  if (!bus?.lat || !route?.stops?.length) return null;
  const distances = route.stops.map((s) => haversineKm([bus.lat, bus.lng], [s.lat, s.lng]));
  const idx = distances.indexOf(Math.min(...distances));
  return { stop: route.stops[idx], distKm: distances[idx], idx };
}
function etaMin(bus, route) {
  const next = nextStopFor(bus, route);
  if (!next) return null;
  const speed = bus.speed > 4 ? bus.speed : 18;
  return Math.max(1, Math.round((next.distKm / speed) * 60));
}

const MAX_HISTORY = 60;

export default function RoutesPage({ buses = [], theme = "light" }) {
  const [routes, setRoutes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("view");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState([]); // pilha de snapshots para undo
  const [dirty, setDirty] = useState(false);
  const [draftStopName, setDraftStopName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const selected = routes.find((r) => r.id === selectedId);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getRoutes();
    setRoutes(data);
    if (data.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }

  async function handleNew() {
    const color = COLORS[routes.length % COLORS.length];
    const created = await createRoute({
      name: `Nova Linha ${routes.length + 1}`,
      color,
      stops: [],
      path: [],
      anchors: [],
      schedule: defaultSchedule(),
      active: true,
    });
    setRoutes([...routes, created]);
    setSelectedId(created.id);
    setTab("path");
    setSearch("");
    setDirty(false);
    showToast({
      kind: "info",
      title: "Rota criada",
      message: "Clique no mapa para traçar a linha — ela segue as ruas automaticamente.",
      duration: 5200,
    });
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Excluir a rota "${selected.name}"?`)) return;
    await deleteRoute(selected.id);
    setRoutes(routes.filter((r) => r.id !== selected.id));
    setSelectedId(routes[0]?.id || null);
  }

  async function handleSave() {
    if (!selected) return;
    await updateRoute(selected.id, selected);
    setDirty(false);
  }

  async function handleDuplicate() {
    if (!selected) return;
    const created = await createRoute({
      name: `${selected.name} (cópia)`,
      color: selected.color,
      stops: selected.stops.map((s, i) => ({ ...s, id: `s-${Date.now()}-${i}` })),
      path: selected.path,
      anchors: selected.anchors || [],
      schedule: selected.schedule || defaultSchedule(),
      active: false,
    });
    setRoutes([...routes, created]);
    setSelectedId(created.id);
    showToast({ kind: "success", title: "Rota duplicada", message: `"${created.name}" foi criada como inativa.` });
  }

  function showToast(t) { setToast(t); }

  // Atualiza a rota selecionada (busca pelo id atual para evitar closures stale)
  function patchRoute(routeId, patch) {
    setRoutes((rs) => rs.map((r) => (r.id === routeId ? { ...r, ...patch } : r)));
    setDirty(true);
  }
  function updateSelected(patch) {
    if (!selectedId) return;
    patchRoute(selectedId, patch);
  }

  // ── Histórico (Ctrl+Z) ──────────────────────────────────────────────────────
  // Cada snapshot guarda apenas os campos que sofrem mutação espacial/visual.
  function snapshotOf(r) {
    return {
      id: r.id,
      anchors: r.anchors ? r.anchors.map((p) => [...p]) : [],
      path: r.path ? r.path.map((p) => [...p]) : [],
      stops: r.stops ? r.stops.map((s) => ({ ...s })) : [],
      color: r.color,
      active: r.active,
    };
  }
  function pushHistory() {
    if (!selectedId) return;
    setHistory((h) => {
      const cur = routes.find((r) => r.id === selectedId);
      if (!cur) return h;
      const snap = snapshotOf(cur);
      const next = [...h, snap];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
  }
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setRoutes((rs) => rs.map((r) => (r.id === last.id ? { ...r, ...last } : r)));
      setDirty(true);
      showToast({ kind: "info", title: "Ação desfeita", duration: 1800 });
      return h.slice(0, -1);
    });
  }, []);

  // Limpa o histórico ao trocar de rota
  useEffect(() => {
    setHistory([]);
  }, [selectedId]);

  // Atalho de teclado Ctrl/⌘+Z
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        // Ignora se o usuário está digitando em um input/textarea
        const tag = (e.target?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // ── Snap-to-roads ao adicionar âncoras ──────────────────────────────────────
  async function addWaypoint(pos) {
    if (!selected) return;
    const routeId = selected.id;
    const prevAnchors = selected.anchors?.length ? selected.anchors : (selected.path || []);
    const prevPath = selected.path || [];
    const lastAnchor = prevAnchors[prevAnchors.length - 1];

    pushHistory();

    // Primeira âncora: encaixa na via mais próxima para já nascer alinhada.
    if (!lastAnchor) {
      // Otimista: posiciona no clique
      patchRoute(routeId, { anchors: [pos], path: [pos] });
      setBusy(true);
      try {
        const snapped = await snapPoint(pos);
        patchRoute(routeId, { anchors: [snapped], path: [snapped] });
      } finally {
        setBusy(false);
      }
      return;
    }

    // Otimista: linha reta enquanto o OSRM calcula (com a âncora no clique).
    const tentativeAnchors = [...prevAnchors, pos];
    patchRoute(routeId, { anchors: tentativeAnchors, path: [...prevPath, pos] });

    setBusy(true);
    try {
      const seg = await snapSegment(lastAnchor, pos);
      // O endpoint do segmento JÁ é a versão snapada do clique → vira a âncora real.
      const snappedEnd = seg[seg.length - 1];
      setRoutes((rs) =>
        rs.map((r) => {
          if (r.id !== routeId) return r;
          const finalAnchors = [...prevAnchors, snappedEnd];
          return { ...r, anchors: finalAnchors, path: [...prevPath, ...seg.slice(1)] };
        })
      );
      setDirty(true);
    } finally {
      setBusy(false);
    }
  }

  async function removeWaypoint(idx) {
    if (!selected) return;
    const routeId = selected.id;
    const prevAnchors = selected.anchors?.length ? selected.anchors : (selected.path || []);
    if (idx < 0 || idx >= prevAnchors.length) return;

    pushHistory();

    const newAnchors = prevAnchors.filter((_, i) => i !== idx);

    // Sem âncoras: limpa o traçado.
    if (newAnchors.length === 0) {
      patchRoute(routeId, { anchors: [], path: [] });
      return;
    }
    // Apenas um ponto: sem segmentos para calcular.
    if (newAnchors.length === 1) {
      patchRoute(routeId, { anchors: newAnchors, path: [newAnchors[0]] });
      return;
    }

    setBusy(true);
    try {
      const snapped = await snapPath(newAnchors);
      patchRoute(routeId, { anchors: newAnchors, path: snapped });
    } finally {
      setBusy(false);
    }
  }

  // Move uma âncora: encaixa na via mais próxima e recomputa todo o traçado.
  async function moveWaypoint(idx, newPos) {
    if (!selected) return;
    const routeId = selected.id;
    const prevAnchors = selected.anchors?.length
      ? [...selected.anchors]
      : [...(selected.path || [])];
    if (idx < 0 || idx >= prevAnchors.length) return;

    pushHistory();

    // Otimista: linha reta até o cálculo terminar
    prevAnchors[idx] = newPos;
    patchRoute(routeId, { anchors: prevAnchors });

    setBusy(true);
    try {
      // Encaixa o novo ponto na via mais próxima
      const snappedAnchor = await snapPoint(newPos);
      const finalAnchors = [...prevAnchors];
      finalAnchors[idx] = snappedAnchor;

      // Recomputa os segmentos afetados (idx-1 → idx e idx → idx+1)
      const path = await snapPath(finalAnchors);
      patchRoute(routeId, { anchors: finalAnchors, path });
    } finally {
      setBusy(false);
    }
  }

  // ── Adicionar parada restrita ao traçado ────────────────────────────────────
  function addStop(pos) {
    if (!selected) return;
    if (!selected.path || selected.path.length < 2) {
      showToast({
        kind: "error",
        title: "Trace a linha primeiro",
        message: "Adicione pelo menos dois pontos no Traçado antes de colocar paradas.",
      });
      return;
    }

    const snap = snapToPolyline(pos, selected.path);
    if (!snap || snap.distKm > STOP_SNAP_THRESHOLD_KM) {
      showToast({
        kind: "error",
        title: "Clique sobre o traçado",
        message: `A parada precisa estar a menos de ${Math.round(STOP_SNAP_THRESHOLD_KM * 1000)} m da linha.`,
      });
      return;
    }

    pushHistory();

    const [lat, lng] = snap.point;
    // Calcula uma "distância acumulada" para inserir a parada na ordem correta.
    const orderKey = snap.segIdx + snap.t;
    const existing = (selected.stops || []).map((s) => {
      const sSnap = snapToPolyline([s.lat, s.lng], selected.path);
      return { stop: s, key: sSnap ? sSnap.segIdx + sSnap.t : Number.POSITIVE_INFINITY };
    });

    const name = draftStopName.trim() || `Parada ${selected.stops.length + 1}`;
    const newStop = { id: `s-${Date.now()}`, name, lat, lng, order: 0 };
    const merged = [...existing, { stop: newStop, key: orderKey }]
      .sort((a, b) => a.key - b.key)
      .map(({ stop }, i) => ({ ...stop, order: i }));

    patchRoute(selected.id, { stops: merged });
    setDraftStopName("");
  }

  function removeStop(id) {
    if (!selected) return;
    pushHistory();
    const filtered = selected.stops.filter((s) => s.id !== id);
    const renumbered = filtered.map((s, i) => ({ ...s, order: i }));
    updateSelected({ stops: renumbered });
  }

  // Move uma parada: encaixa na polilinha e re-ordena automaticamente.
  function moveStop(id, newPos) {
    if (!selected) return;
    if (!selected.path || selected.path.length < 2) return;

    const snap = snapToPolyline(newPos, selected.path);
    if (!snap) return;

    pushHistory();

    const [lat, lng] = snap.point;
    const orderKey = snap.segIdx + snap.t;

    const others = selected.stops
      .filter((s) => s.id !== id)
      .map((s) => {
        const sSnap = snapToPolyline([s.lat, s.lng], selected.path);
        return { stop: s, key: sSnap ? sSnap.segIdx + sSnap.t : Number.POSITIVE_INFINITY };
      });

    const moved = selected.stops.find((s) => s.id === id);
    if (!moved) return;

    const merged = [...others, { stop: { ...moved, lat, lng }, key: orderKey }]
      .sort((a, b) => a.key - b.key)
      .map(({ stop }, i) => ({ ...stop, order: i }));

    patchRoute(selected.id, { stops: merged });
  }

  function renameStop(id, name) {
    if (!selected) return;
    const clean = (name || "").trim();
    if (!clean) return;
    pushHistory();
    const stops = selected.stops.map((s) => (s.id === id ? { ...s, name: clean } : s));
    updateSelected({ stops });
  }

  // ── Reset de campos a partir das configurações ──────────────────────────────
  function resetRouteField(kind) {
    if (!selected) return;
    pushHistory();
    if (kind === "path") {
      updateSelected({ path: [], anchors: [] });
      showToast({ kind: "info", title: "Traçado resetado", message: "Redesenhe a linha na aba Traçado." });
    } else if (kind === "stops") {
      updateSelected({ stops: [] });
      showToast({ kind: "info", title: "Paradas removidas" });
    } else if (kind === "schedule") {
      updateSelected({ schedule: defaultSchedule() });
      showToast({ kind: "info", title: "Horários resetados", message: "Voltou para a configuração padrão." });
    }
  }

  // ── Ações rápidas ───────────────────────────────────────────────────────────
  async function handleExport() {
    if (!selected) return;
    if (!selected.path || selected.path.length < 2) {
      showToast({ kind: "error", title: "Rota vazia", message: "Adicione o traçado antes de exportar." });
      return;
    }
    exportRouteGeoJSON(selected);
    showToast({ kind: "success", title: "Exportado", message: "GeoJSON salvo na sua pasta de downloads." });
  }
  function handleReport() {
    if (!selected) return;
    openRouteReport(selected);
  }
  async function handleShare() {
    if (!selected) return;
    const r = await shareRoute(selected);
    if (r === "shared")   showToast({ kind: "success", title: "Compartilhado" });
    if (r === "copied")   showToast({ kind: "success", title: "Resumo copiado", message: "Cole onde quiser compartilhar." });
    if (r === "failed")   showToast({ kind: "error",   title: "Não foi possível copiar" });
    // 'cancelled' não mostra nada
  }

  /* ───── derived ───── */
  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((r) => r.name.toLowerCase().includes(q));
  }, [routes, search]);

  const lineBuses = useMemo(
    () => buses.filter((b) => b.online && b.lat && b.routeId === selectedId),
    [buses, selectedId]
  );

  const extensionKm = useMemo(
    () => (selected ? pathLengthKm(selected.path) : 0),
    [selected?.path]
  );

  const focusedBus = lineBuses[0];

  return (
    <div style={S.wrap}>
      {/* ─────────────── Sidebar ─────────────── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <div>
            <div style={S.sidebarTitle}>Rotas</div>
            <div style={S.sidebarSub}>{routes.length} rotas cadastradas</div>
          </div>
        </div>

        <div style={{ padding: "0 18px 12px" }}>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleNew}>
            <Plus size={16} /> Nova rota
          </button>
        </div>

        <div style={{ padding: "0 18px 14px", position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              right: 30,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            className="input"
            placeholder="Buscar rota"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={S.sectionLabel}>Linhas ativas</div>

        <div style={S.routeList}>
          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={S.skeleton} />
            ))
          ) : filteredRoutes.length === 0 ? (
            <div style={S.empty}>Nenhuma rota encontrada</div>
          ) : (
            filteredRoutes.map((r) => {
              const isActive = r.id === selectedId;
              const onlineHere = buses.filter((b) => b.online && b.lat && b.routeId === r.id).length;
              return (
                <button
                  key={r.id}
                  style={S.routeCard(isActive)}
                  className="animate-in"
                  onClick={() => {
                    setSelectedId(r.id);
                    setTab("view");
                    setDirty(false);
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={S.routeColorBar(r.color)} />
                  <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
                    <div style={S.routeName}>{r.name}</div>
                    <div style={S.routeMeta}>
                      {(r.stops?.length || 0)} paradas
                      <span style={{ opacity: 0.5 }}>•</span>
                      {(r.path?.length || 0)} pontos
                      {onlineHere > 0 && (
                        <>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>
                            {onlineHere} ativo{onlineHere > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`chip ${r.active ? "chip-success" : "chip-muted"}`}>
                    {r.active ? "Ativa" : "Inativa"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div style={S.sidebarFooter}>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "space-between" }}
            onClick={() => {
              setSearch("");
              if (routes.length > 0 && !selectedId) {
                setSelectedId(routes[0].id);
              }
            }}
            disabled={!search && filteredRoutes.length === routes.length}
          >
            {search ? "Limpar filtro" : "Ver todas as linhas"} <ChevronRight size={14} />
          </button>
        </div>
      </aside>

      {/* ─────────────── Main ─────────────── */}
      <main style={S.main}>
        {selected ? (
          <>
            <div style={S.mainHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <input
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  style={S.titleInput}
                />
                <span className={`chip ${selected.active ? "chip-success" : "chip-muted"}`}>
                  {selected.active ? "Ativa" : "Inativa"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={undo}
                  disabled={history.length === 0}
                  title="Desfazer (Ctrl+Z)"
                  style={{
                    opacity: history.length === 0 ? 0.45 : 1,
                    cursor: history.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>
                  </svg>
                  Desfazer
                </button>

                <div style={S.colorPicker}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      style={S.colorDot(c, c === selected.color)}
                      onClick={() => {
                        pushHistory();
                        updateSelected({ color: c });
                      }}
                      title={c}
                    />
                  ))}
                </div>

                <label style={S.activeToggle}>
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(e) => {
                      pushHistory();
                      updateSelected({ active: e.target.checked });
                    }}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Ativa
                </label>

                {dirty && (
                  <button className="btn btn-success" onClick={handleSave}>
                    Salvar
                  </button>
                )}
                <button className="btn btn-danger" onClick={handleDelete}>
                  <Trash size={14} /> Excluir
                </button>
              </div>
            </div>

            <div style={S.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={S.tabBtn(tab === t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={S.mapWrap}>
              {tab === "schedules" ? (
                <SchedulesEditor
                  route={selected}
                  onChange={(schedule) => updateSelected({ schedule })}
                />
              ) : tab === "settings" ? (
                <RouteSettings
                  route={selected}
                  onChange={(patch) => updateSelected(patch)}
                  onReset={resetRouteField}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onStopRename={renameStop}
                  onStopRemove={removeStop}
                  onWaypointRemove={removeWaypoint}
                  onJumpToMap={(t) => setTab(t)}
                />
              ) : (
                <RouteMapEditor
                  route={selected}
                  mode={tab}
                  onAddWaypoint={addWaypoint}
                  onAddStop={addStop}
                  onRemoveWaypoint={removeWaypoint}
                  onRemoveStop={removeStop}
                  onMoveWaypoint={moveWaypoint}
                  onMoveStop={moveStop}
                  onRenameStop={renameStop}
                  buses={buses}
                  theme={theme}
                  busy={busy}
                />
              )}

              {/* Indicador flutuante topo central — só sobre o mapa */}
              {tab !== "schedules" && tab !== "settings" && (
                <div style={S.mapHint}>
                  {tab === "path" && (
                    <>
                      Clique para adicionar · <strong style={{ color: "var(--text)" }}>arraste</strong> para mover
                      <span style={{ opacity: 0.5 }}>•</span>
                      <kbd style={S.kbd}>Ctrl</kbd>+<kbd style={S.kbd}>Z</kbd> desfaz
                    </>
                  )}
                  {tab === "stop" && (
                    <>
                      Clique <strong style={{ color: "var(--text)" }}>sobre o traçado</strong> · arraste para mover · clique para renomear
                    </>
                  )}
                  {tab === "view" && (
                    <>
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>
                        {selected.path?.length || 0}
                      </span>{" "}
                      pontos no trajeto
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>
                        {selected.stops?.length || 0}
                      </span>{" "}
                      paradas
                    </>
                  )}
                </div>
              )}

              {/* Card flutuante do ônibus em destaque */}
              {focusedBus && tab === "view" && (
                <FocusedBusCard
                  bus={focusedBus}
                  route={selected}
                  busesOnLine={lineBuses.length}
                />
              )}

              {tab === "stop" && (
                <div style={S.stopNameWrap}>
                  <input
                    className="input"
                    placeholder="Nome da próxima parada"
                    value={draftStopName}
                    onChange={(e) => setDraftStopName(e.target.value)}
                    style={{ width: 240 }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={S.placeholder}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--primary-soft)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <RouteIcon size={26} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>
              Nenhuma rota selecionada
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 4 }}>
              Selecione uma rota na lateral ou crie uma nova para começar
            </div>
          </div>
        )}
      </main>

      {/* ─────────────── Right panel ─────────────── */}
      <aside style={S.right}>
        {selected ? (
          <RightPanel
            route={selected}
            extensionKm={extensionKm}
            lineBuses={lineBuses}
            onDuplicate={handleDuplicate}
            onExport={handleExport}
            onReport={handleReport}
            onShare={handleShare}
          />
        ) : (
          <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>
            Selecione uma rota para ver as informações
          </div>
        )}
      </aside>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ───────────────── Floating bus card ───────────────── */
function FocusedBusCard({ bus, route, busesOnLine }) {
  const next = nextStopFor(bus, route);
  const eta = etaMin(bus, route);
  const lotacao = (() => {
    if (!bus.speed || bus.speed < 1) return { label: "Embarcando", chip: "chip-warn" };
    if (bus.speed > 40) return { label: "Tranquilo", chip: "chip-success" };
    if (bus.speed > 15) return { label: "Média", chip: "chip-accent" };
    return { label: "Movimentado", chip: "chip-info" };
  })();

  const progress = next
    ? Math.min(1, (next.idx + 1) / Math.max(1, route.stops.length))
    : 0;

  return (
    <div className="glass slide-in-up" style={S.busCard}>
      <div style={S.busCardHeader}>
        <div style={S.busAvatar(route.color)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="15" rx="3"/>
            <path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/>
          </svg>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={S.busName}>{bus.driverName || "Ônibus 101"}</div>
          <div style={S.busMeta}>
            Última atualização: {formatTime(bus.lastUpdate || new Date().toISOString())}
          </div>
        </div>
        <span className="chip chip-success">
          <span className="live-dot" /> Online
        </span>
      </div>

      <div style={S.busStats}>
        <div style={S.busStat}>
          <div style={S.busStatLabel}>
            <Gauge size={11} /> Velocidade
          </div>
          <div style={S.busStatValue}>
            {bus.speed ? Math.round(bus.speed) : 0}{" "}
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
              km/h
            </span>
          </div>
        </div>
        <div style={S.busStat}>
          <div style={S.busStatLabel}>
            <Users size={11} /> Lotação
          </div>
          <div style={S.busStatValue}>
            <span className={`chip ${lotacao.chip}`} style={{ fontSize: 11 }}>
              {lotacao.label}
            </span>
          </div>
        </div>
        <div style={S.busStat}>
          <div style={S.busStatLabel}>
            <Compass size={11} /> Direção
          </div>
          <div style={S.busStatValue}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
              <path d="m7 17 10-10M7 7h10v10"/>
            </svg>
            <span style={{ fontSize: 13 }}>{next?.stop?.name?.split(" ")[0] || "Terminal"}</span>
          </div>
        </div>
      </div>

      <div style={S.busEta}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Chega em
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--accent)", letterSpacing: "-0.02em" }}>
            {eta ?? "—"} min
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Próxima parada:{" "}
          <strong style={{ color: "var(--primary)" }}>
            {next?.stop?.name || "—"}
          </strong>
        </div>

        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progress * 100}%`, background: route.color }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          {Math.max(0, route.stops.length - (next?.idx ?? 0) - 1)} paradas restantes
          <span style={{ opacity: 0.5, margin: "0 6px" }}>•</span>
          {next ? `${(next.distKm * 1000).toFixed(0)} m` : ""}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Right panel ───────────────── */
function RightPanel({ route, extensionKm, lineBuses, onDuplicate, onExport, onReport, onShare }) {
  const lastUpdate = lineBuses
    .map((b) => b.lastUpdate)
    .filter(Boolean)
    .sort()
    .pop();

  // Total de partidas por dia útil (referência mais comum)
  const departuresPerDay = useMemo(() => {
    if (!route.schedule?.weekday) return 0;
    return generateDepartures(route.schedule.weekday).length;
  }, [route.schedule]);

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="chip chip-success">
          <span className="live-dot" /> Online
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
        {/* Resumo da Linha */}
        <div className="card" style={S.summaryCard}>
          <div style={S.summaryHeader}>
            <Activity size={14} style={{ color: "var(--primary)" }} />
            <span>Resumo da Linha</span>
          </div>
          <div style={S.summaryGrid}>
            <SummaryItem value={route.stops.length} label="Paradas" />
            <SummaryItem value={route.path.length} label="Pontos" />
            <SummaryItem value={`${extensionKm.toFixed(1)} km`} label="Extensão" small />
            <SummaryItem value={lineBuses.length} label="Ônibus ativos" />
            <SummaryItem value={departuresPerDay || "—"} label="Partidas/dia útil" small />
            <SummaryItem value={formatTime(lastUpdate)} label="Atualizado" small />
          </div>
        </div>

        {/* Ônibus na linha */}
        <div className="card" style={S.busesCard}>
          <div style={S.summaryHeader}>
            <Clock size={14} style={{ color: "var(--primary)" }} />
            <span>Ônibus na linha</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
              {lineBuses.length} ativo{lineBuses.length !== 1 ? "s" : ""}
            </span>
          </div>

          {lineBuses.length === 0 ? (
            <div style={S.busesEmpty}>
              Nenhum ônibus rodando esta linha agora.
            </div>
          ) : (
            <div style={S.busesList}>
              {lineBuses.map((b) => {
                const next = nextStopFor(b, route);
                const eta = etaMin(b, route);
                return (
                  <div key={b.id} style={S.busRow}>
                    <div style={S.busRowAvatar(route.color)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="3" width="16" height="15" rx="3"/>
                        <path d="M4 10h16M8 18v2M16 18v2"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={S.busRowName}>{b.driverName}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                          {b.speed ? `${Math.round(b.speed)} km/h` : "0 km/h"}
                        </span>
                      </div>
                      <div style={S.busRowSub}>
                        {eta ? `Chega em ${eta} min` : "Calculando…"}
                        {next && (
                          <span style={{ opacity: 0.6 }}>
                            {" "}· Próx: {next.stop.name.length > 18 ? next.stop.name.slice(0, 18) + "…" : next.stop.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="live-dot" style={{ marginLeft: 4 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="card" style={S.actionsCard}>
          <div style={S.summaryHeader}>
            <span>Ações rápidas</span>
          </div>
          <div style={S.actionsGrid}>
            <ActionButton icon={<Download size={16} />} label="Exportar rota" onClick={onExport} />
            <ActionButton icon={<Copy size={16} />}     label="Duplicar rota" onClick={onDuplicate} />
            <ActionButton icon={<ChartBar size={16} />} label="Relatório"     onClick={onReport} />
            <ActionButton icon={<Share size={16} />}    label="Compartilhar"  onClick={onShare} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ value, label, small }) {
  return (
    <div style={S.summaryItem}>
      <div style={small ? S.summaryValueSmall : S.summaryValue}>{value}</div>
      <div style={S.summaryLabel}>{label}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={S.actionBtn}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--hover)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={S.actionIcon}>{icon}</div>
      <span style={S.actionLabel}>{label}</span>
    </button>
  );
}

/* ───────────────── Styles ───────────────── */
const S = {
  wrap: {
    display: "flex",
    height: "calc(100vh - var(--topbar-h))",
    marginTop: "var(--topbar-h)",
  },

  sidebar: {
    width: "var(--sidebar-w)",
    background: "var(--surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: "22px 22px 14px",
  },
  sidebarTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  sidebarSub: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    marginTop: 3,
  },
  sectionLabel: {
    padding: "4px 22px 8px",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  routeList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  empty: {
    padding: "20px 8px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: 12.5,
  },
  skeleton: {
    margin: "4px 0",
    height: 58,
    borderRadius: 12,
  },
  routeCard: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 13,
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? "rgba(249,115,22,0.35)" : "transparent"}`,
    boxShadow: active ? "0 6px 16px -8px rgba(249,115,22,0.35)" : "none",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.18s ease",
  }),
  routeColorBar: (color) => ({
    width: 4,
    alignSelf: "stretch",
    minHeight: 28,
    borderRadius: 4,
    background: color,
    flexShrink: 0,
  }),
  routeName: {
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  routeMeta: {
    marginTop: 3,
    fontSize: 11.5,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  sidebarFooter: {
    padding: "12px 18px 18px",
    borderTop: "1px solid var(--border)",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    minWidth: 0,
  },
  mainHeader: {
    height: 64,
    padding: "0 24px",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  titleInput: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 8,
    padding: "6px 10px",
    minWidth: 280,
    outline: "none",
    transition: "all 0.18s ease",
  },
  colorPicker: {
    display: "flex",
    gap: 4,
    padding: "4px 6px",
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
  },
  colorDot: (c, selected) => ({
    width: 22,
    height: 22,
    borderRadius: 6,
    background: c,
    border: selected ? "2px solid var(--text)" : "2px solid transparent",
    outline: selected ? "2px solid var(--surface)" : "none",
    outlineOffset: -4,
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  activeToggle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "0 12px",
    height: 38,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface-soft)",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-soft)",
    cursor: "pointer",
  },

  tabs: {
    display: "flex",
    gap: 4,
    padding: "12px 24px 0",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
  },
  tabBtn: (active) => ({
    position: "relative",
    padding: "12px 14px",
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 600,
    color: active ? "var(--accent)" : "var(--text-muted)",
    background: "transparent",
    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
    marginBottom: -1,
    transition: "all 0.18s ease",
  }),

  mapWrap: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  mapHint: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 14px",
    borderRadius: 999,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-md)",
    fontSize: 12.5,
    color: "var(--text-muted)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    zIndex: 800,
  },
  kbd: {
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: 5,
    background: "var(--surface-soft)",
    border: "1px solid var(--border-strong)",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-soft)",
    boxShadow: "0 1px 0 var(--border-strong)",
    lineHeight: 1.4,
  },
  stopNameWrap: {
    position: "absolute",
    top: 60,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 800,
  },

  /* Floating bus card */
  busCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 360,
    padding: 0,
    overflow: "hidden",
    zIndex: 800,
    border: "1px solid var(--border-strong)",
  },
  busCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
  },
  busAvatar: (color) => ({
    width: 40,
    height: 40,
    borderRadius: 11,
    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexShrink: 0,
    boxShadow: `0 6px 16px -4px ${color}66`,
  }),
  busName: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 14,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  busMeta: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginTop: 2,
  },
  busStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 1,
    background: "var(--border)",
    borderBottom: "1px solid var(--border)",
  },
  busStat: {
    padding: "12px 14px",
    background: "var(--surface)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  busStatLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  busStatValue: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 14.5,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  busEta: {
    padding: "14px 16px 16px",
    background: "var(--surface)",
  },
  progressTrack: {
    marginTop: 12,
    width: "100%",
    height: 6,
    borderRadius: 999,
    background: "var(--hover-strong)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
  },

  /* Right panel */
  right: {
    width: "var(--right-w)",
    background: "var(--bg)",
    borderLeft: "1px solid var(--border)",
    flexShrink: 0,
    overflow: "hidden",
  },
  summaryCard: { padding: 16 },
  summaryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13.5,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  summaryValue: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 20,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
  },
  summaryValueSmall: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  summaryLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 500,
    marginTop: 2,
  },

  busesCard: { padding: 16 },
  busesEmpty: {
    padding: "16px 8px",
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    border: "1.5px dashed var(--border-strong)",
    borderRadius: 10,
  },
  busesList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  busRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 11,
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    transition: "all 0.18s ease",
  },
  busRowAvatar: (color) => ({
    width: 30,
    height: 30,
    borderRadius: 9,
    background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -18)} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexShrink: 0,
  }),
  busRowName: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 12.5,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  busRowSub: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 2,
  },

  actionsCard: { padding: 16 },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 11,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-soft)",
    transition: "all 0.18s ease",
    cursor: "pointer",
    minWidth: 0,
    width: "100%",
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: "var(--primary-soft)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-soft)",
    fontFamily: "var(--font-display)",
    textAlign: "left",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
    flex: 1,
  },

  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
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
