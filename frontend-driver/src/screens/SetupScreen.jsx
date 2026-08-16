import React, { useEffect, useState } from "react";
import { getVehicles } from "../lib/api";
import { Alert, Bus, Loader, LogOut, Play, Route, WifiOff } from "../components/Icons";

export default function SetupScreen({ driver, routes, connected, onStart, onSignOut }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getVehicles()
      .then((list) => {
        setVehicles(list);
        // Repõe a última placa usada pelo motorista
        const last = localStorage.getItem("bustrack.driver.lastVehicle");
        if (last && list.some((v) => v.id === last)) setVehicleId(last);
        else if (list.length === 1) setVehicleId(list[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingVehicles(false));
  }, []);

  const activeRoutes = routes.filter((r) => r.active !== false);

  useEffect(() => {
    const last = localStorage.getItem("bustrack.driver.lastRoute");
    if (last && activeRoutes.some((r) => r.id === last)) setRouteId(last);
    else if (activeRoutes.length === 1) setRouteId(activeRoutes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes.length]);

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const route = activeRoutes.find((r) => r.id === routeId);
      localStorage.setItem("bustrack.driver.lastVehicle", vehicleId);
      localStorage.setItem("bustrack.driver.lastRoute", routeId);
      await onStart({ vehicle, route });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const route = activeRoutes.find((r) => r.id === routeId);
  const ready = vehicleId && routeId && connected && !starting;
  const initials = (driver?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="app">
      <header className="hero hero-tight">
        <div style={S.heroTop}>
          <div style={S.avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.hello}>Boa viagem,</div>
            <div style={S.name}>{driver?.name}</div>
            <div style={S.registration}>Matrícula {driver?.registration}</div>
          </div>
          <button style={S.iconBtn} onClick={onSignOut} aria-label="Sair" title="Sair">
            <LogOut size={19} />
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <span className={`chip ${connected ? "chip-hero-live" : "chip-hero-off"}`}>
            {connected ? <span className="dot" /> : <WifiOff size={13} />}
            {connected ? "Conectado à central" : "Sem conexão com a central"}
          </span>
        </div>
      </header>

      <div className="content content-overlap">
        <div className="card fade-in">
          <label className="label" htmlFor="vehicle">
            Placa do ônibus
          </label>
          <select
            id="vehicle"
            className="field"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={loadingVehicles || vehicles.length === 0}
          >
            <option value="">
              {loadingVehicles ? "Carregando placas…" : "Selecione a placa"}
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate}
                {v.model ? ` — ${v.model}` : ""}
              </option>
            ))}
          </select>

          <label className="label" htmlFor="route" style={{ marginTop: 20 }}>
            Linha
          </label>
          <select
            id="route"
            className="field"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            disabled={activeRoutes.length === 0}
          >
            <option value="">
              {activeRoutes.length === 0 ? "Nenhuma linha disponível" : "Selecione a linha"}
            </option>
            {activeRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {!loadingVehicles && vehicles.length === 0 && (
            <div className="alert alert-warn" style={{ marginTop: 18 }}>
              <Alert size={17} style={S.alertIcon} />
              <span>Nenhum veículo cadastrado. Peça para a administração cadastrar as placas da frota.</span>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 18 }}>
              <Alert size={17} style={S.alertIcon} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Confirmação do que vai entrar em serviço */}
        <div style={S.preview}>
          <div style={S.previewItem}>
            <span style={S.previewIcon(!!vehicle)}>
              <Bus size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="tile-label" style={{ marginBottom: 2 }}>Veículo</div>
              <div style={S.previewValue(!!vehicle)}>{vehicle?.plate || "não selecionado"}</div>
            </div>
          </div>
          <div style={S.previewDivider} />
          <div style={S.previewItem}>
            <span style={S.previewIcon(!!route)}>
              <Route size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="tile-label" style={{ marginBottom: 2 }}>Linha</div>
              <div style={S.previewValue(!!route)}>{route?.name || "não selecionada"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleStart} disabled={!ready}>
          {starting ? (
            <>
              <Loader size={19} className="spin" /> Iniciando…
            </>
          ) : (
            <>
              <Play size={19} /> Iniciar viagem
            </>
          )}
        </button>
        <p style={S.hint}>
          Ao iniciar, o app envia sua localização para a central até você encerrar a viagem.
        </p>
      </div>
    </div>
  );
}

const S = {
  heroTop: { display: "flex", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "var(--on-hero-dim)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: "0.02em",
    flexShrink: 0,
  },
  hello: { fontSize: 13, color: "var(--on-hero-soft)", fontWeight: 600 },
  name: {
    fontFamily: "var(--font-display)",
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  registration: { fontSize: 12.5, color: "var(--on-hero-soft)", marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "var(--on-hero-dim)",
    color: "var(--on-hero)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertIcon: { flexShrink: 0, marginTop: 1 },
  preview: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "4px 18px",
  },
  previewItem: { display: "flex", alignItems: "center", gap: 13, padding: "14px 0" },
  previewIcon: (filled) => ({
    width: 38,
    height: 38,
    borderRadius: 12,
    background: filled ? "var(--primary-soft)" : "var(--surface3)",
    color: filled ? "var(--primary-strong)" : "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.2s, color 0.2s",
  }),
  previewValue: (filled) => ({
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "-0.01em",
    color: filled ? "var(--text)" : "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  previewDivider: { height: 1, background: "var(--border)" },
  hint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
};
