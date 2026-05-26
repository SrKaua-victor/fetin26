import React from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Icon = ({ size = 18, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    {children}
  </svg>
);

export const Search    = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>;
export const Plus      = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const Sun       = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></Icon>;
export const Moon      = (p) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></Icon>;
export const Bell      = (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>;
export const Bus       = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/></Icon>;
export const MapPin    = (p) => <Icon {...p}><path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></Icon>;
export const Map       = (p) => <Icon {...p}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></Icon>;
export const Route     = (p) => <Icon {...p}><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a4 4 0 0 0 0-8h-6a4 4 0 0 1 0-8h3"/></Icon>;
export const ChartBar  = (p) => <Icon {...p}><path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="0.6"/><rect x="10" y="7"  width="3" height="11" rx="0.6"/><rect x="15" y="14" width="3" height="4"  rx="0.6"/></Icon>;
export const Clock     = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
export const Gauge     = (p) => <Icon {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-4V6m6.5 8a7 7 0 1 0-13 0"/></Icon>;
export const Users     = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-6-6"/></Icon>;
export const Compass   = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></Icon>;
export const Download  = (p) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>;
export const Copy      = (p) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></Icon>;
export const Share     = (p) => <Icon {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></Icon>;
export const Trash     = (p) => <Icon {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></Icon>;
export const Edit      = (p) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></Icon>;
export const Check     = (p) => <Icon {...p}><path d="m5 12 5 5 9-12"/></Icon>;
export const X         = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>;
export const ChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
export const ChevronRight = (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
export const Settings  = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Icon>;
export const Activity  = (p) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>;
export const Wifi      = (p) => <Icon {...p}><path d="M5 12.5A11 11 0 0 1 19 12.5M8.5 16A6 6 0 0 1 15.5 16M12 19.5h.01"/></Icon>;
export const ArrowUp   = (p) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Icon>;
export const Move      = (p) => <Icon {...p}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></Icon>;
export const Layers    = (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></Icon>;
export const Eye       = (p) => <Icon {...p}><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>;
