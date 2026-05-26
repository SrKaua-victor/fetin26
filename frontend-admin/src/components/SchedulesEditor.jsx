import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Bus,
  ChartBar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  Eye,
  Gauge,
  Layers,
  Plus,
  Route as RouteIcon,
  Settings as SettingsIcon,
  Trash,
  Users,
  X,
} from "./Icons";

/* ─────────────────────────────────────────────────────────────────────────────
   Schema (com migração automática do formato antigo)

   route.schedule = {
     [dayId]: {
       enabled: boolean,
       bands: [{ id, name, start, end, intervalMin, color }],
       extra: [{ time, kind: "extra" | "reinforce" }]
     }
   }
   ───────────────────────────────────────────────────────────────────────────── */

const DAY_GROUPS = [
  { id: "weekday",  label: "Segunda a Sexta",     short: "Seg–Sex" },
  { id: "saturday", label: "Sábado",              short: "Sáb" },
  { id: "sunday",   label: "Domingo",             short: "Dom" },
  { id: "holiday",  label: "Feriados",            short: "Feriado" },
  { id: "special",  label: "Operação Especial",   short: "Especial" },
  { id: "event",    label: "Eventos",             short: "Evento" },
];

const BAND_COLORS = [
  "#f97316", "#2563eb", "#a855f7", "#16a34a",
  "#0ea5e9", "#ef4444", "#eab308", "#ec4899",
];

const SEVERITY = {
  info:    { color: "var(--primary)",  soft: "var(--primary-soft)" },
  warn:    { color: "#b45309",         soft: "var(--warn-soft)"    },
  danger:  { color: "var(--danger)",   soft: "var(--danger-soft)"  },
  success: { color: "var(--success)",  soft: "var(--success-soft)" },
};

/* ───── helpers de tempo ───── */
function pad(n) { return String(n).padStart(2, "0"); }
function timeToMin(t) {
  if (!t || typeof t !== "string") return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minToTime(min) {
  min = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
function fmtDuration(min) {
  if (!min || min <= 0) return "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  if (!m) return `${h}h`;
  return `${h}h${pad(m)}`;
}

/* ───── normalização (compatível com schema antigo) ───── */
function normalizeExtra(extra = []) {
  return (extra || []).map((e) =>
    typeof e === "string" ? { time: e, kind: "extra" } : { kind: "extra", ...e }
  );
}
function normalizeDay(cfg) {
  if (!cfg) {
    return { enabled: false, bands: [], extra: [] };
  }
  if (Array.isArray(cfg.bands)) {
    return { enabled: !!cfg.enabled, bands: cfg.bands, extra: normalizeExtra(cfg.extra) };
  }
  // schema antigo: { start, end, intervalMin }
  const band = {
    id: "band-legacy",
    name: "Operação padrão",
    start: cfg.start || "06:00",
    end: cfg.end || "22:00",
    intervalMin: Number(cfg.intervalMin) || 15,
    color: BAND_COLORS[1],
  };
  return { enabled: !!cfg.enabled, bands: [band], extra: normalizeExtra(cfg.extra) };
}

export function defaultSchedule() {
  const mk = (bands, enabled = true) => ({ enabled, bands, extra: [] });
  return {
    weekday: mk([
      { id: "b-morning", name: "Pico Manhã", start: "06:00", end: "09:00", intervalMin: 10, color: BAND_COLORS[0] },
      { id: "b-mid",     name: "Entre Pico", start: "09:00", end: "17:00", intervalMin: 20, color: BAND_COLORS[1] },
      { id: "b-evening", name: "Pico Noite", start: "17:00", end: "20:00", intervalMin: 8,  color: BAND_COLORS[2] },
      { id: "b-night",   name: "Noturno",    start: "20:00", end: "23:00", intervalMin: 30, color: BAND_COLORS[4] },
    ]),
    saturday: mk([
      { id: "b-sat", name: "Operação Sábado", start: "06:00", end: "22:00", intervalMin: 20, color: BAND_COLORS[3] },
    ]),
    sunday:  mk([
      { id: "b-sun", name: "Operação Domingo", start: "07:00", end: "22:00", intervalMin: 30, color: "#64748b" },
    ], false),
    holiday: mk([
      { id: "b-hol", name: "Feriado", start: "07:00", end: "22:00", intervalMin: 30, color: BAND_COLORS[5] },
    ], false),
    special: mk([
      { id: "b-spe", name: "Operação Especial", start: "07:00", end: "22:00", intervalMin: 30, color: BAND_COLORS[0] },
    ], false),
    event: mk([
      { id: "b-evt", name: "Evento", start: "12:00", end: "23:00", intervalMin: 15, color: BAND_COLORS[2] },
    ], false),
  };
}

export function generateDepartures(cfg) {
  const day = normalizeDay(cfg);
  if (!day.enabled) return [];
  const set = new Set();
  (day.bands || []).forEach((b) => {
    const sm = timeToMin(b.start);
    const em = timeToMin(b.end);
    const step = Math.max(1, Number(b.intervalMin) || 1);
    if (em >= sm) {
      for (let m = sm; m <= em; m += step) set.add(minToTime(m));
    }
  });
  (day.extra || []).forEach((e) => set.add(e.time));
  return [...set].sort();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────────────────────────────────────── */
export default function SchedulesEditor({ route, onChange }) {
  const initial = useMemo(() => {
    const raw = route?.schedule || defaultSchedule();
    const out = {};
    DAY_GROUPS.forEach((g) => { out[g.id] = normalizeDay(raw[g.id]); });
    return out;
  }, [route?.id]);

  const [schedule, setSchedule] = useState(initial);
  const [activeDay, setActiveDay] = useState("weekday");
  const [expanded, setExpanded] = useState({});
  const [editingBand, setEditingBand] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [simMin, setSimMin] = useState(0);

  // sincroniza com o pai
  useEffect(() => { setSchedule(initial); }, [initial]);
  const commit = (next) => { setSchedule(next); onChange?.(next); };

  const day = schedule[activeDay] || normalizeDay(null);
  const dayMeta = DAY_GROUPS.find((g) => g.id === activeDay);

  /* ─── mutações ─── */
  function patchDay(dayId, patch) {
    commit({ ...schedule, [dayId]: { ...schedule[dayId], ...patch } });
  }
  function addBand() {
    const used = day.bands.length;
    const newBand = {
      id: `band-${Date.now()}`,
      name: `Faixa ${used + 1}`,
      start: "12:00",
      end: "14:00",
      intervalMin: 15,
      color: BAND_COLORS[used % BAND_COLORS.length],
    };
    patchDay(activeDay, { bands: [...day.bands, newBand] });
    setExpanded((e) => ({ ...e, [newBand.id]: true }));
    setEditingBand(newBand.id);
  }
  function patchBand(bandId, patch) {
    patchDay(activeDay, {
      bands: day.bands.map((b) => (b.id === bandId ? { ...b, ...patch } : b)),
    });
  }
  function removeBand(bandId) {
    patchDay(activeDay, { bands: day.bands.filter((b) => b.id !== bandId) });
  }
  function addExtra(time, kind = "extra") {
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    if (day.extra.some((e) => e.time === time)) return;
    patchDay(activeDay, {
      extra: [...day.extra, { time, kind }].sort((a, b) => a.time.localeCompare(b.time)),
    });
  }
  function patchExtra(time, patch) {
    patchDay(activeDay, {
      extra: day.extra.map((e) => (e.time === time ? { ...e, ...patch } : e))
        .sort((a, b) => a.time.localeCompare(b.time)),
    });
  }
  function removeExtra(time) {
    patchDay(activeDay, { extra: day.extra.filter((e) => e.time !== time) });
  }
  function copyDayTo(targetIds) {
    const src = day;
    const next = { ...schedule };
    targetIds.forEach((id) => {
      next[id] = {
        enabled: true,
        bands: src.bands.map((b, i) => ({ ...b, id: `band-${id}-${i}-${Date.now()}` })),
        extra: [...src.extra],
      };
    });
    commit(next);
    setShowTemplates(false);
  }

  /* ─── métricas ─── */
  const metrics = useMemo(() => computeMetrics(day, route), [day, route?.path]);
  const alerts = useMemo(() => computeAlerts(day, metrics), [day, metrics]);
  const departures = useMemo(() => generateDepartures(day), [day]);

  /* ─── simulação ─── */
  const rafRef = useRef(null);
  useEffect(() => {
    if (!simRunning) return;
    let last = performance.now();
    setSimMin(metrics.windowStart);
    const tick = (now) => {
      const dt = now - last;
      last = now;
      setSimMin((m) => {
        const next = m + (dt / 1000) * 30; // 30 minutos por segundo
        if (next >= metrics.windowEnd) {
          setSimRunning(false);
          return metrics.windowEnd;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [simRunning, metrics.windowStart, metrics.windowEnd]);

  const operating = day.enabled && departures.length > 0;

  return (
    <div style={S.wrap}>
      <style>{LOCAL_CSS}</style>

      {/* ─── Header ─── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitleRow}>
            <span style={S.iconBadge}>
              <Clock size={16} />
            </span>
            <h2 style={S.title}>Centro de Controle Operacional</h2>
            <StatusPill operating={operating} />
          </div>
          <p style={S.subtitle}>
            Configure faixas horárias, monitore métricas em tempo real e simule a operação
            da <strong style={{ color: "var(--text)" }}>{route?.name || "linha"}</strong>.
          </p>
        </div>

        <div style={S.headerRight}>
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-ghost se-btn-icon"
              onClick={() => setShowTemplates((s) => !s)}
              title="Copiar / templates"
            >
              <Layers size={14} /> Templates
              <ChevronDown size={12} />
            </button>
            {showTemplates && (
              <TemplatesMenu
                activeDay={activeDay}
                onClose={() => setShowTemplates(false)}
                onCopy={copyDayTo}
              />
            )}
          </div>
          <button
            className={`btn ${simRunning ? "btn-danger" : "btn-primary"} se-sim-btn`}
            onClick={() => setSimRunning((s) => !s)}
            disabled={!operating}
          >
            {simRunning ? (
              <><span className="se-pulse-mini" /> Parar simulação</>
            ) : (
              <><Bus size={14} /> Simular operação</>
            )}
          </button>
        </div>
      </header>

      {/* ─── Day tabs ─── */}
      <DayTabs
        schedule={schedule}
        activeDay={activeDay}
        onSelect={setActiveDay}
        onToggle={(id, on) => patchDay(id, { enabled: on })}
      />

      {/* ─── Grid principal ─── */}
      <div style={S.grid}>
        {/* ── Coluna principal ── */}
        <div style={S.mainCol}>
          {/* Day header */}
          <div style={S.dayHeader} className="animate-in">
            <div>
              <div style={S.dayHeaderLabel}>{dayMeta?.label}</div>
              <div style={S.dayHeaderSub}>
                {day.enabled
                  ? `${departures.length} partida${departures.length !== 1 ? "s" : ""} · ${day.bands.length} faixa${day.bands.length !== 1 ? "s" : ""} operacional${day.bands.length !== 1 ? "is" : ""}`
                  : "Operação desativada neste dia"}
              </div>
            </div>
            <label style={S.dayToggle(day.enabled)}>
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => patchDay(activeDay, { enabled: e.target.checked })}
                style={{ display: "none" }}
              />
              <span style={S.dayToggleDot(day.enabled)} />
              {day.enabled ? "Operando" : "Pausada"}
            </label>
          </div>

          {/* Bands */}
          <section style={S.section} className="animate-in">
            <div style={S.sectionHead}>
              <div style={S.sectionTitleWrap}>
                <SettingsIcon size={14} style={{ color: "var(--text-muted)" }} />
                <h3 style={S.sectionTitle}>Faixas Operacionais</h3>
                <span style={S.sectionCount}>{day.bands.length}</span>
              </div>
              <button className="btn btn-ghost se-btn-icon" onClick={addBand} disabled={!day.enabled}>
                <Plus size={13} /> Nova faixa
              </button>
            </div>

            <div style={S.bandsList}>
              {day.bands.length === 0 && (
                <div style={S.emptyState}>
                  Nenhuma faixa configurada. Clique em <strong>Nova faixa</strong> para começar.
                </div>
              )}
              {day.bands.map((b) => (
                <BandCard
                  key={b.id}
                  band={b}
                  expanded={!!expanded[b.id]}
                  editing={editingBand === b.id}
                  disabled={!day.enabled}
                  onToggle={() => setExpanded((e) => ({ ...e, [b.id]: !e[b.id] }))}
                  onEdit={() => setEditingBand(editingBand === b.id ? null : b.id)}
                  onChange={(patch) => patchBand(b.id, patch)}
                  onRemove={() => removeBand(b.id)}
                />
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section style={S.section} className="animate-in">
            <div style={S.sectionHead}>
              <div style={S.sectionTitleWrap}>
                <Activity size={14} style={{ color: "var(--text-muted)" }} />
                <h3 style={S.sectionTitle}>Timeline Operacional</h3>
                {simRunning && (
                  <span style={S.liveTag}>
                    <span className="live-dot" /> AO VIVO · {minToTime(simMin)}
                  </span>
                )}
              </div>
              <div style={S.legendRow}>
                {day.bands.slice(0, 4).map((b) => (
                  <span key={b.id} style={S.legendItem}>
                    <span style={{ ...S.legendDot, background: b.color }} />
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
            <Timeline
              day={day}
              departures={departures}
              extras={day.extra}
              simRunning={simRunning}
              simMin={simMin}
              windowStart={metrics.windowStart}
              windowEnd={metrics.windowEnd}
            />
          </section>

          {/* Manual extras */}
          <section style={S.section} className="animate-in">
            <div style={S.sectionHead}>
              <div style={S.sectionTitleWrap}>
                <Plus size={14} style={{ color: "var(--text-muted)" }} />
                <h3 style={S.sectionTitle}>Partidas Manuais</h3>
                <span style={S.sectionCount}>{day.extra.length}</span>
              </div>
            </div>
            <ManualDepartures
              extras={day.extra}
              disabled={!day.enabled}
              onAdd={addExtra}
              onRemove={removeExtra}
              onPatch={patchExtra}
            />
          </section>
        </div>

        {/* ── Coluna lateral ── */}
        <aside style={S.sideCol}>
          <MetricsPanel metrics={metrics} day={day} simRunning={simRunning} />
          <AlertsPanel alerts={alerts} />
          <DensityPanel departures={departures} windowStart={metrics.windowStart} windowEnd={metrics.windowEnd} />
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-componentes
   ───────────────────────────────────────────────────────────────────────────── */

function StatusPill({ operating }) {
  return (
    <span
      style={{
        ...S.statusPill,
        background: operating ? "var(--success-soft)" : "var(--hover)",
        color: operating ? "var(--success)" : "var(--text-muted)",
      }}
    >
      <span className={operating ? "live-dot" : ""} style={!operating ? S.offDot : undefined} />
      {operating ? "Online" : "Offline"}
    </span>
  );
}

function DayTabs({ schedule, activeDay, onSelect, onToggle }) {
  return (
    <div style={S.dayTabsWrap} className="animate-in">
      {DAY_GROUPS.map((g) => {
        const d = schedule[g.id];
        const isActive = activeDay === g.id;
        const count = d?.enabled ? generateDepartures(d).length : 0;
        return (
          <button
            key={g.id}
            style={S.dayTab(isActive, d?.enabled)}
            onClick={() => onSelect(g.id)}
            className="se-day-tab"
          >
            <span style={S.dayTabDot(d?.enabled)} />
            <span style={S.dayTabLabel}>{g.short}</span>
            {d?.enabled && <span style={S.dayTabCount}>{count}</span>}
            <span
              role="switch"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggle(g.id, !d?.enabled); }}
              style={S.dayTabSwitch(d?.enabled)}
              title={d?.enabled ? "Desativar" : "Ativar"}
            >
              <span style={S.dayTabSwitchKnob(d?.enabled)} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BandCard({ band, expanded, editing, disabled, onToggle, onEdit, onChange, onRemove }) {
  const dur = Math.max(0, timeToMin(band.end) - timeToMin(band.start));
  const trips = dur > 0 ? Math.floor(dur / band.intervalMin) + 1 : 0;
  return (
    <article
      style={{
        ...S.bandCard,
        borderLeftColor: band.color,
        opacity: disabled ? 0.55 : 1,
      }}
      className="se-band-card"
    >
      <div style={S.bandHeader} onClick={onToggle}>
        <div style={S.bandHeaderLeft}>
          <span style={{ ...S.bandColorChip, background: band.color }}>
            <span style={S.bandColorGlow(band.color)} />
          </span>
          {editing ? (
            <input
              autoFocus
              value={band.name}
              onChange={(e) => onChange({ name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => onEdit()}
              onKeyDown={(e) => e.key === "Enter" && onEdit()}
              style={S.bandNameInput}
            />
          ) : (
            <div>
              <div style={S.bandName}>{band.name}</div>
              <div style={S.bandSub}>
                {band.start} – {band.end} · cada {band.intervalMin}min · {trips} viagens
              </div>
            </div>
          )}
        </div>
        <div style={S.bandActions} onClick={(e) => e.stopPropagation()}>
          <button style={S.iconBtn} onClick={onEdit} title="Renomear">
            <Edit size={13} />
          </button>
          <button style={S.iconBtn} onClick={onRemove} title="Remover">
            <Trash size={13} />
          </button>
          <button style={S.iconBtn} onClick={onToggle} title={expanded ? "Recolher" : "Expandir"}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={S.bandBody} className="animate-in">
          <div style={S.bandFields}>
            <Field
              label="Início"
              type="time"
              value={band.start}
              onChange={(v) => onChange({ start: v })}
            />
            <Field
              label="Fim"
              type="time"
              value={band.end}
              onChange={(v) => onChange({ end: v })}
            />
            <Field
              label="Intervalo"
              type="number"
              suffix="min"
              min={1}
              max={240}
              value={band.intervalMin}
              onChange={(v) => onChange({ intervalMin: Math.max(1, Number(v) || 1) })}
            />
          </div>
          <div style={S.colorRow}>
            <span style={S.colorRowLabel}>Cor</span>
            {BAND_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ color: c })}
                style={S.colorSwatch(c, band.color === c)}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function Field({ label, value, onChange, type, suffix, min, max }) {
  return (
    <label style={S.field}>
      <span style={S.fieldLabel}>{label}</span>
      <div style={S.fieldInputWrap}>
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          style={S.fieldInput}
        />
        {suffix && <span style={S.fieldSuffix}>{suffix}</span>}
      </div>
    </label>
  );
}

function ManualDepartures({ extras, disabled, onAdd, onRemove, onPatch }) {
  const [draft, setDraft] = useState("");
  return (
    <div style={S.manualWrap}>
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(draft); setDraft(""); }}
        style={S.manualForm}
      >
        <input
          type="time"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          style={S.manualInput}
        />
        <button type="submit" className="btn btn-ghost se-btn-icon" disabled={disabled}>
          <Plus size={13} /> Adicionar partida extra
        </button>
        <span style={S.manualHint}>Use partidas extras para reforços, picos pontuais ou viagens especiais.</span>
      </form>

      {extras.length === 0 ? (
        <div style={S.emptyState}>Nenhuma partida manual cadastrada.</div>
      ) : (
        <div style={S.manualChips}>
          {extras.map((e) => (
            <div
              key={e.time}
              style={S.manualChip(e.kind === "reinforce")}
              className="se-manual-chip"
            >
              <input
                type="time"
                value={e.time}
                onChange={(ev) => {
                  const v = ev.target.value;
                  if (v && /^\d{2}:\d{2}$/.test(v) && v !== e.time) {
                    onRemove(e.time);
                    onAdd(v, e.kind);
                  }
                }}
                style={S.manualChipInput}
              />
              <button
                onClick={() => onPatch(e.time, { kind: e.kind === "reinforce" ? "extra" : "reinforce" })}
                style={S.manualChipBadge(e.kind === "reinforce")}
                title={e.kind === "reinforce" ? "Marcar como normal" : "Marcar como reforço"}
              >
                {e.kind === "reinforce" ? "★ Reforço" : "+ Extra"}
              </button>
              <button onClick={() => onRemove(e.time)} style={S.manualChipRemove} title="Remover">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Timeline({ day, departures, extras, simRunning, simMin, windowStart, windowEnd }) {
  const W = 1000;
  const H = 130;
  const padL = 40;
  const padR = 20;
  const padT = 18;
  const padB = 28;
  const innerW = W - padL - padR;
  const span = Math.max(1, windowEnd - windowStart);
  const xOf = (min) => padL + ((min - windowStart) / span) * innerW;
  const hours = [];
  for (let h = Math.ceil(windowStart / 60); h <= Math.floor(windowEnd / 60); h++) {
    hours.push(h);
  }
  const extraSet = new Set(extras.map((e) => e.time));
  const reinforceSet = new Set(extras.filter((e) => e.kind === "reinforce").map((e) => e.time));

  // densidade por hora
  const buckets = {};
  departures.forEach((t) => {
    const h = Math.floor(timeToMin(t) / 60);
    buckets[h] = (buckets[h] || 0) + 1;
  });
  const maxBucket = Math.max(1, ...Object.values(buckets));

  return (
    <div style={S.timelineWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={S.timelineSvg}>
        {/* densidade (fundo) */}
        {hours.map((h) => {
          const x1 = xOf(h * 60);
          const x2 = xOf((h + 1) * 60);
          const c = buckets[h] || 0;
          const opacity = (c / maxBucket) * 0.18;
          return (
            <rect
              key={`d-${h}`}
              x={x1}
              y={padT}
              width={x2 - x1}
              height={H - padT - padB}
              fill="var(--primary)"
              opacity={opacity}
            />
          );
        })}

        {/* faixas */}
        {day.bands.map((b, i) => {
          const x1 = xOf(timeToMin(b.start));
          const x2 = xOf(timeToMin(b.end));
          const y = padT + 6 + (i % 3) * 8;
          return (
            <g key={b.id}>
              <rect
                x={x1}
                y={y}
                width={Math.max(2, x2 - x1)}
                height={6}
                rx={3}
                fill={b.color}
                opacity={0.85}
              />
            </g>
          );
        })}

        {/* eixo horas */}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--border-strong)" strokeWidth={1} />
        {hours.map((h) => (
          <g key={`h-${h}`}>
            <line x1={xOf(h * 60)} x2={xOf(h * 60)} y1={H - padB} y2={H - padB + 4} stroke="var(--border-strong)" />
            <text
              x={xOf(h * 60)}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
              fontFamily="var(--font-display)"
            >
              {pad(h)}h
            </text>
          </g>
        ))}

        {/* departures (ônibus) */}
        {departures.map((t) => {
          const min = timeToMin(t);
          const x = xOf(min);
          const isExtra = extraSet.has(t);
          const isReinforce = reinforceSet.has(t);
          const passed = simRunning && simMin >= min;
          const justPassed = simRunning && Math.abs(simMin - min) < 8;
          const color = isReinforce ? "#ec4899" : isExtra ? "var(--accent)" : "var(--primary)";
          return (
            <g key={t} className={justPassed ? "se-bus-pop" : ""}>
              <circle
                cx={x}
                cy={H - padB - 18}
                r={passed ? 5 : 3.5}
                fill={color}
                opacity={passed ? 1 : 0.85}
              />
              {isReinforce && (
                <circle cx={x} cy={H - padB - 18} r={7} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
              )}
            </g>
          );
        })}

        {/* cursor de simulação */}
        {simRunning && (
          <g>
            <line
              x1={xOf(simMin)}
              x2={xOf(simMin)}
              y1={padT}
              y2={H - padB}
              stroke="var(--danger)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <circle cx={xOf(simMin)} cy={padT} r={4} fill="var(--danger)" />
          </g>
        )}
      </svg>

      {/* Legenda */}
      <div style={S.timelineLegend}>
        <span style={S.legendItem}>
          <span style={{ ...S.legendDot, background: "var(--primary)" }} /> Partida regular
        </span>
        <span style={S.legendItem}>
          <span style={{ ...S.legendDot, background: "var(--accent)" }} /> Extra
        </span>
        <span style={S.legendItem}>
          <span style={{ ...S.legendDot, background: "#ec4899" }} /> Reforço
        </span>
        <span style={S.legendItem}>
          <span style={{ ...S.legendDot, background: "var(--primary)", opacity: 0.25 }} /> Densidade
        </span>
      </div>
    </div>
  );
}

function MetricsPanel({ metrics, day, simRunning }) {
  const items = [
    { icon: <Activity size={13} />,  label: "Partidas no dia",       value: metrics.totalDepartures, unit: "" },
    { icon: <Bus size={13} />,       label: "Frota mínima",          value: metrics.minFleet,        unit: "ônibus" },
    { icon: <Clock size={13} />,     label: "Espera média",          value: metrics.avgWaitMin,      unit: "min" },
    { icon: <RouteIcon size={13} />, label: "Quilômetros rodados",   value: metrics.totalKm,         unit: "km" },
    { icon: <Gauge size={13} />,     label: "Duração operacional",   value: fmtDuration(metrics.opDuration), unit: "" },
    { icon: <Users size={13} />,     label: "Demanda estimada",      value: metrics.estDemand,       unit: "pax" },
  ];
  return (
    <div style={S.sideCard} className="animate-in">
      <div style={S.sideHead}>
        <ChartBar size={14} style={{ color: "var(--primary)" }} />
        <h3 style={S.sideTitle}>Resumo Operacional</h3>
        {simRunning && <span style={S.liveTag}><span className="live-dot" /> LIVE</span>}
      </div>
      <div style={S.metricsGrid}>
        {items.map((it) => (
          <div key={it.label} style={S.metric} className="se-metric">
            <div style={S.metricIcon}>{it.icon}</div>
            <div style={S.metricLabel}>{it.label}</div>
            <div style={S.metricValue}>
              {it.value}
              {it.unit && <span style={S.metricUnit}>{it.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }) {
  return (
    <div style={S.sideCard} className="animate-in">
      <div style={S.sideHead}>
        <Bell size={14} style={{ color: alerts.length ? "var(--warn)" : "var(--success)" }} />
        <h3 style={S.sideTitle}>Alertas Inteligentes</h3>
        <span style={S.sectionCount}>{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div style={S.alertOk}>
          <Check size={14} /> Operação saudável, nenhum problema detectado.
        </div>
      ) : (
        <div style={S.alertList}>
          {alerts.map((a, i) => {
            const sev = SEVERITY[a.severity] || SEVERITY.info;
            return (
              <div
                key={i}
                style={{ ...S.alertCard, background: sev.soft, borderLeftColor: sev.color }}
                className="se-alert"
              >
                <div style={{ ...S.alertTitle, color: sev.color }}>{a.title}</div>
                <div style={S.alertMessage}>{a.message}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DensityPanel({ departures, windowStart, windowEnd }) {
  // mini gráfico de densidade por hora
  const buckets = {};
  departures.forEach((t) => {
    const h = Math.floor(timeToMin(t) / 60);
    buckets[h] = (buckets[h] || 0) + 1;
  });
  const startH = Math.floor(windowStart / 60);
  const endH = Math.ceil(windowEnd / 60);
  const max = Math.max(1, ...Object.values(buckets));
  const arr = [];
  for (let h = startH; h <= endH; h++) arr.push({ h, n: buckets[h] || 0 });

  return (
    <div style={S.sideCard} className="animate-in">
      <div style={S.sideHead}>
        <ChartBar size={14} style={{ color: "var(--accent)" }} />
        <h3 style={S.sideTitle}>Densidade por Hora</h3>
      </div>
      <div style={S.densityChart}>
        {arr.map(({ h, n }) => (
          <div key={h} style={S.densityCol} title={`${pad(h)}h · ${n} partidas`}>
            <div
              style={{
                ...S.densityBar,
                height: `${Math.max(2, (n / max) * 100)}%`,
                background: n >= max * 0.7
                  ? "var(--accent)"
                  : n >= max * 0.4
                  ? "var(--primary)"
                  : "var(--border-strong)",
              }}
            />
            <span style={S.densityLabel}>{pad(h)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesMenu({ activeDay, onClose, onCopy }) {
  const targets = DAY_GROUPS.filter((g) => g.id !== activeDay);
  const [picked, setPicked] = useState([]);
  return (
    <>
      <div style={S.menuBackdrop} onClick={onClose} />
      <div style={S.menuWrap} className="animate-in">
        <div style={S.menuTitle}>Copiar configuração para…</div>
        {targets.map((t) => {
          const on = picked.includes(t.id);
          return (
            <button
              key={t.id}
              style={S.menuItem(on)}
              onClick={() =>
                setPicked((p) => (on ? p.filter((x) => x !== t.id) : [...p, t.id]))
              }
            >
              <span style={S.menuCheck(on)}>{on && <Check size={11} />}</span>
              {t.label}
            </button>
          );
        })}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => picked.length && onCopy(picked)}
          disabled={!picked.length}
        >
          <Copy size={13} /> Replicar em {picked.length || "…"} dia{picked.length !== 1 ? "s" : ""}
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Métricas & alertas
   ───────────────────────────────────────────────────────────────────────────── */
function computeMetrics(day, route) {
  const departures = generateDepartures(day);
  const totalDepartures = departures.length;

  let windowStart = 24 * 60;
  let windowEnd = 0;
  day.bands.forEach((b) => {
    windowStart = Math.min(windowStart, timeToMin(b.start));
    windowEnd = Math.max(windowEnd, timeToMin(b.end));
  });
  if (windowEnd <= windowStart) {
    windowStart = 6 * 60;
    windowEnd = 22 * 60;
  }
  const opDuration = Math.max(0, windowEnd - windowStart);

  // intervalo médio
  const intervals = [];
  for (let i = 1; i < departures.length; i++) {
    intervals.push(timeToMin(departures[i]) - timeToMin(departures[i - 1]));
  }
  const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  const avgWaitMin = avgInterval ? Math.round((avgInterval / 2) * 10) / 10 : 0;
  const minInterval = intervals.length ? Math.min(...intervals) : 0;

  // KM rodados (estima via route.path)
  const routeKm = pathKm(route?.path);
  const totalKm = Math.round(totalDepartures * routeKm * 2 * 10) / 10;

  // Frota mínima: tempo de ciclo / menor intervalo
  // Estima 35min/12km de tempo de ciclo (média urbana)
  const cycleMin = Math.max(30, Math.round((routeKm || 12) * 5));
  const minFleet = minInterval > 0 ? Math.max(1, Math.ceil(cycleMin / minInterval)) : 0;

  // demanda estimada (heurística)
  const estDemand = Math.round(totalDepartures * 45);

  return {
    totalDepartures,
    windowStart,
    windowEnd,
    opDuration,
    avgInterval,
    avgWaitMin,
    minInterval,
    cycleMin,
    minFleet,
    totalKm,
    estDemand,
  };
}

function pathKm(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  const R = 6371;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [lat1, lng1] = path[i - 1];
    const [lat2, lng2] = path[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return total;
}

function computeAlerts(day, m) {
  const out = [];
  if (!day.enabled) return out;

  if (m.minInterval > 0 && m.minInterval < 5) {
    out.push({
      severity: "warn",
      title: "Intervalo muito curto para a frota disponível",
      message: `Menor intervalo é de ${m.minInterval}min. Verifique se a frota de ${m.minFleet} ônibus consegue manter este ritmo.`,
    });
  }
  if (m.windowEnd > 23 * 60 + 30) {
    out.push({
      severity: "warn",
      title: "Última viagem pode não retornar ao terminal",
      message: `Operação termina às ${minToTime(m.windowEnd)}. Ciclo médio estimado de ${m.cycleMin}min pode estourar o expediente.`,
    });
  }
  // ociosidade no período da tarde (12h-17h)
  const afternoon = day.bands.find(
    (b) => timeToMin(b.start) < 17 * 60 && timeToMin(b.end) > 12 * 60 && b.intervalMin >= 30
  );
  if (afternoon) {
    out.push({
      severity: "info",
      title: "Grande ociosidade no período da tarde",
      message: `A faixa "${afternoon.name}" tem intervalo de ${afternoon.intervalMin}min. Considere aproveitar a frota.`,
    });
  }
  // sobreposição de faixas
  for (let i = 0; i < day.bands.length; i++) {
    for (let j = i + 1; j < day.bands.length; j++) {
      const a = day.bands[i];
      const b = day.bands[j];
      if (timeToMin(a.start) < timeToMin(b.end) && timeToMin(b.start) < timeToMin(a.end)) {
        out.push({
          severity: "danger",
          title: "Faixas operacionais sobrepostas",
          message: `"${a.name}" e "${b.name}" ocupam o mesmo horário — defina qual intervalo prevalece.`,
        });
        break;
      }
    }
  }
  if (day.enabled && m.totalDepartures === 0) {
    out.push({
      severity: "danger",
      title: "Linha sem partidas",
      message: "Adicione ao menos uma faixa operacional para gerar partidas.",
    });
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Estilos
   ───────────────────────────────────────────────────────────────────────────── */
const S = {
  wrap: {
    position: "absolute",
    inset: 0,
    overflowY: "auto",
    padding: "22px 28px 32px",
    background: "var(--bg)",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 18,
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  headerTitleRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    background: "linear-gradient(135deg, var(--primary), #7c3aed)",
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px -8px rgba(37,99,235,0.6)",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.025em",
  },
  subtitle: { fontSize: 12.5, color: "var(--text-muted)", maxWidth: 640 },
  headerRight: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },

  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px 3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  offDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "var(--text-dim)",
    display: "inline-block",
  },

  /* Day tabs */
  dayTabsWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 8,
    marginBottom: 18,
    boxShadow: "var(--shadow-sm)",
  },
  dayTab: (active, enabled) => ({
    flex: "1 1 140px",
    minWidth: 130,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    background: active ? "var(--primary-soft)" : "transparent",
    border: active ? "1px solid var(--primary)" : "1px solid transparent",
    color: active ? "var(--primary)" : enabled ? "var(--text)" : "var(--text-muted)",
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    transition: "all 0.18s ease",
    cursor: "pointer",
    position: "relative",
  }),
  dayTabDot: (enabled) => ({
    width: 8,
    height: 8,
    borderRadius: 999,
    background: enabled ? "var(--success)" : "var(--text-dim)",
    boxShadow: enabled ? "0 0 0 3px var(--success-soft)" : "none",
    flexShrink: 0,
    transition: "all 0.18s ease",
  }),
  dayTabLabel: { flex: 1, textAlign: "left" },
  dayTabCount: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    background: "var(--surface)",
    color: "var(--text-soft)",
    border: "1px solid var(--border)",
  },
  dayTabSwitch: (on) => ({
    width: 26,
    height: 14,
    borderRadius: 999,
    background: on ? "var(--success)" : "var(--border-strong)",
    position: "relative",
    transition: "background 0.18s ease",
    flexShrink: 0,
    cursor: "pointer",
  }),
  dayTabSwitchKnob: (on) => ({
    position: "absolute",
    top: 2,
    left: on ? 14 : 2,
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "white",
    transition: "left 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  }),

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 18,
    alignItems: "start",
  },
  mainCol: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  sideCol: { display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 0 },

  /* Day header */
  dayHeader: {
    background: "linear-gradient(135deg, var(--surface), var(--surface-soft))",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "var(--shadow-sm)",
  },
  dayHeaderLabel: {
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  dayHeaderSub: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  dayToggle: (on) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 14px",
    borderRadius: 999,
    background: on ? "var(--success-soft)" : "var(--hover)",
    color: on ? "var(--success)" : "var(--text-muted)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    cursor: "pointer",
    border: on ? "1px solid var(--success)" : "1px solid var(--border)",
    transition: "all 0.18s ease",
  }),
  dayToggleDot: (on) => ({
    width: 8,
    height: 8,
    borderRadius: 999,
    background: on ? "var(--success)" : "var(--text-dim)",
    boxShadow: on ? "0 0 0 3px rgba(22,163,74,0.18)" : "none",
  }),

  /* Section */
  section: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 16,
    boxShadow: "var(--shadow-sm)",
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sectionTitleWrap: { display: "flex", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 999,
    background: "var(--hover)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-display)",
  },
  liveTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 9px",
    background: "var(--success-soft)",
    color: "var(--success)",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    letterSpacing: "0.05em",
  },
  legendRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  legendDot: { width: 8, height: 8, borderRadius: 999 },

  /* Bands */
  bandsList: { display: "flex", flexDirection: "column", gap: 8 },
  bandCard: {
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderLeft: "4px solid",
    borderRadius: 12,
    transition: "all 0.18s ease",
    overflow: "hidden",
  },
  bandHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    cursor: "pointer",
    gap: 12,
  },
  bandHeaderLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 },
  bandColorChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    position: "relative",
    flexShrink: 0,
  },
  bandColorGlow: (c) => ({
    position: "absolute",
    inset: -3,
    borderRadius: 10,
    background: c,
    opacity: 0.2,
    filter: "blur(6px)",
    zIndex: -1,
  }),
  bandName: {
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  bandNameInput: {
    border: "1px solid var(--primary)",
    background: "var(--surface)",
    borderRadius: 6,
    padding: "4px 8px",
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    width: "100%",
    maxWidth: 260,
  },
  bandSub: { fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 },
  bandActions: { display: "flex", gap: 2 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    transition: "all 0.15s ease",
  },
  bandBody: {
    padding: "0 14px 14px",
    borderTop: "1px dashed var(--border)",
    paddingTop: 12,
  },
  bandFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    marginBottom: 12,
  },
  colorRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  colorRowLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginRight: 4,
  },
  colorSwatch: (c, active) => ({
    width: 20,
    height: 20,
    borderRadius: 6,
    background: c,
    border: active ? "2px solid var(--text)" : "2px solid transparent",
    boxShadow: active ? `0 0 0 3px ${c}33` : "none",
    transition: "all 0.15s ease",
    cursor: "pointer",
  }),

  /* Field */
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  fieldInputWrap: { position: "relative", display: "flex" },
  fieldInput: {
    width: "100%",
    height: 34,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    transition: "all 0.18s ease",
  },
  fieldSuffix: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "var(--text-muted)",
    pointerEvents: "none",
  },

  emptyState: {
    padding: "14px 12px",
    borderRadius: 10,
    background: "var(--surface-soft)",
    border: "1px dashed var(--border-strong)",
    fontSize: 12.5,
    color: "var(--text-muted)",
    textAlign: "center",
  },

  /* Timeline */
  timelineWrap: {
    background: "var(--surface-soft)",
    borderRadius: 12,
    padding: "12px 14px",
    border: "1px solid var(--border)",
  },
  timelineSvg: { width: "100%", height: 130, display: "block" },
  timelineLegend: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    paddingTop: 10,
    borderTop: "1px dashed var(--border)",
    marginTop: 6,
  },

  /* Manual */
  manualWrap: { display: "flex", flexDirection: "column", gap: 12 },
  manualForm: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  manualInput: {
    height: 34,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-soft)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    width: 110,
  },
  manualHint: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    flex: 1,
    minWidth: 200,
  },
  manualChips: { display: "flex", gap: 6, flexWrap: "wrap" },
  manualChip: (rein) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 4px 3px 4px",
    borderRadius: 10,
    background: rein ? "rgba(236,72,153,0.10)" : "var(--accent-soft)",
    border: `1px solid ${rein ? "rgba(236,72,153,0.4)" : "rgba(249,115,22,0.35)"}`,
    transition: "all 0.18s ease",
  }),
  manualChipInput: {
    border: "none",
    background: "transparent",
    fontFamily: "var(--font-display)",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text)",
    width: 70,
    padding: "2px 4px",
  },
  manualChipBadge: (rein) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 7px",
    borderRadius: 999,
    background: rein ? "#ec4899" : "var(--accent)",
    color: "white",
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "transform 0.15s ease",
  }),
  manualChipRemove: {
    width: 20,
    height: 20,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
  },

  /* Side cards */
  sideCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 14,
    boxShadow: "var(--shadow-sm)",
  },
  sideHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sideTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
    textTransform: "uppercase",
    flex: 1,
  },

  /* Metrics */
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  metric: {
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 12px",
    transition: "all 0.18s ease",
  },
  metricIcon: { color: "var(--primary)", marginBottom: 4 },
  metricLabel: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.025em",
    display: "flex",
    alignItems: "baseline",
    gap: 4,
  },
  metricUnit: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "lowercase",
  },

  /* Alerts */
  alertOk: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px",
    borderRadius: 10,
    background: "var(--success-soft)",
    color: "var(--success)",
    fontSize: 12,
    fontWeight: 600,
  },
  alertList: { display: "flex", flexDirection: "column", gap: 6 },
  alertCard: {
    padding: "9px 11px",
    borderRadius: 10,
    borderLeft: "3px solid",
    transition: "all 0.18s ease",
  },
  alertTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    marginBottom: 2,
  },
  alertMessage: { fontSize: 11, color: "var(--text-soft)", lineHeight: 1.4 },

  /* Density */
  densityChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 3,
    height: 80,
    padding: "0 2px",
  },
  densityCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    minWidth: 0,
  },
  densityBar: {
    width: "100%",
    borderRadius: "3px 3px 0 0",
    transition: "height 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
  },
  densityLabel: {
    fontSize: 8.5,
    color: "var(--text-muted)",
    marginTop: 3,
    fontFamily: "var(--font-display)",
  },

  /* Templates menu */
  menuBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
  },
  menuWrap: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    width: 220,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 10,
    boxShadow: "var(--shadow-lg)",
    zIndex: 11,
  },
  menuTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  },
  menuItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    background: active ? "var(--primary-soft)" : "transparent",
    color: active ? "var(--primary)" : "var(--text)",
    fontFamily: "var(--font-display)",
    fontSize: 12.5,
    fontWeight: 600,
    textAlign: "left",
    transition: "all 0.15s ease",
  }),
  menuCheck: (on) => ({
    width: 16,
    height: 16,
    borderRadius: 5,
    border: `1.5px solid ${on ? "var(--primary)" : "var(--border-strong)"}`,
    background: on ? "var(--primary)" : "transparent",
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
};

/* CSS local — animações e hover effects para esta tela */
const LOCAL_CSS = `
@keyframes se-bus-pop {
  0%   { transform: scale(1);   filter: brightness(1); }
  40%  { transform: scale(1.8); filter: brightness(1.4); }
  100% { transform: scale(1);   filter: brightness(1); }
}
.se-bus-pop circle { transform-origin: center; animation: se-bus-pop 0.55s ease-out; transform-box: fill-box; }

.se-band-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); border-color: var(--border-strong); }
.se-band-card { will-change: transform; }

.se-day-tab:hover { background: var(--hover); }
.se-btn-icon:hover { transform: translateY(-1px); }
.se-sim-btn { position: relative; overflow: hidden; }
.se-sim-btn:hover { transform: translateY(-1px); }

.se-metric:hover { background: var(--surface); border-color: var(--border-strong); transform: translateY(-1px); }
.se-metric { cursor: default; }

.se-alert:hover { transform: translateX(2px); }

.se-manual-chip:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }

@keyframes se-pulse-mini {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.4); opacity: 0.6; }
}
.se-pulse-mini {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: se-pulse-mini 1s ease-in-out infinite;
}

@media (max-width: 1180px) {
  .se-day-tab { flex: 1 1 100px !important; }
}
`;
