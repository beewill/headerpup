import { describe, expect, it } from 'vitest';
import {
  createProfile,
  deleteProfile,
  duplicateHeaderNames,
  duplicateProfile,
  moveProfile,
} from '../src/shared/profiles';
import { defaultState, migrate } from '../src/shared/storage';
import type { State } from '../src/shared/types';

// crypto.randomUUID exists in Node 19+.

describe('profiles', () => {
  it('create appends a default profile', () => {
    const a = createProfile(defaultState());
    const b = createProfile(a.state);
    expect(b.state.profiles.map((p) => p.id)).toEqual([a.profile.id, b.profile.id]);
    expect(b.profile.headers).toEqual([]);
    expect(b.profile.hostPatterns).toEqual([]);
  });

  it('a profile added after the starter profiles gets a color distinct from both', async () => {
    const { starterState } = await import('../src/shared/storage');
    const starter = starterState();
    const { profile } = createProfile(starter);
    expect(starter.profiles.map((p) => p.color)).not.toContain(profile.color);
  });

  it('duplicate inserts after the original with new ids', () => {
    let s = defaultState();
    s = createProfile(s).state;
    s = createProfile(s).state;
    const src = s.profiles[0]!;
    src.headers.push({ id: 'h', name: 'A', value: '1', op: 'set', enabled: true });
    const r = duplicateProfile(s, src.id);
    expect(r.state.profiles).toHaveLength(3);
    expect(r.state.profiles[1]).toBe(r.profile);
    expect(r.profile!.id).not.toBe(src.id);
    expect(r.profile!.headers[0]!.id).not.toBe('h');
    expect(r.profile!.headers[0]!.name).toBe('A');
    expect(r.profile!.color).toBe(src.color);
  });

  it('delete of the active profile sets Off', () => {
    const { state, profile } = createProfile(defaultState());
    const active: State = { ...state, activeProfileId: profile.id };
    expect(deleteProfile(active, profile.id).activeProfileId).toBeNull();
  });

  it('delete of another profile keeps the active one', () => {
    let s = createProfile(defaultState()).state;
    s = createProfile(s).state;
    const [a, b] = s.profiles;
    const out = deleteProfile({ ...s, activeProfileId: a!.id }, b!.id);
    expect(out.activeProfileId).toBe(a!.id);
  });

  it('move reorders and clamps', () => {
    let s = defaultState();
    for (let i = 0; i < 3; i++) s = createProfile(s).state;
    const ids = s.profiles.map((p) => p.id);
    expect(moveProfile(s, ids[0]!, 1).profiles.map((p) => p.id)).toEqual([ids[1], ids[0], ids[2]]);
    expect(moveProfile(s, ids[0]!, -1)).toBe(s);
    expect(moveProfile(s, ids[0]!, 10).profiles.map((p) => p.id)).toEqual([ids[1], ids[2], ids[0]]);
  });

  it('duplicateHeaderNames ignores case and disabled rules', () => {
    const r = (name: string, enabled = true) => ({ id: name + enabled, name, value: '', op: 'set' as const, enabled });
    expect([...duplicateHeaderNames([r('A'), r('a'), r('B'), r('B', false)])]).toEqual(['a']);
  });
});

describe('migrate', () => {
  it('returns default state for junk', () => {
    expect(migrate(undefined)).toEqual(defaultState());
    expect(migrate('x')).toEqual(defaultState());
  });

  it('drops a dangling activeProfileId', () => {
    expect(migrate({ profiles: [], activeProfileId: 'gone' }).activeProfileId).toBeNull();
  });

  it('keeps valid data and repairs bad fields', () => {
    const s = migrate({
      profiles: [{ id: 'p', name: 'N', color: 'bad', headers: [{ name: 'A', op: 'zzz' }], hostPatterns: ['a', 3] }],
      activeProfileId: 'p',
    });
    expect(s.activeProfileId).toBe('p');
    expect(s.profiles[0]!.color).toBe('#2b6cb0');
    expect(s.profiles[0]!.headers[0]).toMatchObject({ name: 'A', op: 'set', enabled: true });
    expect(s.profiles[0]!.hostPatterns).toEqual(['a']);
  });
});

describe('starterState', () => {
  it('has Blue and Green profiles, none active', async () => {
    const { starterState } = await import('../src/shared/storage');
    const s = starterState();
    expect(s.activeProfileId).toBeNull();
    expect(s.profiles.map((p) => [p.name, p.badgeText, p.color])).toEqual([
      ['Blue', 'B', '#2b6cb0'],
      ['Green', 'G', '#2f855a'],
    ]);
    expect(s.profiles[0]!.headers).toMatchObject([{ name: 'color', value: 'blue', op: 'set', enabled: true }]);
    expect(s.profiles[1]!.headers).toMatchObject([{ name: 'color', value: 'green', op: 'set', enabled: true }]);
    expect(s.profiles.every((p) => p.hostPatterns.length === 0)).toBe(true);
    expect(migrate(s)).toEqual(s); // survives normalization unchanged
  });
});
