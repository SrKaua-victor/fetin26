import React, { useState } from "react";
import { Alert, Bus, Check, Clock, Loader, Users } from "./Icons";

/**
 * Ocorrências que o motorista pode informar em um toque.
 *
 * Os códigos são os mesmos validados no servidor. Poucas opções e de propósito:
 * quem está dirigindo não vai ler uma lista, e cada item precisa ser
 * reconhecível de relance.
 */
export const REASONS = [
  { code: "traffic", label: "Trânsito", Icon: Clock },
  { code: "accident", label: "Acidente", Icon: Alert },
  { code: "breakdown", label: "Pane", Icon: Bus },
  { code: "boarding", label: "Embarque", Icon: Users },
];

export function reasonLabel(code) {
  return REASONS.find((r) => r.code === code)?.label || "Ocorrência";
}

/** "há 12 min" a partir do horário em que a ocorrência começou. */
function since(iso) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h${String(min % 60).padStart(2, "0")}`;
}

/**
 * Barra de ocorrências da tela de viagem.
 *
 * `status` vem do servidor, não do estado local: assim o que o motorista vê é o
 * que o passageiro está vendo, mesmo depois de reconectar ou trocar de aparelho.
 */
export default function StatusBar({ status, onReport }) {
  const [sending, setSending] = useState(null);

  async function report(code) {
    if (sending) return;
    setSending(code ?? "clear");
    try {
      await onReport(code);
    } finally {
      setSending(null);
    }
  }

  if (status?.reason) {
    return (
      <div style={S.active}>
        <div style={S.activeTop}>
          <Alert size={17} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.activeLabel}>{reasonLabel(status.reason)}</div>
            <div style={S.activeSince}>
              Passageiros avisados · {since(status.since)}
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={S.clearBtn}
          onClick={() => report(null)}
          disabled={!!sending}
        >
          {sending ? (
            <>
              <Loader size={16} className="spin" /> Normalizando…
            </>
          ) : (
            <>
              <Check size={16} /> Voltou ao normal
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="tile-label" style={{ marginBottom: 9 }}>
        Avisar os passageiros
      </div>
      <div style={S.grid}>
        {REASONS.map(({ code, label, Icon }) => (
          <button
            key={code}
            style={S.button}
            onClick={() => report(code)}
            disabled={!!sending}
          >
            {sending === code ? (
              <Loader size={19} className="spin" />
            ) : (
              <Icon size={19} />
            )}
            <span style={S.buttonLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const S = {
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  button: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    // Alvo alto: o motorista toca isto com o ônibus em movimento
    minHeight: 74,
    padding: "10px 4px",
    borderRadius: "var(--radius-sm)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-soft)",
    boxShadow: "var(--shadow-sm)",
    transition: "transform 0.12s ease, background 0.15s",
  },
  buttonLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    letterSpacing: "-0.01em",
  },
  active: {
    background: "var(--warn-soft)",
    border: "1px solid var(--warn)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
  },
  activeTop: { display: "flex", alignItems: "flex-start", gap: 11, color: "var(--warn)" },
  activeLabel: {
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "-0.01em",
  },
  activeSince: { fontSize: 12.5, marginTop: 2, opacity: 0.85 },
  clearBtn: { width: "100%", marginTop: 12, minHeight: 44 },
};
