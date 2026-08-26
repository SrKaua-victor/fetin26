import React, { useRef, useState } from "react";
import { Bus, Users, Lock, Eye, EyeOff, X } from "./Icons";

/**
 * Entrada do painel administrativo.
 *
 * O `onLogin` recebido devolve a promessa da autenticação — é ela que controla o
 * estado de carregando e o foco de volta na senha quando a tentativa falha.
 */
export default function AdminLogin({ onLogin, error }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const ready = username.trim() && password && !loading;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!ready) return;

    setLoading(true);
    try {
      await onLogin(username.trim(), password);
      // Deu certo: o painel substitui esta tela, então não há estado a restaurar
    } catch {
      // A mensagem já chega pela prop `error`. Aqui só limpamos a senha e
      // devolvemos o cursor, para tentar de novo sem precisar clicar.
      setLoading(false);
      setPassword("");
      passwordRef.current?.focus();
    }
  }

  return (
    <main style={S.screen}>
      <form className="card animate-in" style={S.card} onSubmit={handleSubmit}>
        <div style={S.brand}>
          <span style={S.mark}>
            <Bus size={26} />
          </span>
          <div>
            <h1 style={S.title}>BusTrack</h1>
            <p style={S.subtitle}>Painel administrativo</p>
          </div>
        </div>

        <label style={S.label} htmlFor="admin-user">
          <Users size={13} />
          Usuário
        </label>
        <input
          id="admin-user"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
        />

        <label style={{ ...S.label, marginTop: 16 }} htmlFor="admin-pass">
          <Lock size={13} />
          Senha
        </label>
        <div style={S.passwordWrap}>
          <input
            id="admin-pass"
            ref={passwordRef}
            className="input"
            style={{ paddingRight: 44 }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            disabled={loading}
          />
          <button
            type="button"
            style={S.reveal}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div style={S.error} role="alert">
            <X size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn btn-primary"
          type="submit"
          style={S.submit}
          disabled={!ready}
        >
          {loading ? (
            <>
              <span className="spinner" style={S.spinnerOnPrimary} />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </button>

        <p style={S.footer}>
          O acesso é registrado. Use as credenciais da administração da garagem.
        </p>
      </form>
    </main>
  );
}

const S = {
  screen: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "var(--bg-grad, var(--bg))",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 30,
    boxShadow: "var(--shadow-lg)",
  },
  brand: { display: "flex", alignItems: "center", gap: 14, marginBottom: 28 },
  mark: {
    width: 50,
    height: 50,
    borderRadius: "var(--radius)",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 8px 20px -8px rgba(37,99,235,0.7)",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
    margin: 0,
  },
  subtitle: { fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: 7,
  },
  passwordWrap: { position: "relative" },
  reveal: {
    position: "absolute",
    right: 4,
    top: 0,
    height: 40,
    width: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-dim)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  error: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 18,
    padding: "11px 13px",
    borderRadius: "var(--radius-sm)",
    background: "var(--danger-soft)",
    color: "var(--danger)",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 500,
  },
  submit: { width: "100%", height: 44, marginTop: 22, fontSize: 14.5 },
  spinnerOnPrimary: {
    borderColor: "rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
  },
  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    color: "var(--text-dim)",
    lineHeight: 1.5,
  },
};
