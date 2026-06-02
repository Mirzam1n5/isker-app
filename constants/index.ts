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
  black:       '#07080f',   // page background
  darkGray:    '#0d0e1a',   // panel / topbar
  midGray:     '#8888aa',   // secondary text
  lightGray:   '#13141f',   // card background
  border:      '#22233a',   // borders
  white:       '#eeeef8',   // primary text
  background:  '#07080f',   // screen background

  // Accent
  green:       '#00e676',
  greenLight:  '#0a2618',
  greenDark:   '#00c853',

  red:         '#ff4444',
  redLight:    '#280a0a',
  redDark:     '#ff6666',

  blue:        '#4fc3f7',
  blueLight:   '#072030',

  yellow:      '#ffd740',
  yellowLight: '#2a2000',

  accent:      '#7c6af7',
  accentDim:   '#1a1640',

  orange:      '#ff9100',
  orangeLight: '#271500',

  // Aliases for ui.tsx compatibility
  muted:       '#44445a',
  sub:         '#8888aa',
  panel:       '#0d0e1a',
  card:        '#13141f',
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
  'On Track':    { bg: '#0a2618', text: '#00e676' },
  'Active':      { bg: '#072030', text: '#4fc3f7' },
  'Delayed':     { bg: '#280a0a', text: '#ff4444' },
  'Done':        { bg: '#0a2618', text: '#00e676' },
  'In Progress': { bg: '#072030', text: '#4fc3f7' },
  'Not Started': { bg: '#1a1b2e', text: '#8888aa' },
  'Maintenance': { bg: '#2a2000', text: '#ffd740' },
  'Open':        { bg: '#280a0a', text: '#ff4444' },
  'Resolved':    { bg: '#0a2618', text: '#00e676' },
};

export const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  'High':   { bg: '#280a0a', text: '#ff4444' },
  'Medium': { bg: '#2a2000', text: '#ffd740' },
  'Low':    { bg: '#0a2618', text: '#00e676' },
};
