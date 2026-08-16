import React, { useEffect, useState } from "react";
import {
  createDriver,
  createVehicle,
  deleteDriver,
  deleteVehicle,
  getDrivers,
  getVehicles,
  updateDriver,
  updateVehicle,
} from "../hooks/api";
import { Bus, Check, Plus, Trash, Users, X } from "../components/Icons";
import Toast from "../components/Toast";

const EMPTY_VEHICLE = { plate: "", model: "", capacity: 40 };
const EMPTY_DRIVER = { name: "", registration: "", password: "", phone: "" };

export default function FleetPage({ buses }) {
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER);
  const [saving, setSaving] = useState(false);

  const onlinePlates = new Set(buses.filter((b) => b.online && b.plate).map((b) => b.plate));

  function reload() {
    getVehicles().then(setVehicles).catch(() => {});
    getDrivers().then(setDrivers).catch(() => {});
  }

  useEffect(reload, []);

  function fail(err) {
    setToast({ kind: "error", title: "Não foi possível salvar", message: err.message });
  }

  async function submit(action, resetForm, title) {
    setSaving(true);
    try {
      await action();
      resetForm();
      reload();
      setToast({ kind: "success", title });
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kind, item) {
    try {
      if (kind === "vehicle") await updateVehicle(item.id, { active: !item.active });
      else await updateDriver(item.id, { active: !item.active });
      reload();
    } catch (err) {
      fail(err);
    }
  }

  async function remove(kind, item) {
    const label = kind === "vehicle" ? `o veículo ${item.plate}` : `o motorista ${item.name}`;
    if (!window.confirm(`Remover ${label}? O histórico de viagens continua no banco.`)) return;
    try {
      if (kind === "vehicle") await deleteVehicle(item.id);
      else await deleteDriver(item.id);
      setToast({ kind: "success", title: "Removido" });
      reload();
    } catch (err) {
      fail(err);
    }
  }

  async function resetPassword(driver) {
    const password = window.prompt(`Nova senha para ${driver.name}:`);
    if (!password) return;
    try {
      await updateDriver(driver.id, { password });
      setToast({ kind: "success", title: "Senha atualizada", message: driver.name });
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>Frota</h1>
          <p style={S.subtitle}>
            Placas e motoristas usados no login do app. Tudo fica salvo no banco.
          </p>
        </div>
        <div style={S.tabs}>
          <button style={S.tab(tab === "vehicles")} onClick={() => setTab("vehicles")}>
            <Bus size={15} /> Veículos ({vehicles.length})
          </button>
          <button style={S.tab(tab === "drivers")} onClick={() => setTab("drivers")}>
            <Users size={15} /> Motoristas ({drivers.length})
          </button>
        </div>
      </header>

      {tab === "vehicles" ? (
        <>
          <form
            style={S.form}
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => createVehicle(vehicleForm),
                () => setVehicleForm(EMPTY_VEHICLE),
                "Veículo cadastrado"
              );
            }}
          >
            <Field label="Placa" width={150}>
              <input
                className="input"
                placeholder="ABC1D23"
                value={vehicleForm.plate}
                maxLength={8}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })
                }
                required
              />
            </Field>
            <Field label="Modelo" grow>
              <input
                className="input"
                placeholder="Mercedes-Benz O500"
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
              />
            </Field>
            <Field label="Lotação" width={110}>
              <input
                className="input"
                type="number"
                min={1}
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
              />
            </Field>
            <button className="btn btn-primary" style={S.addBtn} disabled={saving}>
              <Plus size={15} /> Adicionar
            </button>
          </form>

          <div style={S.grid}>
            {vehicles.map((v) => (
              <article key={v.id} style={S.card(v.active)}>
                <div style={S.cardTop}>
                  <div style={S.plate}>{v.plate}</div>
                  {onlinePlates.has(v.plate) ? (
                    <span className="chip chip-success">
                      <span className="live-dot" /> Em viagem
                    </span>
                  ) : (
                    <span className={`chip ${v.active ? "chip-muted" : "chip-danger"}`}>
                      {v.active ? "Na garagem" : "Inativo"}
                    </span>
                  )}
                </div>
                <div style={S.cardText}>{v.model || "Modelo não informado"}</div>
                <div style={S.cardMeta}>{v.capacity} passageiros</div>
                <div style={S.actions}>
                  <button style={S.action} onClick={() => toggleActive("vehicle", v)}>
                    {v.active ? <X size={14} /> : <Check size={14} />}
                    {v.active ? "Desativar" : "Ativar"}
                  </button>
                  <button style={S.actionDanger} onClick={() => remove("vehicle", v)}>
                    <Trash size={14} /> Remover
                  </button>
                </div>
              </article>
            ))}
            {vehicles.length === 0 && <Empty text="Nenhum veículo cadastrado ainda." />}
          </div>
        </>
      ) : (
        <>
          <form
            style={S.form}
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                () => createDriver(driverForm),
                () => setDriverForm(EMPTY_DRIVER),
                "Motorista cadastrado"
              );
            }}
          >
            <Field label="Nome" grow>
              <input
                className="input"
                placeholder="João Silva"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Matrícula" width={130}>
              <input
                className="input"
                placeholder="1001"
                value={driverForm.registration}
                onChange={(e) => setDriverForm({ ...driverForm, registration: e.target.value })}
                required
              />
            </Field>
            <Field label="Senha" width={140}>
              <input
                className="input"
                type="text"
                placeholder="mín. 3 caracteres"
                value={driverForm.password}
                onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                required
              />
            </Field>
            <Field label="Telefone" width={150}>
              <input
                className="input"
                placeholder="(12) 99999-0000"
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              />
            </Field>
            <button className="btn btn-primary" style={S.addBtn} disabled={saving}>
              <Plus size={15} /> Adicionar
            </button>
          </form>

          <div style={S.grid}>
            {drivers.map((d) => {
              const driving = buses.find((b) => b.online && b.driverId === d.id);
              return (
                <article key={d.id} style={S.card(d.active)}>
                  <div style={S.cardTop}>
                    <div style={S.driverName}>{d.name}</div>
                    {driving ? (
                      <span className="chip chip-success">
                        <span className="live-dot" /> {driving.plate || "Em viagem"}
                      </span>
                    ) : (
                      <span className={`chip ${d.active ? "chip-muted" : "chip-danger"}`}>
                        {d.active ? "Disponível" : "Inativo"}
                      </span>
                    )}
                  </div>
                  <div style={S.cardText}>Matrícula {d.registration}</div>
                  <div style={S.cardMeta}>{d.phone || "Sem telefone"}</div>
                  <div style={S.actions}>
                    <button style={S.action} onClick={() => resetPassword(d)}>
                      Trocar senha
                    </button>
                    <button style={S.action} onClick={() => toggleActive("driver", d)}>
                      {d.active ? <X size={14} /> : <Check size={14} />}
                      {d.active ? "Desativar" : "Ativar"}
                    </button>
                    <button style={S.actionDanger} onClick={() => remove("driver", d)}>
                      <Trash size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
            {drivers.length === 0 && <Empty text="Nenhum motorista cadastrado ainda." />}
          </div>
        </>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function Field({ label, children, width, grow }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width, flex: grow ? 1 : undefined }}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={S.empty}>{text}</div>;
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
    marginBottom: 22,
    flexWrap: "wrap",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "var(--text)",
  },
  subtitle: { fontSize: 13, color: "var(--text-muted)", marginTop: 6 },
  tabs: { display: "flex", gap: 6 },
  tab: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 15px",
    borderRadius: 10,
    background: active ? "var(--primary-soft)" : "var(--surface)",
    border: "1px solid var(--border)",
    color: active ? "var(--primary)" : "var(--text-soft)",
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 600,
  }),
  form: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    boxShadow: "var(--shadow-sm)",
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
  },
  addBtn: { height: 38, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 7 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: (active) => ({
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "var(--shadow-sm)",
    opacity: active ? 1 : 0.6,
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  plate: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "0.04em",
    color: "var(--text)",
  },
  driverName: {
    fontFamily: "var(--font-display)",
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text)",
  },
  cardText: { fontSize: 13, color: "var(--text-soft)" },
  cardMeta: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  actions: {
    display: "flex",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid var(--border)",
    flexWrap: "wrap",
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    borderRadius: 8,
    background: "var(--surface-soft)",
    border: "1px solid var(--border)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-soft)",
  },
  actionDanger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    borderRadius: 8,
    background: "var(--danger-soft)",
    border: "1px solid transparent",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--danger)",
  },
  empty: {
    gridColumn: "1 / -1",
    background: "var(--surface)",
    border: "1.5px dashed var(--border-strong)",
    borderRadius: 16,
    padding: "40px 20px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: 13.5,
  },
};
