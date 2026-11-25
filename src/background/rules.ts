import { globToHostRegexSource } from '../shared/glob';
import type { HeaderRule, Profile, State } from '../shared/types';

export type DnrRule = browser.declarativeNetRequest.Rule;

const ALL_RESOURCE_TYPES: browser.declarativeNetRequest.ResourceType[] = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
];

type RequestHeaderInfo = {
  header: string;
  operation: 'set' | 'remove';
  value?: string;
};

/**
 * Enabled rules with a valid name; for duplicate names (case-insensitive)
 * the last enabled rule wins. Output order follows the surviving rules' order.
 */
export function effectiveHeaders(rules: HeaderRule[]): HeaderRule[] {
  const lastIndex = new Map<string, number>();
  rules.forEach((r, i) => {
    if (r.enabled && r.name.trim()) lastIndex.set(r.name.trim().toLowerCase(), i);
  });
  return rules.filter((r, i) => r.enabled && r.name.trim() && lastIndex.get(r.name.trim().toLowerCase()) === i);
}

function toRequestHeaders(rules: HeaderRule[]): RequestHeaderInfo[] {
  return effectiveHeaders(rules).map((r) =>
    r.op === 'remove'
      ? { header: r.name.trim(), operation: 'remove' }
      : { header: r.name.trim(), operation: 'set', value: r.value },
  );
}

export function hostRegexFilter(pattern: string): string {
  return `^[a-z][a-z0-9+.-]*://(${globToHostRegexSource(pattern)})(:\\d+)?(/|$)`;
}

/** Pure: state -> list of DNR dynamic rules (ids start at 1). */
export function buildRules(state: State): DnrRule[] {
  const profile: Profile | undefined = state.profiles.find((p) => p.id === state.activeProfileId);
  if (!profile) return [];

  const requestHeaders = toRequestHeaders(profile.headers);
  if (requestHeaders.length === 0) return [];

  const action = {
    type: 'modifyHeaders' as const,
    requestHeaders,
  };

  const patterns = profile.hostPatterns.map((p) => p.trim()).filter(Boolean);
  if (patterns.length === 0) {
    return [
      {
        id: 1,
        priority: 1,
        action,
        condition: { resourceTypes: ALL_RESOURCE_TYPES },
      },
    ];
  }

  return patterns.map((pattern, i) => ({
    id: i + 1,
    priority: 1,
    action,
    condition: {
      regexFilter: hostRegexFilter(pattern),
      isUrlFilterCaseSensitive: false,
      resourceTypes: ALL_RESOURCE_TYPES,
    },
  }));
}

/**
 * Atomically replaces all dynamic rules with the rules built from `state`
 * in a single `updateDynamicRules` call. Throws if DNR rejects the update.
 */
export async function apply(state: State): Promise<void> {
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: buildRules(state),
  });
}
