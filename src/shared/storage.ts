import {
  STATE_KEY,
  STATUS_KEY,
  type ApplyStatus,
  type HeaderRule,
  type Profile,
  type State,
} from './types';

export function defaultState(): State {
  return { version: 1, profiles: [], activeProfileId: null };
}

/** Example profiles created on first install. */
export function starterState(): State {
  const sample = (name: string, color: string, badgeText: string, value: string): Profile => ({
    id: newId(),
    name,
    color,
    badgeText,
    headers: [{ id: newId(), name: 'color', value, op: 'set', enabled: true }],
    hostPatterns: [],
  });
  return {
    version: 1,
    profiles: [
      sample('Blue', '#2b6cb0', 'B', 'blue'),
      sample('Green', '#2f855a', 'G', 'green'),
    ],
    activeProfileId: null,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function migrateRule(raw: unknown): HeaderRule | null {
  if (!isRecord(raw)) return null;
  return {
    id: str(raw.id, newId()),
    name: str(raw.name, ''),
    value: str(raw.value, ''),
    op: raw.op === 'remove' ? 'remove' : 'set',
    enabled: raw.enabled !== false,
  };
}

function migrateProfile(raw: unknown): Profile | null {
  if (!isRecord(raw)) return null;
  const headers = Array.isArray(raw.headers)
    ? raw.headers.map(migrateRule).filter((r): r is HeaderRule => r !== null)
    : [];
  const hostPatterns = Array.isArray(raw.hostPatterns)
    ? raw.hostPatterns.filter((p): p is string => typeof p === 'string')
    : [];
  return {
    id: str(raw.id, newId()),
    name: str(raw.name, 'Profile'),
    color: /^#[0-9a-fA-F]{6}$/.test(str(raw.color, '')) ? str(raw.color, '') : '#2b6cb0',
    badgeText: str(raw.badgeText, ''),
    headers,
    hostPatterns,
  };
}

/** Normalizes whatever is in storage into a valid State. Pure. */
export function migrate(raw: unknown): State {
  if (!isRecord(raw)) return defaultState();
  const profiles = Array.isArray(raw.profiles)
    ? raw.profiles.map(migrateProfile).filter((p): p is Profile => p !== null)
    : [];
  const active = typeof raw.activeProfileId === 'string' ? raw.activeProfileId : null;
  return {
    version: 1,
    profiles,
    activeProfileId: active && profiles.some((p) => p.id === active) ? active : null,
  };
}

export async function loadState(): Promise<State> {
  const stored = await browser.storage.local.get(STATE_KEY);
  return migrate(stored[STATE_KEY]);
}

/** True when nothing has ever been stored under the state key. */
export async function hasStoredState(): Promise<boolean> {
  const stored = await browser.storage.local.get(STATE_KEY);
  return stored[STATE_KEY] !== undefined;
}

export async function saveState(state: State): Promise<void> {
  await browser.storage.local.set({ [STATE_KEY]: state });
}

/**
 * Read-modify-write helper. UI pages are the only writers of `state`, and
 * mutations are applied to the freshest stored copy to avoid clobbering.
 */
export async function updateState(fn: (state: State) => State): Promise<State> {
  const next = fn(await loadState());
  await saveState(next);
  return next;
}

export async function loadStatus(): Promise<ApplyStatus | null> {
  const stored = await browser.storage.local.get(STATUS_KEY);
  const v = stored[STATUS_KEY];
  return isRecord(v) ? { error: typeof v.error === 'string' ? v.error : null, at: Number(v.at) || 0 } : null;
}

export async function saveStatus(status: ApplyStatus): Promise<void> {
  await browser.storage.local.set({ [STATUS_KEY]: status });
}

export function newId(): string {
  return crypto.randomUUID();
}
