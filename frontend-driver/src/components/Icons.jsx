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

export const Bus      = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/></Icon>;
export const Lock     = (p) => <Icon {...p}><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></Icon>;
export const IdCard   = (p) => <Icon {...p}><rect x="2.5" y="5" width="19" height="14" rx="3"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.2a3.8 3.8 0 0 1 7 0M14.5 10h4M14.5 14h4"/></Icon>;
export const MapPin   = (p) => <Icon {...p}><path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></Icon>;
export const Route    = (p) => <Icon {...p}><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a4 4 0 0 0 0-8h-6a4 4 0 0 1 0-8h3"/></Icon>;
export const Gauge    = (p) => <Icon {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-4V6m6.5 8a7 7 0 1 0-13 0"/></Icon>;
export const Clock    = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
export const Play     = (p) => <Icon {...p}><path d="M7 4.5 19 12 7 19.5v-15Z"/></Icon>;
export const Stop     = (p) => <Icon {...p}><rect x="6" y="6" width="12" height="12" rx="2.5"/></Icon>;
export const Power    = (p) => <Icon {...p}><path d="M12 3v9"/><path d="M6.5 6.8a8 8 0 1 0 11 0"/></Icon>;
export const Signal   = (p) => <Icon {...p}><path d="M3 20h.01M8 20v-5M13 20V9M18 20V4"/></Icon>;
export const Alert    = (p) => <Icon {...p}><path d="M12 3.5 22 20H2L12 3.5Z"/><path d="M12 10v4M12 17h.01"/></Icon>;
export const Check    = (p) => <Icon {...p}><path d="m5 12 5 5 9-12"/></Icon>;
export const Loader   = (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></Icon>;
export const Target   = (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></Icon>;
export const Database = (p) => <Icon {...p}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></Icon>;
export const LogOut   = (p) => <Icon {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8 6 12l4 4M6 12h9"/></Icon>;
export const Wifi     = (p) => <Icon {...p}><path d="M2.5 9a15 15 0 0 1 19 0M6 12.5a10 10 0 0 1 12 0M9.5 16a5 5 0 0 1 5 0"/><path d="M12 20h.01"/></Icon>;
export const WifiOff  = (p) => <Icon {...p}><path d="M2 2l20 20"/><path d="M6 12.5a10 10 0 0 1 4-2.4M9.5 16a5 5 0 0 1 5 0M2.5 9a15 15 0 0 1 5-3.2M14 5.3A15 15 0 0 1 21.5 9"/><path d="M12 20h.01"/></Icon>;
