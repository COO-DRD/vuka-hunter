export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const TOTAL_FRAMES = 900; // 30s

export const C = {
  bg:    '#09090b',
  red:   '#dc2626',
  redDk: '#7f1d1d',
  white: '#ffffff',
  z100:  '#f4f4f5',
  z200:  '#e4e4e7',
  z300:  '#d4d4d8',
  z400:  '#a1a1aa',
  z500:  '#71717a',
  z600:  '#52525b',
  z700:  '#3f3f46',
  z800:  '#27272a',
  z900:  '#18181b',
  z950:  '#09090b',
  green: '#22c55e',
  greenDk: '#166534',
  amber: '#f59e0b',
  wa:    '#075e54',
  waBubble: '#128c7e',
} as const;

// Scene start frames
export const S = {
  hook:      0,
  pain:      90,
  brand:     180,
  discover:  270,
  enrich:    420,
  score:     540,
  contacts:  660,
  outreach:  750,
  cta:       840,
} as const;
