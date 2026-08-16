import React from "react";

const MAX_SPEED = 80;      // fim da escala, em km/h
const SWEEP = 0.75;        // arco de 270°, começando embaixo à esquerda
const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = CIRCUMFERENCE * SWEEP;

/** Velocímetro circular. A cor avisa quando a velocidade sobe demais. */
export default function SpeedGauge({ speed = 0, stale = false }) {
  const value = Math.max(0, Math.min(speed, MAX_SPEED));
  const ratio = value / MAX_SPEED;

  const color = stale
    ? "var(--text-muted)"
    : speed >= 70
    ? "var(--danger)"
    : speed >= 55
    ? "var(--accent)"
    : "var(--primary)";

  return (
    <div style={S.wrap}>
      <svg viewBox="0 0 200 200" style={S.svg} aria-hidden="true">
        <g transform="rotate(135 100 100)">
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="var(--surface3)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          />
          {/* Parado não desenha o arco: com linecap redondo sobraria um ponto solto */}
          {ratio > 0.004 && (
            <circle
              cx="100" cy="100" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${ARC * ratio} ${CIRCUMFERENCE}`}
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s" }}
            />
          )}
        </g>
      </svg>

      <div style={S.center}>
        <div style={{ ...S.value, color }}>{Math.round(speed)}</div>
        <div style={S.unit}>km/h</div>
      </div>
    </div>
  );
}

const S = {
  wrap: { position: "relative", width: 214, height: 214, margin: "0 auto" },
  svg: { width: "100%", height: "100%", display: "block" },
  center: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  value: {
    fontFamily: "var(--font-display)",
    fontSize: 68,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.05em",
    fontVariantNumeric: "tabular-nums",
  },
  unit: {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
};
