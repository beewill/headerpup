export type HeaderOp = 'set' | 'remove';

export type HeaderRule = {
  id: string;
  name: string;
  value: string;
  op: HeaderOp;
  enabled: boolean;
};

export type Profile = {
  id: string;
  name: string;
  color: string; // #rrggbb
  badgeText: string; // 0-2 chars
  headers: HeaderRule[];
  hostPatterns: string[];
};

export type State = {
  version: 1;
  profiles: Profile[];
  activeProfileId: string | null;
};

/** Last result of applying rules; written by the background script. */
export type ApplyStatus = {
  error: string | null;
  at: number;
};

export const STATE_KEY = 'state';
export const STATUS_KEY = 'applyStatus';

export const MAX_HOST_PATTERNS = 100;
export const MAX_BADGE_TEXT = 2;

// Blue and green come first to match the starter profiles; new profiles pick
// the next color by index, so the third profile must differ from both.
export const DEFAULT_COLORS = [
  '#2b6cb0',
  '#2f855a',
  '#c53030',
  '#d69e2e',
  '#6b46c1',
  '#dd6b20',
  '#319795',
  '#b83280',
];
