// Chrome (and other Chromium browsers) expose the WebExtensions API as
// `chrome.*` with promise support in MV3. The shared source targets the
// `browser.*` namespace, so alias it before any other module runs.
declare const chrome: typeof browser;

const g = globalThis as unknown as { browser?: typeof browser };
if (typeof g.browser === 'undefined') g.browser = chrome;
