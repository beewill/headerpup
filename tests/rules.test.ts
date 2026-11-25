import { describe, expect, it } from 'vitest';
import { buildRules, effectiveHeaders, hostRegexFilter } from '../src/background/rules';
import type { HeaderRule, Profile, State } from '../src/shared/types';

const rule = (over: Partial<HeaderRule> = {}): HeaderRule => ({
  id: Math.random().toString(36),
  name: 'X-Test',
  value: 'v',
  op: 'set',
  enabled: true,
  ...over,
});

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 'p1',
  name: 'P1',
  color: '#ffcc00',
  badgeText: 'P',
  headers: [rule()],
  hostPatterns: [],
  ...over,
});

const state = (profiles: Profile[], activeProfileId: string | null): State => ({
  version: 1,
  profiles,
  activeProfileId,
});

describe('buildRules', () => {
  it('null active -> no rules', () => {
    expect(buildRules(state([profile()], null))).toEqual([]);
  });

  it('stale active id -> no rules', () => {
    expect(buildRules(state([profile()], 'nope'))).toEqual([]);
  });

  it('no enabled headers -> no rules', () => {
    const p = profile({ headers: [rule({ enabled: false })] });
    expect(buildRules(state([p], 'p1'))).toEqual([]);
  });

  it('disabled rules are skipped', () => {
    const p = profile({
      headers: [rule({ name: 'A', enabled: false }), rule({ name: 'B', value: 'b' })],
    });
    const [r] = buildRules(state([p], 'p1'));
    expect(r?.action.requestHeaders).toEqual([{ header: 'B', operation: 'set', value: 'b' }]);
  });

  it('duplicate names resolve to the last enabled rule (case-insensitive)', () => {
    const p = profile({
      headers: [
        rule({ name: 'X-Flag', value: 'a' }),
        rule({ name: 'x-flag', value: 'b' }),
        rule({ name: 'X-FLAG', value: 'c', enabled: false }),
      ],
    });
    const [r] = buildRules(state([p], 'p1'));
    expect(r?.action.requestHeaders).toEqual([{ header: 'x-flag', operation: 'set', value: 'b' }]);
  });

  it('remove op has no value', () => {
    const p = profile({ headers: [rule({ name: 'Cookie', op: 'remove', value: 'ignored' })] });
    const [r] = buildRules(state([p], 'p1'));
    expect(r?.action.requestHeaders).toEqual([{ header: 'Cookie', operation: 'remove' }]);
  });

  it('empty patterns -> one rule with no URL restriction', () => {
    const rules = buildRules(state([profile()], 'p1'));
    expect(rules).toHaveLength(1);
    expect(rules[0]?.condition.regexFilter).toBeUndefined();
    expect(rules[0]?.condition.resourceTypes?.length).toBeGreaterThan(5);
  });

  it('one rule per pattern with unique ids', () => {
    const p = profile({ hostPatterns: ['a.com', '*.b.com'] });
    const rules = buildRules(state([p], 'p1'));
    expect(rules.map((r) => r.id)).toEqual([1, 2]);
    expect(rules[0]?.condition.isUrlFilterCaseSensitive).toBe(false);
    expect(rules[0]?.action.type).toBe('modifyHeaders');
  });

  it('empty-name rules are ignored', () => {
    expect(effectiveHeaders([rule({ name: '  ' })])).toEqual([]);
  });
});

describe('hostRegexFilter', () => {
  const re = (pattern: string) => new RegExp(hostRegexFilter(pattern), 'i');

  it('matches the host with scheme, optional port, path', () => {
    const r = re('api.example.com');
    expect(r.test('https://API.Example.com:8443/x')).toBe(true);
    expect(r.test('http://api.example.com')).toBe(true);
    expect(r.test('https://api.example.com/')).toBe(true);
    expect(r.test('https://api.example.com?q=1')).toBe(false); // `?` right after host: not in (/|$)
  });

  it('does not match lookalike hosts or userinfo tricks', () => {
    const r = re('example.com');
    expect(r.test('https://example.com.evil.org/')).toBe(false);
    expect(r.test('https://notexample.com/')).toBe(false);
    expect(r.test('https://evil.org/example.com/')).toBe(false);
    expect(r.test('https://evil.org@example.com/')).toBe(false);
  });

  it('brace alternation matches each alternative and stays anchored', () => {
    const r = re('{www,api}.example.com');
    expect(r.test('https://www.example.com/')).toBe(true);
    expect(r.test('https://api.example.com:8443/x')).toBe(true);
    expect(r.test('https://other.example.com/')).toBe(false);
    expect(r.test('https://evil.org@api.example.com/')).toBe(false);
    expect(r.test('https://api.example.com.evil.org/')).toBe(false);
    // The group must not leak alternation to the scheme/port parts of the filter.
    expect(re('{a.com,b.com}').test('https://a.com/')).toBe(true);
    expect(re('{a.com,b.com}').test('https://xb.com/')).toBe(false);
  });

  it('wildcard subdomain', () => {
    const r = re('*.example.com');
    expect(r.test('https://a.example.com/')).toBe(true);
    expect(r.test('https://a.b.example.com:1/')).toBe(true);
    expect(r.test('https://example.com/')).toBe(false);
  });

  it('wildcard matches zero or more characters', () => {
    const r = re('pup*.domain.com');
    expect(r.test('https://pup.domain.com/')).toBe(true);
    expect(r.test('https://pup-test.domain.com:8080/x')).toBe(true);
    expect(r.test('https://other.domain.com/')).toBe(false);
    expect(r.test('https://evil.org@pup.domain.com/')).toBe(false);
  });
});
