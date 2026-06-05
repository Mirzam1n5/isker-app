// ─── Google Sheets ───────────────────────────────────────────────
export const SHEET_ID = '1CVvkZMdjxXG8fBdRJskg3g5fsXMmuzfG6bHdR5WWn9k';

export const SHEET_NAMES = {
  PROJECTS:      'Projects',
  WORKERS:       'Workers',
  EQUIPMENT:     'Equipment',
  BUDGET:        'Budget',
  SCHEDULE:      'Schedule',
  EVM:           'EVM',
  ISSUES:        'Issues',
  DAILY_REPORTS: 'Daily Reports',
} as const;

// ─── Dark theme palette (matches web TV version) ─────────────────
export const COLORS = {
  // Backgrounds
  black:       '#0c0d14',   // page background
  darkGray:    '#111220',   // panel / topbar
  midGray:     '#7878a0',   // secondary text
  lightGray:   '#161724',   // card background
  border:      '#20223a',   // borders
  white:       '#dfe0ef',   // primary text
  background:  '#0c0d14',   // screen background

  // Accent
  green:       '#4caf7d',
  greenLight:  '#0d2118',
  greenDark:   '#3d9e6a',

  red:         '#e05c5c',
  redLight:    '#200e0e',
  redDark:     '#e07070',

  blue:        '#5b9bd5',
  blueLight:   '#0a1a2e',

  yellow:      '#d4a843',
  yellowLight: '#211a08',

  accent:      '#7c78c8',
  accentDim:   '#151430',

  orange:      '#d4845a',
  orangeLight: '#1e1008',

  // Aliases for ui.tsx compatibility
  muted:       '#404058',
  sub:         '#7878a0',
  panel:       '#111220',
  card:        '#161724',
} as const;

// ─── Typography ──────────────────────────────────────────────────
export const FONT = {
  regular: 'System',
  size: {
    xs:  10,
    sm:  12,
    md:  14,
    lg:  16,
    xl:  20,
    xxl: 26,
  },
} as const;

// ─── Status helpers ──────────────────────────────────────────────
export const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  'On Track':    { bg: '#0d2118', text: '#4caf7d' },
  'Active':      { bg: '#0a1a2e', text: '#5b9bd5' },
  'Delayed':     { bg: '#200e0e', text: '#e05c5c' },
  'Done':        { bg: '#0d2118', text: '#4caf7d' },
  'In Progress': { bg: '#0a1a2e', text: '#5b9bd5' },
  'Not Started': { bg: '#1a1b2e', text: '#7878a0' },
  'Maintenance': { bg: '#211a08', text: '#d4a843' },
  'Open':        { bg: '#200e0e', text: '#e05c5c' },
  'Resolved':    { bg: '#0d2118', text: '#4caf7d' },
};

export const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  'High':   { bg: '#200e0e', text: '#e05c5c' },
  'Medium': { bg: '#211a08', text: '#d4a843' },
  'Low':    { bg: '#0d2118', text: '#4caf7d' },
};
