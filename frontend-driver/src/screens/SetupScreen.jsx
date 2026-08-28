import React, { useEffect, useMemo, useState } from "react";
import { getVehicles } from "../lib/api";
import PickerField from "../components/PickerField";
import { Alert, Bus, Loader, LogOut, Moon, Play, Route, Sun, WifiOff } from "../components/Icons";

export default function SetupScreen({ driver, routes, connected, theme, onToggleTheme, onStart, onSignOut }) {
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

  const activeRoutes = useMemo(() => routes.filter((r) => r.active !== false), [routes]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        title: v.plate,
        subtitle: [v.model, v.capacity ? `${v.capacity} lugares` : null].filter(Boolean).join(" · "),
        mono: true,
      })),
    [vehicles]
  );

  const routeOptions = useMemo(
    () =>
      activeRoutes.map((r) => ({
        value: r.id,
        title: r.name,
        subtitle: r.stops?.length
          ? `${r.stops.length} ${r.stops.length === 1 ? "parada" : "paradas"}`
          : null,
        color: r.color,
      })),
    [activeRoutes]
  );

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
          <button
            style={S.iconBtn}
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
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
          <PickerField
            id="vehicle"
            label="Placa do ônibus"
            icon={<Bus size={19} />}
            value={vehicleId}
            options={vehicleOptions}
            onChange={setVehicleId}
            placeholder="Selecione a placa"
            sheetTitle="Escolha a placa"
            loading={loadingVehicles}
            loadingText="Carregando placas…"
            emptyText="Nenhum veículo cadastrado"
          />

          <PickerField
            id="route"
            label="Linha"
            icon={<Route size={19} />}
            value={routeId}
            options={routeOptions}
            onChange={setRouteId}
            placeholder="Selecione a linha"
            sheetTitle="Escolha a linha"
            emptyText="Nenhuma linha disponível"
          />

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
  hint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
};
