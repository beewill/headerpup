/**
 * Host glob matching.
 *
 * `*` matches zero or more hostname characters (including dots), so
 * `*.example.com` matches `a.example.com` and `a.b.example.com` but not
 * `example.com` (the literal dot is still required), and `pup*.domain.com`
 * matches both `pup.domain.com` and `pup-test.domain.com`. `{one,two}` matches either alternative, so
 * `{www,api}.example.com` matches `www.example.com` or `api.example.com`
 * (alternatives may contain `*`; groups cannot be nested). Matching is
 * case-insensitive and ignores port. Everything else is matched literally
 * (dots are escaped).
 */

const WILDCARD = '[a-z0-9._-]*';

function escapeLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

function wildcardsToRegex(s: string): string {
  return s.split('*').map(escapeLiteral).join(WILDCARD);
}

/**
 * Converts a host glob to a regex *source* fragment (no anchors). Brace
 * groups become non-capturing alternations, so the result is safe to embed
 * in a larger expression. Unbalanced or nested braces are treated literally;
 * `validateHostPattern` rejects them before they reach this point.
 */
export function globToHostRegexSource(pattern: string): string {
  const glob = pattern.trim().toLowerCase();
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const open = glob.indexOf('{', i);
    const close = open === -1 ? -1 : glob.indexOf('}', open);
    const nested = open !== -1 && close !== -1 && glob.slice(open + 1, close).includes('{');
    if (open === -1 || close === -1 || nested) {
      out += wildcardsToRegex(glob.slice(i));
      break;
    }
    out += wildcardsToRegex(glob.slice(i, open));
    const alternatives = glob.slice(open + 1, close).split(',');
    out += `(?:${alternatives.map(wildcardsToRegex).join('|')})`;
    i = close + 1;
  }
  return out;
}

/** Compiled, anchored, case-insensitive regex that tests a bare hostname. */
export function globToHostRegex(pattern: string): RegExp {
  return new RegExp(`^${globToHostRegexSource(pattern)}$`, 'i');
}

/** Extracts the lowercase hostname (no port) from a URL or bare host[:port]. */
export function hostOf(urlOrHost: string): string {
  const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/:?#]+)/i.exec(urlOrHost.trim());
  return (m?.[1] ?? '').toLowerCase();
}

export function matchesHost(pattern: string, urlOrHost: string): boolean {
  return globToHostRegex(pattern).test(hostOf(urlOrHost));
}
