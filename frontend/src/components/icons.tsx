// Iconos SVG inline (sin dependencias externas).
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, 'aria-hidden': true, focusable: false, ...props,
});

export const IconDashboard = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
export const IconSystems = (p: P) => (<svg {...base(p)}><rect x="2" y="3" width="20" height="6" rx="2"/><rect x="2" y="15" width="20" height="6" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>);
export const IconRoles = (p: P) => (<svg {...base(p)}><path d="M12 2l8 4v5c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>);
export const IconUsers = (p: P) => (<svg {...base(p)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
export const IconAuthorizer = (p: P) => (<svg {...base(p)}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>);
export const IconAccess = (p: P) => (<svg {...base(p)}><circle cx="7" cy="12" r="3"/><path d="M10 12h11M18 9l3 3-3 3"/></svg>);
export const IconAudit = (p: P) => (<svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>);
export const IconKey = (p: P) => (<svg {...base(p)}><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.5 12.5L21 2M16 7l3 3M14 9l3 3"/></svg>);
export const IconPlus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>);
export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>);
export const IconEdit = (p: P) => (<svg {...base(p)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
export const IconTrash = (p: P) => (<svg {...base(p)}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>);
export const IconClose = (p: P) => (<svg {...base(p)}><path d="M18 6L6 18M6 6l12 12"/></svg>);
export const IconCheck = (p: P) => (<svg {...base(p)}><path d="M20 6L9 17l-5-5"/></svg>);
export const IconX = IconClose;
export const IconLogout = (p: P) => (<svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>);
export const IconShield = (p: P) => (<svg {...base(p)}><path d="M12 2l8 4v5c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V6l8-4z"/></svg>);
export const IconServer = (p: P) => (<svg {...base(p)}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>);
export const IconClock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
export const IconLdap = (p: P) => (<svg {...base(p)}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>);
export const IconUserPlus = (p: P) => (<svg {...base(p)}><path d="M14 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>);
export const IconBuilding = (p: P) => (<svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>);
export const IconChevronRight = (p: P) => (<svg {...base(p)}><path d="M9 18l6-6-6-6"/></svg>);
export const IconAlert = (p: P) => (<svg {...base(p)}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>);
export const IconInfo = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>);
export const IconLock = (p: P) => (<svg {...base(p)}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
export const IconUser = (p: P) => (<svg {...base(p)}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>);
export const IconRefresh = (p: P) => (<svg {...base(p)}><path d="M21 2v6h-6M3 22v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0 0 20.49 15"/></svg>);
export const IconDownload = (p: P) => (<svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>);
export const IconLayers = (p: P) => (<svg {...base(p)}><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>);
export const IconTrendUp = (p: P) => (<svg {...base(p)}><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>);
