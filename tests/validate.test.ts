import { describe, expect, it } from 'vitest';
import {
  parsePatterns,
  validateBadgeText,
  validateColor,
  validateHeaderName,
  validateHostPattern,
  validatePatterns,
  validateProfileName,
} from '../src/shared/validate';

describe('validate', () => {
  it('profile name', () => {
    expect(validateProfileName('')).not.toBeNull();
    expect(validateProfileName('   ')).not.toBeNull();
    expect(validateProfileName('Staging')).toBeNull();
  });

  it('color', () => {
    expect(validateColor('#ffcc00')).toBeNull();
    expect(validateColor('ffcc00')).not.toBeNull();
    expect(validateColor('#fc0')).not.toBeNull();
  });

  it('badge text', () => {
    expect(validateBadgeText('')).toBeNull();
    expect(validateBadgeText('ST')).toBeNull();
    expect(validateBadgeText('STG')).not.toBeNull();
  });

  it('header name follows RFC 7230 token', () => {
    expect(validateHeaderName('X-Tenant')).toBeNull();
    expect(validateHeaderName('X Tenant')).not.toBeNull();
    expect(validateHeaderName('X:Tenant')).not.toBeNull();
    expect(validateHeaderName('')).not.toBeNull();
  });

  it('host pattern', () => {
    expect(validateHostPattern('*.example.com')).toBeNull();
    expect(validateHostPattern('localhost')).toBeNull();
    expect(validateHostPattern('https://example.com')).not.toBeNull();
    expect(validateHostPattern('example.com:8080')).not.toBeNull();
    expect(validateHostPattern('exa mple.com')).not.toBeNull();
  });

  it('host pattern brace groups', () => {
    expect(validateHostPattern('{one,two,three}.example.com')).toBeNull();
    expect(validateHostPattern('api.example.{com,org}')).toBeNull();
    expect(validateHostPattern('{a.com,*.b.org}')).toBeNull();
    expect(validateHostPattern('{a,b}.{x,y}.com')).toBeNull();
    expect(validateHostPattern('{a,}.com')).not.toBeNull(); // empty alternative
    expect(validateHostPattern('{}.com')).not.toBeNull();
    expect(validateHostPattern('{a,b.com')).not.toBeNull(); // unbalanced
    expect(validateHostPattern('a,b}.com')).not.toBeNull();
    expect(validateHostPattern('{a,{b,c}}.com')).not.toBeNull(); // nested
    expect(validateHostPattern('{a,b/c}.com')).not.toBeNull();
    expect(validateHostPattern('{a,b c}.com')).not.toBeNull();
    expect(validateHostPattern('a,b.com')).not.toBeNull(); // comma outside a group
  });

  it('parsePatterns trims, skips blanks, dedupes, reports errors', () => {
    const r = parsePatterns(' a.com \n\nA.com\nbad/path\n*.b.com');
    expect(r.valid).toEqual(['a.com', '*.b.com']);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.line).toBe(4);
  });

  it('caps patterns at 100', () => {
    const ok = Array.from({ length: 100 }, (_, i) => `h${i}.com`).join('\n');
    const bad = ok + '\nextra.com';
    expect(validatePatterns(ok)).toBeNull();
    expect(validatePatterns(bad)).not.toBeNull();
  });
});
