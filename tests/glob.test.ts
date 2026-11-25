import { describe, expect, it } from 'vitest';
import { globToHostRegexSource, hostOf, matchesHost } from '../src/shared/glob';

describe('glob matching', () => {
  it('*.example.com matches subdomains but not the apex', () => {
    expect(matchesHost('*.example.com', 'a.example.com')).toBe(true);
    expect(matchesHost('*.example.com', 'a.b.example.com')).toBe(true);
    expect(matchesHost('*.example.com', 'example.com')).toBe(false);
  });

  it('is case-insensitive and ignores port', () => {
    expect(matchesHost('api.example.com', 'https://API.Example.com:8443/x')).toBe(true);
    expect(matchesHost('API.EXAMPLE.COM', 'api.example.com:80')).toBe(true);
  });

  it('escapes dots', () => {
    expect(matchesHost('a.example.com', 'aXexample.com')).toBe(false);
    expect(matchesHost('a.example.com', 'a.example.com')).toBe(true);
  });

  it('wildcard in the middle matches a label run', () => {
    expect(matchesHost('api.*.example.com', 'api.eu.example.com')).toBe(true);
    expect(matchesHost('api.*.example.com', 'api.example.com')).toBe(false); // both literal dots required
  });

  it('* matches zero or more characters', () => {
    expect(matchesHost('pup*.domain.com', 'pup.domain.com')).toBe(true);
    expect(matchesHost('pup*.domain.com', 'pup-test.domain.com')).toBe(true);
    expect(matchesHost('pup*.domain.com', 'pup.eu.domain.com')).toBe(true);
    expect(matchesHost('pup*.domain.com', 'other.domain.com')).toBe(false);
    expect(matchesHost('pup*.domain.com', 'xpup.domain.com')).toBe(false);
    expect(matchesHost('*pup.domain.com', 'pup.domain.com')).toBe(true);
    expect(matchesHost('*pup.domain.com', 'my-pup.domain.com')).toBe(true);
    expect(matchesHost('a*b.com', 'ab.com')).toBe(true);
    expect(matchesHost('a*b.com', 'a-xyz-b.com')).toBe(true);
    expect(matchesHost('*', 'anything.example.com')).toBe(true);
  });

  it('wildcard suffix', () => {
    expect(matchesHost('localhost*', 'localhost')).toBe(true);
    expect(matchesHost('localhost*', 'localhost2')).toBe(true);
    expect(matchesHost('dev-*', 'dev-1')).toBe(true);
  });

  it('does not match other hosts or partial hosts', () => {
    expect(matchesHost('example.com', 'notexample.com')).toBe(false);
    expect(matchesHost('example.com', 'example.com.evil.org')).toBe(false);
  });

  it('{a,b} matches either literal alternative', () => {
    expect(matchesHost('{one,two,three}.example.com', 'one.example.com')).toBe(true);
    expect(matchesHost('{one,two,three}.example.com', 'two.example.com')).toBe(true);
    expect(matchesHost('{one,two,three}.example.com', 'three.example.com')).toBe(true);
    expect(matchesHost('{one,two,three}.example.com', 'four.example.com')).toBe(false);
    expect(matchesHost('{one,two,three}.example.com', 'onetwo.example.com')).toBe(false);
  });

  it('brace groups work anywhere, repeat, and may contain dots and wildcards', () => {
    expect(matchesHost('api.example.{com,org}', 'api.example.org')).toBe(true);
    expect(matchesHost('api.example.{com,org}', 'api.example.net')).toBe(false);
    expect(matchesHost('{a,b}.{x,y}.com', 'b.x.com')).toBe(true);
    expect(matchesHost('{a,b}.{x,y}.com', 'c.x.com')).toBe(false);
    expect(matchesHost('{example.com,*.test.org}', 'example.com')).toBe(true);
    expect(matchesHost('{example.com,*.test.org}', 'a.test.org')).toBe(true);
    expect(matchesHost('{example.com,*.test.org}', 'test.org')).toBe(false);
  });

  it('alternation is scoped to the group, not the whole pattern', () => {
    expect(matchesHost('pre-{a,b}', 'pre-a')).toBe(true);
    expect(matchesHost('pre-{a,b}', 'b')).toBe(false);
    expect(matchesHost('{a,b}-post', 'a-post')).toBe(true);
    expect(matchesHost('{a,b}-post', 'a')).toBe(false);
  });

  it('brace groups are case-insensitive', () => {
    expect(matchesHost('{WWW,Api}.Example.com', 'API.example.com')).toBe(true);
  });

  it('a single-alternative group is a literal', () => {
    expect(matchesHost('{one}.example.com', 'one.example.com')).toBe(true);
  });

  it('produces regex source with no unescaped dots', () => {
    expect(globToHostRegexSource('a.b')).toBe('a\\.b');
  });

  it('hostOf strips scheme, port, path', () => {
    expect(hostOf('https://Foo.com:8080/a?b#c')).toBe('foo.com');
    expect(hostOf('foo.com:99')).toBe('foo.com');
  });
});
