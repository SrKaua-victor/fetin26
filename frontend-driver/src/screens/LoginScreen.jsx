import React, { useState } from "react";
import { Bus, IdCard, Lock, Alert, Loader, Wifi } from "../components/Icons";
import { isNative } from "../lib/api";

const LAST_REGISTRATION = "bustrack.driver.lastRegistration";

export default function LoginScreen({ onSignIn, serverUrl, onServerChange }) {
  const [registration, setRegistration] = useState(
    () => localStorage.getItem(LAST_REGISTRATION) || ""
  );
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(serverUrl || "");
  const [editingServer, setEditingServer] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    try {
      // No app nativo o endereço do servidor tem que estar certo antes de tentar entrar
      if (isNative) onServerChange(server);
      await onSignIn(registration.trim(), password);
      localStorage.setItem(LAST_REGISTRATION, registration.trim());
      setEditingServer(false);
    } catch (err) {
      setError(err.message);
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="hero" style={S.hero}>
        <div style={S.mark}>
          <Bus size={30} />
        </div>
        <h1 style={S.title}>BusTrack</h1>
        <p style={S.subtitle}>App do Motorista</p>
      </header>

      <form className="content content-overlap" onSubmit={handleSubmit}>
        <div className="card fade-in">
          <label className="label" htmlFor="registration">
            Matrícula
          </label>
          <div style={S.inputWrap}>
            <IdCard size={19} style={S.inputIcon} />
            <input
              id="registration"
              className="field"
              style={{ paddingLeft: 48 }}
              inputMode="numeric"
              autoComplete="username"
              placeholder="Ex: 1001"
              value={registration}
              onChange={(e) => setRegistration(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <label className="label" htmlFor="password" style={{ marginTop: 20 }}>
            Senha
          </label>
          <div style={S.inputWrap}>
            <Lock size={19} style={S.inputIcon} />
            <input
              id="password"
              className="field"
              style={{ paddingLeft: 48 }}
              type="password"
              autoComplete="current-password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {isNative && (editingServer || !server) && (
            <>
              <label className="label" htmlFor="server" style={{ marginTop: 20 }}>
                Endereço do servidor
              </label>
              <div style={S.inputWrap}>
                <Wifi size={19} style={S.inputIcon} />
                <input
                  id="server"
                  className="field"
                  style={{ paddingLeft: 48 }}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://meu-servidor.exemplo.com"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 18 }}>
              <Alert size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 22 }}
            disabled={loading || !registration.trim() || !password}
          >
            {loading ? (
              <>
                <Loader size={18} className="spin" /> Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </div>

        {isNative && !editingServer && server && (
          <button type="button" style={S.serverBtn} onClick={() => setEditingServer(true)}>
            Servidor: {server.replace(/^https?:\/\//, "")}
          </button>
        )}

        <p style={S.footer}>Problemas para entrar? Procure a administração da garagem.</p>
      </form>
    </div>
  );
}

const S = {
  hero: { textAlign: "center", paddingBottom: 62 },
  mark: {
    width: 74,
    height: 74,
    margin: "6px auto 16px",
    borderRadius: 22,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.035em",
    color: "var(--on-hero)",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--on-hero-soft)",
    marginTop: 4,
    fontWeight: 600,
  },
  inputWrap: { position: "relative" },
  inputIcon: {
    position: "absolute",
    left: 17,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  serverBtn: {
    display: "block",
    margin: "0 auto",
    padding: "8px 15px",
    borderRadius: 999,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    fontSize: 12.5,
    fontWeight: 600,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    paddingBottom: "calc(var(--safe-bottom) + 6px)",
    textAlign: "center",
    fontSize: 12.5,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
};
