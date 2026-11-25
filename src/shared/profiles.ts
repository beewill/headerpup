import { newId } from './storage';
import { DEFAULT_COLORS, type HeaderRule, type Profile, type State } from './types';

/** Pure state transformations used by the options page. */

export function createProfile(state: State): { state: State; profile: Profile } {
  const profile: Profile = {
    id: newId(),
    name: `Profile ${state.profiles.length + 1}`,
    color: DEFAULT_COLORS[state.profiles.length % DEFAULT_COLORS.length]!,
    badgeText: '',
    headers: [],
    hostPatterns: [],
  };
  return { state: { ...state, profiles: [...state.profiles, profile] }, profile };
}

export function duplicateProfile(state: State, id: string): { state: State; profile: Profile | null } {
  const i = state.profiles.findIndex((p) => p.id === id);
  const src = state.profiles[i];
  if (!src) return { state, profile: null };
  const copy: Profile = {
    ...src,
    id: newId(),
    name: `${src.name} copy`,
    headers: src.headers.map((h) => ({ ...h, id: newId() })),
    hostPatterns: [...src.hostPatterns],
  };
  const profiles = [...state.profiles];
  profiles.splice(i + 1, 0, copy);
  return { state: { ...state, profiles }, profile: copy };
}

export function deleteProfile(state: State, id: string): State {
  return {
    ...state,
    profiles: state.profiles.filter((p) => p.id !== id),
    activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
  };
}

/** Moves a profile by `delta` positions (clamped). */
export function moveProfile(state: State, id: string, delta: number): State {
  const from = state.profiles.findIndex((p) => p.id === id);
  if (from < 0) return state;
  const to = Math.max(0, Math.min(state.profiles.length - 1, from + delta));
  if (to === from) return state;
  const profiles = [...state.profiles];
  const [p] = profiles.splice(from, 1);
  profiles.splice(to, 0, p!);
  return { ...state, profiles };
}

export function patchProfile(state: State, id: string, patch: Partial<Omit<Profile, 'id'>>): State {
  return { ...state, profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function newHeaderRule(): HeaderRule {
  return { id: newId(), name: '', value: '', op: 'set', enabled: true };
}

/** Names (lowercased) that are used by more than one enabled rule. */
export function duplicateHeaderNames(rules: HeaderRule[]): Set<string> {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const r of rules) {
    const k = r.name.trim().toLowerCase();
    if (!r.enabled || !k) continue;
    if (seen.has(k)) dups.add(k);
    seen.add(k);
  }
  return dups;
}
