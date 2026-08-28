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
export const Star      = (p) => <Icon {...p}><path d="m12 2.5 2.95 6 6.55.95-4.75 4.6 1.12 6.55L12 17.55l-5.87 3.05 1.12-6.55-4.75-4.6 6.55-.95z"/></Icon>;
export const StarFill  = (p) => <Icon {...p} fill="currentColor"><path d="m12 2.5 2.95 6 6.55.95-4.75 4.6 1.12 6.55L12 17.55l-5.87 3.05 1.12-6.55-4.75-4.6 6.55-.95z"/></Icon>;
export const Sun       = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></Icon>;
export const Moon      = (p) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></Icon>;
export const Bus       = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 10h16M8 18v2M16 18v2M7 14h.01M17 14h.01"/></Icon>;
export const MapPin    = (p) => <Icon {...p}><path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></Icon>;
export const Clock     = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
export const Check     = (p) => <Icon {...p}><path d="m5 12 5 5 9-12"/></Icon>;
export const Gauge     = (p) => <Icon {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-4V6m6.5 8a7 7 0 1 0-13 0"/></Icon>;
export const Layers    = (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></Icon>;
export const Close     = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>;
export const ChevronRight = (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
export const Wifi      = (p) => <Icon {...p}><path d="M5 12.5A11 11 0 0 1 19 12.5M8.5 16A6 6 0 0 1 15.5 16M12 19.5h.01"/></Icon>;
export const Filter    = (p) => <Icon {...p}><path d="M3 4h18l-7 9v6l-4 2v-8L3 4Z"/></Icon>;
export const Users     = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-6-6"/></Icon>;
