import React, { useEffect, useState } from "react";
import SpeedGauge from "../components/SpeedGauge";
import StatusBar from "../components/StatusBar";
import { formatDistance } from "../lib/geo";
import {
  Alert,
  Clock,
  Database,
  Gauge,
  Loader,
  MapPin,
  Route,
  Stop,
  Target,
  Wifi,
  WifiOff,
} from "../components/Icons";

function useElapsed(startedAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function TrackingScreen({
  trip,
  position,
  gpsError,
  connected,
  sessionError,
  pending,
  sent,
  lastSentAt,
  distance,
  screenAwake,
  backgroundTracking,
  status,
  onReportStatus,
  onStop,
}) {
  const [confirming, setConfirming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const elapsed = useElapsed(trip.startedAt);

  const speed = position?.speed != null ? position.speed : 0;
  const waitingFix = !position && !gpsError;

  async function handleStop() {
    setStopping(true);
    try {
      await onStop();
    } finally {
      setStopping(false);
      setConfirming(false);
    }
  }

  return (
    <div className="app">
      <header className="hero hero-tight">
        <div style={S.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={S.kicker}>Em viagem</div>
            <div style={S.plate}>{trip.plate || "Sem placa"}</div>
          </div>
          <span className={`chip ${connected ? "chip-hero-live" : "chip-hero-off"}`}>
            {connected ? <span className="dot" /> : <WifiOff size={13} />}
            {connected ? "Ao vivo" : "Offline"}
          </span>
        </div>

        <div style={S.heroMeta}>
          <span style={S.heroRoute}>
            <Route size={15} />
            {trip.routeName || "Sem linha"}
          </span>
          <span style={S.heroTimer}>
            <Clock size={14} />
            {elapsed}
          </span>
        </div>
      </header>

      <div className="content content-overlap">
        <div className="card fade-in" style={S.gaugeCard}>
          <SpeedGauge speed={speed} stale={!position} />
          {backgroundTracking && (
            <div style={S.bgNote}>
              <span className="dot" style={{ color: "var(--online)" }} />
              Rastreando mesmo com a tela apagada
            </div>
          )}
        </div>

        {/* Avisos */}
        {sessionError && (
          <div className="alert alert-danger">
            <Alert size={17} style={S.alertIcon} />
            <span>{sessionError}</span>
          </div>
        )}
        {gpsError && (
          <div className="alert alert-danger">
            <Alert size={17} style={S.alertIcon} />
            <span>{gpsError}</span>
          </div>
        )}
        {waitingFix && (
          <div className="alert alert-info">
            <Loader size={17} className="spin" style={S.alertIcon} />
            <span>Procurando sinal de GPS…</span>
          </div>
        )}
        {pending > 0 && (
          <div className="alert alert-warn">
            <Database size={17} style={S.alertIcon} />
            <span>
              {pending} {pending === 1 ? "posição guardada" : "posições guardadas"} no aparelho.
              Sobem sozinhas quando a conexão voltar.
            </span>
          </div>
        )}
        {!backgroundTracking && !screenAwake && (
          <div className="alert alert-warn">
            <Alert size={17} style={S.alertIcon} />
            <span>Mantenha esta tela aberta e o celular desbloqueado para não interromper o envio.</span>
          </div>
        )}

        {/* Posição atual */}
        <div className="card" style={S.posCard}>
          <div style={S.posIcon}>
            <Target size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="tile-label" style={{ marginBottom: 4 }}>Posição atual</div>
            <div style={S.posValue}>
              {position
                ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
                : "aguardando GPS…"}
            </div>
          </div>
        </div>

        <StatusBar status={status} onReport={onReportStatus} />

        {/* Indicadores */}
        <div className="tiles">
          <Tile
            icon={<MapPin size={13} />}
            label="Percorrido"
            value={formatDistance(distance)}
          />
          <Tile
            icon={<Gauge size={13} />}
            label="Precisão"
            value={position?.accuracy != null ? `± ${Math.round(position.accuracy)} m` : "—"}
          />
          <Tile
            icon={connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            label="Enviados"
            value={String(sent)}
          />
          <Tile
            icon={<Clock size={13} />}
            label="Último envio"
            value={
              lastSentAt
                ? new Date(lastSentAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"
            }
          />
        </div>

        <div style={S.footnote}>Viagem {trip.tripId.slice(0, 8)}</div>
      </div>

      <div className="action-bar">
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>
          <Stop size={18} /> Encerrar viagem
        </button>
      </div>

      {confirming && (
        <>
          <div className="backdrop" onClick={() => !stopping && setConfirming(false)} />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-grip" />
            <div style={S.sheetTitle}>Encerrar a viagem?</div>
            <div style={S.sheetText}>
              O envio de localização para a central vai parar e a viagem de{" "}
              <strong>{trip.plate}</strong> será fechada.
            </div>
            <div style={S.sheetActions}>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={stopping}>
                Voltar
              </button>
              <button className="btn btn-danger" onClick={handleStop} disabled={stopping}>
                {stopping ? <Loader size={18} className="spin" /> : "Encerrar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ icon, label, value, small }) {
  return (
    <div className="tile">
      <div className="tile-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`tile-value${small ? " tile-value-sm" : ""}`}>{value}</div>
    </div>
  );
}

const S = {
  heroTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--on-hero-soft)",
  },
  plate: {
    fontFamily: "var(--font-display)",
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: "0.03em",
    lineHeight: 1.1,
    marginTop: 2,
  },
  heroMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  heroRoute: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--on-hero-soft)",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  heroTimer: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    background: "var(--on-hero-dim)",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13.5,
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
  },
  gaugeCard: { padding: "16px 20px 18px", textAlign: "center" },
  footnote: {
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
    opacity: 0.75,
  },
  bgNote: {
    marginTop: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  alertIcon: { flexShrink: 0, marginTop: 1 },
  posCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 18px",
  },
  posIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    background: "var(--primary-soft)",
    color: "var(--primary-strong)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  posValue: {
    fontFamily: "var(--font-display)",
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  sheetTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  sheetText: {
    fontSize: 14,
    color: "var(--text-muted)",
    marginTop: 8,
    lineHeight: 1.5,
  },
  sheetActions: { display: "flex", gap: 12, marginTop: 22 },
};
