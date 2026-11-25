# Project Context

## Purpose
HeaderPup is a browser extension (Firefox and Chrome) for quickly switching between header-modification profiles. Each profile is a named, colored set of request-header rules scoped to hostname patterns. Only one profile can be active at a time, or none ("Off").

## Tech Stack
- Firefox Manifest V3 in `gecko/` (`browser_specific_settings.gecko.id`, `strict_min_version: "128.0"`); background runs as an event page (`background.scripts`)
- Chrome/Chromium Manifest V3 in `webkit/` (`minimum_chrome_version: "120"`); background runs as a service worker (`background.service_worker`)
- Shared source in `src/` targets the `browser.*` namespace; `webkit/browser-shim.ts` aliases it to `chrome.*` for Chromium builds
- TypeScript (strict mode)
- Vite multi-entry build (background, popup, options), run per target: `node scripts/build.mjs <gecko|webkit>` outputs to `<target>/dist/`
- `web-ext` for run, lint, and build
- Vitest for unit tests
- Vanilla DOM UI (no framework)
- `declarativeNetRequest` dynamic rules for header modification

## Project Conventions

### Code Style
- TypeScript `strict: true`. No `any` in shared code.
- Pure functions for logic that can be tested (glob conversion, rule building, validation) live in `src/shared/` and `src/background/rules.ts`.

### Architecture Patterns
- All persistent state lives in `browser.storage.local` under one key: `state`.
- The background script is the only writer of DNR rules. UI pages only write `state`. The background reacts through `storage.onChanged`.
- DNR rules are rebuilt from `state` on install, on startup, and on every state change.

### Testing Strategy
- Vitest unit tests for glob matching, validation, and state → DNR rule building.
- `web-ext lint` must report zero errors.
- Manual testing with `web-ext run` against https://httpbin.org/headers.

### Git Workflow
- Changes are proposed via OpenSpec under `openspec/changes/<change-id>/` before implementation.

## Domain Context

### Data Model
```ts
type HeaderRule = {
  id: string;
  name: string;
  value: string;
  op: 'set' | 'remove';
  enabled: boolean;
};

type Profile = {
  id: string;
  name: string;
  color: string;      // #rrggbb
  badgeText: string;  // 0-2 chars
  headers: HeaderRule[];
  hostPatterns: string[];
};

type State = {
  version: 1;
  profiles: Profile[];
  activeProfileId: string | null;
};
```

## Important Constraints
- Request headers only. Response headers are out of scope for v1.
- Host patterns are wildcard globs, not regex.
- DNR cannot modify some protected headers (e.g. `Host`).
- DNR limits regex rules. Profiles are capped at 100 host patterns.
- Under MV3, Firefox does not always grant host permissions by default. The UI must prompt for them.
- Out of scope for v1: response headers, regex patterns, import/export, storage.sync.

## External Dependencies
- WebExtensions APIs (Firefox and Chrome): `declarativeNetRequest`, `storage`, `action`, `commands`, `permissions`, `runtime`.
