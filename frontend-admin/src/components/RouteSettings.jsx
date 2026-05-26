import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bus,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  MapPin,
  Move,
  Route as RouteIcon,
  Settings as SettingsIcon,
  Trash,
  X,
} from "./Icons";
import { generateDepartures } from "./SchedulesEditor";

/* ─────────────────────────────────────────────────────────────────────────────
   Constantes
   ───────────────────────────────────────────────────────────────────────────── */
const TYPES = [
  { value: "urbana",        label: "Urbana",        desc: "Dentro do município" },
  { value: "metropolitana", label: "Metropolitana", desc: "Liga municípios da região" },
  { value: "expressa",      label: "Expressa",      desc: "Menos paradas, mais rápida" },
  { value: "circular",      label: "Circular",      desc: "Volta ao ponto de origem" },
];

const DIRECTIONS = [
  { value: "both",     label: "Ida e volta" },
  { value: "one_way",  label: "Apenas ida" },
  { value: "circular", label: "Circular" },
];

const CATEGORIES = [
  { value: "comum",     label: "Comum" },
  { value: "especial",  label: "Especial" },
  { value: "gratuita",  label: "Gratuita" },
];

const COLORS = [
  "#f97316", "#06b6d4", "#2563eb", "#eab308",
  "#ec4899", "#a855f7", "#16a34a", "#ef4444",
];

const FEATURES = [
  { key: "wheelchair", label: "Acessibilidade",     desc: "Elevador e espaço para cadeirantes" },
  { key: "ac",         label: "Ar-condicionado",    desc: "Climatização ativa" },
  { key: "wifi",       label: "Wi-Fi a bordo",      desc: "Internet gratuita para passageiros" },
  { key: "bike",       label: "Suporte para bike",  desc: "Bicicletário externo" },
  { key: "usb",        label: "Tomadas USB",        desc: "Carregamento em todos os bancos" },
  { key: "lowfloor",   label: "Piso baixo",         desc: "Acesso facilitado" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────────────────────────────────────── */
export default function RouteSettings({
  route,
  onChange,
  onReset,
  onDelete,
  onDuplicate,
  onStopRename,
  onStopRemove,
  onWaypointRemove,
  onJumpToMap,
}) {
  const [tagDraft, setTagDraft] = useState("");
  const [confirmReset, setConfirmReset] = useState(null);
  const [stopsOpen, setStopsOpen] = useState(true);
  const [pathOpen, setPathOpen] = useState(false);

  const patch = (p) => onChange?.(p);
  const features = route.features || {};
  const tags = route.tags || [];

  const stats = useMemo(() => {
    const departures = route.schedule?.weekday
      ? generateDepartures(route.schedule.weekday).length
      : 0;
    const stops = route.stops?.length || 0;
    const points = route.path?.length || 0;
    return { departures, stops, points };
  }, [route.schedule, route.stops?.length, route.path?.length]);

  function addTag() {
    const v = tagDraft.trim();
    if (!v || tags.includes(v)) { setTagDraft(""); return; }
    patch({ tags: [...tags, v] });
    setTagDraft("");
  }
  function removeTag(t) {
    patch({ tags: tags.filter((x) => x !== t) });
  }
  function toggleFeature(key) {
    patch({ features: { ...features, [key]: !features[key] } });
  }

  return (
    <div style={S.wrap}>
      <style>{LOCAL_CSS}</style>

      {/* ─── Cabeçalho ─── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitleRow}>
            <span style={S.iconBadge}>
              <SettingsIcon size={16} />
            </span>
            <h2 style={S.title}>Configurações da Linha</h2>
          </div>
          <p style={S.subtitle}>
            Edite todos os parâmetros operacionais, comerciais e técnicos de{" "}
            <strong style={{ color: "var(--text)" }}>{route.name}</strong>.
          </p>
        </div>
        <div style={S.headerStats}>
          <HeaderStat label="Paradas" value={stats.stops} />
          <HeaderStat label="Pontos" value={stats.points} />
          <HeaderStat label="Partidas/dia" value={stats.departures} />
        </div>
      </header>

      <div style={S.grid}>
        {/* ─── Identidade ─── */}
        <Section icon={<RouteIcon size={14} />} title="Identidade da Linha">
          <Row>
            <Field label="Nome da linha" full>
              <input
                className="rs-input"
                value={route.name || ""}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Ex: Linha 01 — Centro / Terminal"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Código">
              <input
                className="rs-input"
                value={route.code || ""}
                onChange={(e) => patch({ code: e.target.value })}
                placeholder="L-01"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              />
            </Field>
            <Field label="Numeração">
              <input
                className="rs-input"
                value={route.number || ""}
                onChange={(e) => patch({ number: e.target.value })}
                placeholder="101"
              />
            </Field>
            <Field label="Operadora">
              <input
                className="rs-input"
                value={route.operator || ""}
                onChange={(e) => patch({ operator: e.target.value })}
                placeholder="Viação Cidade Verde"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Descrição curta" full>
              <input
                className="rs-input"
                value={route.shortDescription || ""}
                onChange={(e) => patch({ shortDescription: e.target.value })}
                placeholder="Conecta o terminal central ao parque industrial"
              />
            </Field>
          </Row>

          <Field label="Cor da linha">
            <div style={S.colorRow}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => patch({ color: c })}
                  style={S.colorSwatch(c, route.color === c)}
                  title={c}
                  className="rs-swatch"
                />
              ))}
              <div style={S.colorInputWrap}>
                <input
                  type="color"
                  value={route.color || "#2563eb"}
                  onChange={(e) => patch({ color: e.target.value })}
                  style={S.colorInput}
                />
                <span style={S.colorInputLabel}>Personalizado</span>
              </div>
            </div>
          </Field>
        </Section>

        {/* ─── Tipo & Sentido ─── */}
        <Section icon={<Compass size={14} />} title="Classificação Operacional">
          <Field label="Tipo de linha">
            <div style={S.cardChoiceGrid}>
              {TYPES.map((t) => {
                const on = (route.type || "urbana") === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => patch({ type: t.value })}
                    style={S.cardChoice(on)}
                    className="rs-choice"
                  >
                    <div style={S.cardChoiceTop}>
                      <span style={S.cardChoiceLabel}>{t.label}</span>
                      {on && (
                        <span style={S.cardChoiceCheck}>
                          <Check size={11} />
                        </span>
                      )}
                    </div>
                    <span style={S.cardChoiceDesc}>{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Row>
            <Field label="Sentido">
              <div style={S.pillRow}>
                {DIRECTIONS.map((d) => {
                  const on = (route.direction || "both") === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => patch({ direction: d.value })}
                      style={S.pill(on)}
                      className="rs-pill"
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Categoria tarifária">
              <div style={S.pillRow}>
                {CATEGORIES.map((c) => {
                  const on = (route.fareCategory || "comum") === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => patch({ fareCategory: c.value })}
                      style={S.pill(on)}
                      className="rs-pill"
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Row>
        </Section>

        {/* ─── Operação ─── */}
        <Section icon={<Activity size={14} />} title="Parâmetros Operacionais">
          <Row>
            <Field label="Terminal de origem">
              <div style={S.iconInputWrap}>
                <MapPin size={14} style={S.iconInputIcon} />
                <input
                  className="rs-input rs-input-icon"
                  value={route.originTerminal || ""}
                  onChange={(e) => patch({ originTerminal: e.target.value })}
                  placeholder="Terminal Central"
                />
              </div>
            </Field>
            <Field label="Terminal de destino">
              <div style={S.iconInputWrap}>
                <MapPin size={14} style={S.iconInputIcon} />
                <input
                  className="rs-input rs-input-icon"
                  value={route.destinationTerminal || ""}
                  onChange={(e) => patch({ destinationTerminal: e.target.value })}
                  placeholder="Parque Industrial"
                />
              </div>
            </Field>
          </Row>
          <Row>
            <Field label="Tarifa (R$)">
              <input
                className="rs-input"
                type="number"
                step="0.05"
                min="0"
                value={route.fare ?? ""}
                onChange={(e) => patch({ fare: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="5.25"
              />
            </Field>
            <Field label="Frota total">
              <FieldNumber
                value={route.fleetSize}
                onChange={(v) => patch({ fleetSize: v })}
                suffix="ônibus"
                min={0}
                max={500}
              />
            </Field>
            <Field label="Velocidade média">
              <FieldNumber
                value={route.avgSpeed}
                onChange={(v) => patch({ avgSpeed: v })}
                suffix="km/h"
                min={0}
                max={120}
              />
            </Field>
            <Field label="Tempo de ciclo">
              <FieldNumber
                value={route.cycleMin}
                onChange={(v) => patch({ cycleMin: v })}
                suffix="min"
                min={0}
                max={600}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Distância total estimada">
              <FieldNumber
                value={route.expectedDistanceKm}
                onChange={(v) => patch({ expectedDistanceKm: v })}
                suffix="km"
                min={0}
                max={500}
                step={0.1}
              />
            </Field>
            <Field label="Capacidade por ônibus">
              <FieldNumber
                value={route.capacity}
                onChange={(v) => patch({ capacity: v })}
                suffix="pax"
                min={0}
                max={300}
              />
            </Field>
            <Field label="Tempo no terminal">
              <FieldNumber
                value={route.terminalDwellMin}
                onChange={(v) => patch({ terminalDwellMin: v })}
                suffix="min"
                min={0}
                max={60}
              />
            </Field>
          </Row>
        </Section>

        {/* ─── Recursos do veículo ─── */}
        <Section icon={<Bus size={14} />} title="Recursos do Veículo">
          <div style={S.featureGrid}>
            {FEATURES.map((f) => {
              const on = !!features[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFeature(f.key)}
                  style={S.featureCard(on)}
                  className="rs-feature"
                >
                  <div style={S.featureTop}>
                    <span style={S.featureLabel}>{f.label}</span>
                    <Switch on={on} />
                  </div>
                  <span style={S.featureDesc}>{f.desc}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ─── Tags & Notas ─── */}
        <Section icon={<Eye size={14} />} title="Tags e Observações">
          <Field label="Tags / etiquetas">
            <div style={S.tagWrap}>
              {tags.map((t) => (
                <span key={t} style={S.tag} className="rs-tag">
                  #{t}
                  <button onClick={() => removeTag(t)} style={S.tagRemove} title="Remover">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                className="rs-input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                }}
                placeholder="Digite e pressione Enter…"
                style={S.tagInput}
              />
            </div>
          </Field>

          <Field label="Observações internas" full>
            <textarea
              className="rs-input rs-textarea"
              value={route.notes || ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Detalhes operacionais, restrições, contatos, recomendações…"
              rows={4}
            />
          </Field>

          <Row>
            <Field label="Responsável operacional">
              <input
                className="rs-input"
                value={route.responsible || ""}
                onChange={(e) => patch({ responsible: e.target.value })}
                placeholder="Nome do supervisor"
              />
            </Field>
            <Field label="Telefone de contato">
              <input
                className="rs-input"
                value={route.contactPhone || ""}
                onChange={(e) => patch({ contactPhone: e.target.value })}
                placeholder="(12) 0000-0000"
              />
            </Field>
          </Row>
        </Section>

        {/* ─── Status & visibilidade ─── */}
        <Section icon={<Eye size={14} />} title="Status e Visibilidade">
          <div style={S.toggleGrid}>
            <ToggleRow
              label="Linha ativa"
              desc="Disponível para passageiros e motoristas."
              on={!!route.active}
              onChange={(v) => patch({ active: v })}
            />
            <ToggleRow
              label="Mostrar no mapa público"
              desc="Aparece no app do passageiro."
              on={route.publicVisible !== false}
              onChange={(v) => patch({ publicVisible: v })}
            />
            <ToggleRow
              label="Aceitar passageiros"
              desc="Permite embarque (desligue para serviço técnico)."
              on={route.acceptsPassengers !== false}
              onChange={(v) => patch({ acceptsPassengers: v })}
            />
            <ToggleRow
              label="Notificar atrasos"
              desc="Envia alertas quando o intervalo é estourado."
              on={!!route.notifyDelays}
              onChange={(v) => patch({ notifyDelays: v })}
            />
          </div>
        </Section>

        {/* ─── Metadados ─── */}
        <Section icon={<Clock size={14} />} title="Metadados">
          <div style={S.metaGrid}>
            <Meta label="ID interno" value={route.id} mono />
            <Meta label="Criada em" value={formatDate(route.createdAt)} />
            <Meta label="Última alteração" value={formatDate(route.updatedAt) || "—"} />
            <Meta label="Versão do traçado" value={route.path?.length ? `v${(route.pathVersion || 1)}` : "—"} />
          </div>
        </Section>

        {/* ─── Editor de Paradas ─── */}
        <CollapsibleSection
          icon={<MapPin size={14} />}
          title="Paradas da Linha"
          count={route.stops?.length || 0}
          open={stopsOpen}
          onToggle={() => setStopsOpen((v) => !v)}
          hint="Renomeie ou remova paradas individualmente aqui. Para posicionar uma parada no mapa, use o botão 'Editar no mapa' ou vá direto na aba Paradas e clique sobre o traçado."
          action={
            <button
              className="btn btn-ghost rs-jump-btn"
              onClick={(e) => { e.stopPropagation(); onJumpToMap?.("stop"); }}
            >
              <MapPin size={13} /> Editar no mapa
            </button>
          }
        >
          {(!route.stops || route.stops.length === 0) ? (
            <div style={S.listEmpty}>
              Nenhuma parada cadastrada. Use o botão <strong>Editar no mapa</strong> acima e clique sobre o traçado para adicionar.
            </div>
          ) : (
            <div style={S.itemList}>
              {[...route.stops]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((s, i) => (
                  <StopRow
                    key={s.id}
                    index={i + 1}
                    stop={s}
                    color={route.color}
                    onRename={(name) => onStopRename?.(s.id, name)}
                    onRemove={() => onStopRemove?.(s.id)}
                    onLocate={() => onJumpToMap?.("stop")}
                  />
                ))}
            </div>
          )}
        </CollapsibleSection>

        {/* ─── Editor do Traçado ─── */}
        <CollapsibleSection
          icon={<RouteIcon size={14} />}
          title="Pontos do Traçado"
          count={(route.anchors?.length || route.path?.length || 0)}
          open={pathOpen}
          onToggle={() => setPathOpen((v) => !v)}
          hint="Veja todos os pontos âncora do traçado e remova qualquer um individualmente. Para mover um ponto, vá para a aba Traçado e arraste-o no mapa."
          action={
            <button
              className="btn btn-ghost rs-jump-btn"
              onClick={(e) => { e.stopPropagation(); onJumpToMap?.("path"); }}
            >
              <RouteIcon size={13} /> Editar no mapa
            </button>
          }
        >
          {(() => {
            const pts = (route.anchors?.length ? route.anchors : route.path) || [];
            if (pts.length === 0) {
              return (
                <div style={S.listEmpty}>
                  Nenhum ponto no traçado. Use <strong>Editar no mapa</strong> acima e clique sobre o mapa para começar a desenhar.
                </div>
              );
            }
            return (
              <div style={S.itemList}>
                {pts.map((p, idx) => (
                  <WaypointRow
                    key={idx}
                    index={idx + 1}
                    isFirst={idx === 0}
                    isLast={idx === pts.length - 1}
                    lat={p[0]}
                    lng={p[1]}
                    color={route.color}
                    onRemove={() => onWaypointRemove?.(idx)}
                    onLocate={() => onJumpToMap?.("path")}
                  />
                ))}
              </div>
            );
          })()}
        </CollapsibleSection>

        {/* ─── Zona de Perigo ─── */}
        <Section
          icon={<Trash size={14} />}
          title="Zona de Perigo"
          danger
        >
          <p style={S.dangerHint}>
            As ações abaixo são <strong>irreversíveis</strong>. Use com cuidado — elas afetam
            imediatamente passageiros e motoristas que usam esta linha.
          </p>
          <div style={S.dangerGrid}>
            <DangerAction
              title="Resetar traçado"
              desc="Apaga o caminho desenhado no mapa."
              confirmText="Resetar traçado"
              open={confirmReset === "path"}
              onArm={() => setConfirmReset("path")}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => { onReset?.("path"); setConfirmReset(null); }}
            />
            <DangerAction
              title="Resetar paradas"
              desc="Remove todas as paradas cadastradas."
              confirmText="Resetar paradas"
              open={confirmReset === "stops"}
              onArm={() => setConfirmReset("stops")}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => { onReset?.("stops"); setConfirmReset(null); }}
            />
            <DangerAction
              title="Resetar horários"
              desc="Limpa todas as faixas e partidas configuradas."
              confirmText="Resetar horários"
              open={confirmReset === "schedule"}
              onArm={() => setConfirmReset("schedule")}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => { onReset?.("schedule"); setConfirmReset(null); }}
            />
            <DangerAction
              title="Duplicar linha"
              desc="Cria uma cópia inativa para edição segura."
              variant="neutral"
              confirmText="Duplicar"
              open={confirmReset === "duplicate"}
              onArm={() => onDuplicate?.()}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => onDuplicate?.()}
              skipConfirm
            />
            <DangerAction
              title="Excluir linha permanentemente"
              desc="Esta ação não pode ser desfeita."
              variant="critical"
              confirmText="Excluir definitivamente"
              open={confirmReset === "delete"}
              onArm={() => setConfirmReset("delete")}
              onCancel={() => setConfirmReset(null)}
              onConfirm={() => { onDelete?.(); setConfirmReset(null); }}
              wide
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-componentes
   ───────────────────────────────────────────────────────────────────────────── */
function Section({ icon, title, danger, children }) {
  return (
    <section style={{ ...S.section, ...(danger ? S.sectionDanger : null) }} className="animate-in">
      <div style={S.sectionHead}>
        <span style={{ ...S.sectionIcon, ...(danger ? S.sectionIconDanger : null) }}>{icon}</span>
        <h3 style={S.sectionTitle}>{title}</h3>
      </div>
      <div style={S.sectionBody}>{children}</div>
    </section>
  );
}

function CollapsibleSection({ icon, title, count, open, onToggle, hint, action, children }) {
  return (
    <section style={S.section} className="animate-in">
      <div style={S.collapseHead} className="rs-collapse-head">
        <button onClick={onToggle} style={S.collapseHeadBtn}>
          <span style={S.sectionIcon}>{icon}</span>
          <h3 style={S.sectionTitle}>{title}</h3>
          {count != null && <span style={S.sectionCount}>{count}</span>}
          <span style={S.collapseChev}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
        {action}
      </div>
      {open && (
        <div style={S.collapseBody} className="animate-in">
          {hint && <div style={S.collapseHint}>{hint}</div>}
          {children}
        </div>
      )}
    </section>
  );
}

function StopRow({ index, stop, color, onRename, onRemove, onLocate }) {
  const [name, setName] = useState(stop.name);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { setName(stop.name); }, [stop.name]);

  const dirtyName = (name || "").trim() && (name || "").trim() !== stop.name;
  function commitName() {
    if (dirtyName) onRename?.(name.trim());
    else setName(stop.name);
  }

  return (
    <div style={S.itemRow} className="rs-item-row">
      <span style={{ ...S.itemOrder, background: color, color: "white" }}>{index}</span>

      <div style={S.itemMain}>
        <input
          className="rs-input rs-row-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder="Nome da parada"
        />
        <div style={S.coordDisplay}>
          <MapPin size={11} />
          {Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}
        </div>
      </div>

      <div style={S.itemActions}>
        <button
          style={S.iconBtnSubtle}
          title="Mover esta parada no mapa"
          onClick={onLocate}
          className="rs-icon-btn"
        >
          <Move size={13} />
        </button>
        {confirming ? (
          <>
            <button
              style={S.confirmRemove}
              onClick={() => { onRemove?.(); setConfirming(false); }}
              title="Confirmar"
            >
              <Check size={12} /> Remover
            </button>
            <button style={S.iconBtnSubtle} onClick={() => setConfirming(false)} title="Cancelar" className="rs-icon-btn">
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            style={{ ...S.iconBtnSubtle, color: "var(--danger)" }}
            onClick={() => setConfirming(true)}
            title="Remover parada"
            className="rs-icon-btn"
          >
            <Trash size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function WaypointRow({ index, isFirst, isLast, lat, lng, color, onRemove, onLocate }) {
  const [confirming, setConfirming] = useState(false);
  const tag = isFirst ? "INÍCIO" : isLast ? "FIM" : `#${index}`;

  return (
    <div style={S.itemRow} className="rs-item-row">
      <span
        style={{
          ...S.itemOrder,
          background: isFirst ? "var(--success)" : isLast ? "var(--danger)" : color,
          color: "white",
          minWidth: 56,
          fontSize: 10,
          letterSpacing: "0.04em",
        }}
      >
        {tag}
      </span>

      <div style={S.itemMain}>
        <div style={S.coordDisplay}>
          <MapPin size={11} />
          {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </div>
      </div>

      <div style={S.itemActions}>
        <button
          style={S.iconBtnSubtle}
          title="Mover este ponto no mapa"
          onClick={onLocate}
          className="rs-icon-btn"
        >
          <Move size={13} />
        </button>
        {confirming ? (
          <>
            <button
              style={S.confirmRemove}
              onClick={() => { onRemove?.(); setConfirming(false); }}
              title="Confirmar"
            >
              <Check size={12} /> Remover
            </button>
            <button style={S.iconBtnSubtle} onClick={() => setConfirming(false)} title="Cancelar" className="rs-icon-btn">
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            style={{ ...S.iconBtnSubtle, color: "var(--danger)" }}
            onClick={() => setConfirming(true)}
            title="Remover ponto"
            className="rs-icon-btn"
          >
            <Trash size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ children }) {
  return <div style={S.row}>{children}</div>;
}

function Field({ label, children, full }) {
  return (
    <label style={{ ...S.field, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function FieldNumber({ value, onChange, suffix, min, max, step }) {
  return (
    <div style={S.numberWrap}>
      <input
        className="rs-input rs-number-input"
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder="—"
      />
      {suffix && <span style={S.numberSuffix}>{suffix}</span>}
    </div>
  );
}

function HeaderStat({ label, value }) {
  return (
    <div style={S.headerStat} className="rs-stat">
      <div style={S.headerStatValue}>{value}</div>
      <div style={S.headerStatLabel}>{label}</div>
    </div>
  );
}

function Switch({ on }) {
  return (
    <span style={S.switchTrack(on)}>
      <span style={S.switchKnob(on)} />
    </span>
  );
}

function ToggleRow({ label, desc, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={S.toggleRow(on)} className="rs-toggle-row">
      <div style={S.toggleRowText}>
        <span style={S.toggleRowLabel}>{label}</span>
        <span style={S.toggleRowDesc}>{desc}</span>
      </div>
      <Switch on={on} />
    </button>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div style={S.meta}>
      <div style={S.metaLabel}>{label}</div>
      <div style={{ ...S.metaValue, fontFamily: mono ? "ui-monospace, monospace" : undefined }}>
        {value || "—"}
      </div>
    </div>
  );
}

function DangerAction({ title, desc, variant, open, onArm, onCancel, onConfirm, confirmText, wide, skipConfirm }) {
  const v = variant || "warn";
  const palette = {
    warn:     { bg: "var(--warn-soft)",   border: "rgba(245,158,11,0.35)",  fg: "#b45309" },
    critical: { bg: "var(--danger-soft)", border: "rgba(239,68,68,0.35)",   fg: "var(--danger)" },
    neutral:  { bg: "var(--primary-soft)",border: "rgba(37,99,235,0.25)",   fg: "var(--primary)" },
  }[v];

  if (open && !skipConfirm) {
    return (
      <div
        style={{ ...S.dangerCard, background: palette.bg, borderColor: palette.border, gridColumn: wide ? "1 / -1" : undefined }}
        className="animate-in"
      >
        <div style={{ ...S.dangerTitle, color: palette.fg }}>{title}</div>
        <div style={S.dangerDesc}>
          Tem certeza? Esta ação não pode ser desfeita.
        </div>
        <div style={S.dangerActions}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            onClick={onConfirm}
            style={{
              ...S.confirmBtn,
              background: v === "critical" ? "var(--danger)" : palette.fg,
            }}
            className="rs-confirm"
          >
            <Check size={13} /> {confirmText}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ ...S.dangerCard, borderColor: palette.border, gridColumn: wide ? "1 / -1" : undefined }}
      className="rs-danger"
    >
      <div style={{ ...S.dangerTitle, color: palette.fg }}>{title}</div>
      <div style={S.dangerDesc}>{desc}</div>
      <button
        onClick={onArm}
        style={{
          ...S.dangerBtn,
          color: palette.fg,
          borderColor: palette.border,
        }}
      >
        {v === "critical" ? <Trash size={12} /> : <SettingsIcon size={12} />}
        {title}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return null; }
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
    gap: 24,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 },
  headerTitleRow: { display: "flex", alignItems: "center", gap: 10 },
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

  headerStats: { display: "flex", gap: 8 },
  headerStat: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "10px 14px",
    minWidth: 90,
    boxShadow: "var(--shadow-sm)",
    transition: "all 0.18s ease",
  },
  headerStatValue: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  headerStatLabel: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginTop: 2,
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
    maxWidth: 980,
  },

  /* Section */
  section: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 18,
    boxShadow: "var(--shadow-sm)",
  },
  sectionDanger: {
    borderColor: "rgba(239,68,68,0.25)",
    background: "linear-gradient(180deg, var(--surface) 0%, rgba(239,68,68,0.03) 100%)",
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: "1px dashed var(--border)",
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "var(--primary-soft)",
    color: "var(--primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconDanger: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
  },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
    textTransform: "uppercase",
    flex: 1,
  },
  sectionBody: { display: "flex", flexDirection: "column", gap: 14 },
  sectionCount: {
    marginLeft: "auto",
    marginRight: 8,
    padding: "2px 9px",
    borderRadius: 999,
    background: "var(--hover)",
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
  },

  /* Collapsible */
  collapseHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 0,
    marginBottom: 0,
    background: "transparent",
    textAlign: "left",
  },
  collapseHeadBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    padding: 0,
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },
  collapseChev: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    color: "var(--text-muted)",
    transition: "all 0.18s ease",
  },
  collapseBody: {
    paddingTop: 14,
    marginTop: 14,
    borderTop: "1px dashed var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  collapseHint: {
    fontSize: 12,
    color: "var(--text-muted)",
    padding: "8px 12px",
    background: "var(--primary-soft)",
    borderLeft: "3px solid var(--primary)",
    borderRadius: 8,
    lineHeight: 1.5,
  },

  /* Item list (paradas/anchors) */
  itemList: { display: "flex", flexDirection: "column", gap: 6 },
  listEmpty: {
    padding: "16px 14px",
    background: "var(--surface-soft)",
    border: "1px dashed var(--border-strong)",
    borderRadius: 10,
    fontSize: 12.5,
    color: "var(--text-muted)",
    textAlign: "center",
  },
  itemRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 12px",
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    transition: "all 0.18s ease",
  },
  itemOrder: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 12,
    minWidth: 28,
    height: 28,
    padding: "0 8px",
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    letterSpacing: "-0.02em",
  },
  itemMain: { flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  iconBtnSubtle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    transition: "all 0.15s ease",
    cursor: "pointer",
  },
  confirmRemove: {
    height: 28,
    padding: "0 10px",
    borderRadius: 8,
    background: "var(--danger)",
    color: "white",
    fontFamily: "var(--font-display)",
    fontSize: 11.5,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    transition: "all 0.18s ease",
  },

  coordDisplay: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 500,
  },

  /* Row & Field */
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  /* Cores */
  colorRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 10px",
  },
  colorSwatch: (c, on) => ({
    width: 26,
    height: 26,
    borderRadius: 8,
    background: c,
    border: on ? "2px solid var(--text)" : "2px solid transparent",
    boxShadow: on ? `0 0 0 3px ${c}33, 0 4px 10px -2px ${c}66` : "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),
  colorInputWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    paddingLeft: 8,
    borderLeft: "1px solid var(--border)",
  },
  colorInput: {
    width: 28,
    height: 28,
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  colorInputLabel: { fontSize: 11, color: "var(--text-muted)", fontWeight: 600 },

  /* Tipo card choice */
  cardChoiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
  },
  cardChoice: (on) => ({
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 14px",
    borderRadius: 12,
    background: on ? "var(--primary-soft)" : "var(--surface-soft)",
    border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.18s ease",
  }),
  cardChoiceTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardChoiceLabel: {
    fontFamily: "var(--font-display)",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  cardChoiceCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "var(--primary)",
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardChoiceDesc: { fontSize: 11.5, color: "var(--text-muted)" },

  /* Pill */
  pillRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  pill: (on) => ({
    padding: "7px 12px",
    borderRadius: 999,
    border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
    background: on ? "var(--primary-soft)" : "var(--surface-soft)",
    color: on ? "var(--primary)" : "var(--text-soft)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.18s ease",
  }),

  /* Input */
  iconInputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  iconInputIcon: {
    position: "absolute",
    left: 10,
    color: "var(--text-muted)",
    pointerEvents: "none",
  },

  /* Number */
  numberWrap: { position: "relative", display: "flex", alignItems: "center" },
  numberSuffix: {
    position: "absolute",
    right: 10,
    fontSize: 11,
    color: "var(--text-muted)",
    fontWeight: 600,
    pointerEvents: "none",
  },

  /* Features */
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },
  featureCard: (on) => ({
    padding: "12px 14px",
    borderRadius: 12,
    background: on ? "var(--success-soft)" : "var(--surface-soft)",
    border: `1px solid ${on ? "rgba(22,163,74,0.4)" : "var(--border)"}`,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.18s ease",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }),
  featureTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  featureLabel: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  featureDesc: { fontSize: 11.5, color: "var(--text-muted)" },

  /* Switch */
  switchTrack: (on) => ({
    width: 32,
    height: 18,
    borderRadius: 999,
    background: on ? "var(--success)" : "var(--border-strong)",
    position: "relative",
    transition: "background 0.2s ease",
    flexShrink: 0,
  }),
  switchKnob: (on) => ({
    position: "absolute",
    top: 2,
    left: on ? 16 : 2,
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "white",
    transition: "left 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
  }),

  /* Tags */
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: 8,
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    minHeight: 42,
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 4px 4px 10px",
    borderRadius: 999,
    background: "var(--primary-soft)",
    color: "var(--primary)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    fontWeight: 700,
    transition: "transform 0.15s ease",
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--primary)",
    cursor: "pointer",
  },
  tagInput: {
    flex: 1,
    minWidth: 140,
    border: "none",
    background: "transparent",
    height: 26,
    padding: "0 4px",
    boxShadow: "none",
  },

  /* Toggles */
  toggleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 8,
  },
  toggleRow: (on) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    background: "var(--surface-soft)",
    border: `1px solid ${on ? "rgba(22,163,74,0.3)" : "var(--border)"}`,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.18s ease",
  }),
  toggleRowText: { flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  toggleRowLabel: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  toggleRowDesc: { fontSize: 11.5, color: "var(--text-muted)" },

  /* Meta */
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  meta: {
    padding: "10px 12px",
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    borderRadius: 10,
  },
  metaLabel: {
    fontSize: 10.5,
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text)",
    wordBreak: "break-all",
  },

  /* Danger */
  dangerHint: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    lineHeight: 1.5,
    padding: "10px 12px",
    background: "var(--danger-soft)",
    borderLeft: "3px solid var(--danger)",
    borderRadius: 8,
  },
  dangerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 8,
  },
  dangerCard: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: "var(--surface-soft)",
    transition: "all 0.18s ease",
  },
  dangerTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  dangerDesc: { fontSize: 11.5, color: "var(--text-muted)", flex: 1 },
  dangerActions: { display: "flex", gap: 6, marginTop: 4 },
  dangerBtn: {
    marginTop: 6,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid",
    background: "var(--surface)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    width: "fit-content",
    transition: "all 0.18s ease",
  },
  confirmBtn: {
    height: 34,
    padding: "0 14px",
    borderRadius: 8,
    color: "white",
    fontFamily: "var(--font-display)",
    fontSize: 12.5,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
};

/* CSS local */
const LOCAL_CSS = `
.rs-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13.5px;
  font-family: var(--font-body);
  font-weight: 500;
  transition: all 0.18s ease;
  outline: none;
}
.rs-input:hover { border-color: var(--border-strong); }
.rs-input:focus {
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.rs-input::placeholder { color: var(--text-dim); }
.rs-input-icon { padding-left: 34px; }
.rs-number-input { padding-right: 44px; }
.rs-textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
  min-height: 90px;
  font-family: var(--font-body);
  line-height: 1.5;
}

.rs-row-name {
  height: 32px !important;
  padding: 0 10px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
}
.rs-item-row:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.rs-icon-btn:hover {
  background: var(--hover);
  color: var(--text) !important;
}
.rs-icon-btn:hover[title^="Remover"] { color: var(--danger) !important; }
.rs-jump-btn {
  height: 32px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  flex-shrink: 0;
}
.rs-jump-btn:hover { transform: translateY(-1px); border-color: var(--primary); color: var(--primary); }

.rs-stat:hover { transform: translateY(-1px); border-color: var(--border-strong); }
.rs-swatch:hover { transform: scale(1.1); }
.rs-choice:hover { transform: translateY(-1px); border-color: var(--border-strong); }
.rs-pill:hover { transform: translateY(-1px); }
.rs-feature:hover { transform: translateY(-1px); border-color: var(--border-strong); }
.rs-toggle-row:hover { border-color: var(--border-strong); transform: translateX(2px); }
.rs-tag:hover { transform: translateY(-1px); }
.rs-danger:hover { transform: translateY(-1px); }
.rs-confirm:hover { transform: translateY(-1px); filter: brightness(1.05); }
`;
