import React, { useEffect } from "react";
import { Check, X } from "./Icons";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, toast.duration ?? 3500);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const colors = {
    success: { bg: "var(--success-soft)", fg: "var(--success)", Icon: Check },
    error:   { bg: "var(--danger-soft)",  fg: "var(--danger)",  Icon: X },
    info:    { bg: "var(--primary-soft)", fg: "var(--primary)", Icon: Check },
  };
  const { bg, fg, Icon } = colors[toast.kind || "info"];

  return (
    <div
      className="slide-in-up"
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "var(--shadow-lg)",
        minWidth: 280,
        maxWidth: 460,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: bg,
          color: fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
