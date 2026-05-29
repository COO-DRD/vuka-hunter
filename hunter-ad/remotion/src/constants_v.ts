// Vertical (9:16) Apple-style ad — 60 seconds
export const VW  = 1080;
export const VH  = 1920;
export const FPS = 30;
export const TOTAL_FRAMES_V = 1800; // 60s

export const C = {
  bg:      '#09090b',
  red:     '#dc2626',
  redDk:   '#7f1d1d',
  redBr:   '#ef4444',
  white:   '#ffffff',
  z50:     '#fafafa',
  z100:    '#f4f4f5',
  z200:    '#e4e4e7',
  z300:    '#d4d4d8',
  z400:    '#a1a1aa',
  z500:    '#71717a',
  z600:    '#52525b',
  z700:    '#3f3f46',
  z800:    '#27272a',
  z900:    '#18181b',
  z950:    '#09090b',
  green:   '#22c55e',
  greenDk: '#166534',
  amber:   '#f59e0b',
} as const;

// Scene start frames (all relative to composition start)
export const VS = {
  hook:     0,     // 0–120    (4s)
  pain:     120,   // 120–240  (4s)
  brand:    240,   // 240–390  (5s)
  discover: 390,   // 390–570  (6s)
  enrich:   570,   // 570–750  (6s)
  score:    750,   // 750–930  (6s)
  contacts: 930,   // 930–1110 (6s)
  opener:   1110,  // 1110–1290(6s)
  stats:    1290,  // 1290–1470(6s)
  cta:      1470,  // 1470–1620(5s)
  end:      1620,  // 1620–1800(6s)
} as const;
