const ALL_URLS = { origins: ['<all_urls>'] };

/**
 * True when the extension can act on all URLs.
 *
 * `permissions.contains({origins: ['<all_urls>']})` can report false in
 * Firefox when the user granted a broad-but-not-identical set of origins,
 * so also accept any granted origin that covers every http(s) site.
 */
export async function hasHostPermission(): Promise<boolean> {
  if (await browser.permissions.contains(ALL_URLS)) return true;
  const { origins = [] } = await browser.permissions.getAll();
  return origins.some((o) => o === '<all_urls>' || o === '*://*/*' || o === 'http://*/*' || o === 'https://*/*');
}

export type GrantResult = { granted: boolean; error: string | null };

/** Must be called from a user gesture (e.g. a click handler). */
export async function requestHostPermission(): Promise<GrantResult> {
  try {
    return { granted: await browser.permissions.request(ALL_URLS), error: null };
  } catch (e) {
    return { granted: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Snapshot of what Firefox reports, for troubleshooting. */
export async function describePermissions(): Promise<string> {
  const all = await browser.permissions.getAll();
  const contains = await browser.permissions.contains(ALL_URLS);
  return `contains(<all_urls>)=${contains}; origins=${JSON.stringify(all.origins ?? [])}; permissions=${JSON.stringify(all.permissions ?? [])}`;
}
