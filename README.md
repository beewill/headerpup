# HeaderPup

Browser extension for quickly switching between request-header profiles.
Available for Firefox (`gecko/`) and Chrome/Chromium (`webkit/`), sharing one
codebase in `src/`.

## Layout

```
src/            shared TypeScript source (background, popup, options, shared logic)
tests/          vitest unit tests
assets/         icon sources
scripts/        build script (node scripts/build.mjs <gecko|webkit>)
gecko/          Firefox: manifest.json, sign.mjs (AMO signing); dist/ and web-ext-artifacts/ are generated
webkit/         Chrome:  manifest.json, browser-shim.ts (browser -> chrome alias); dist/ is generated
```

## Commands

| Command                                  | Description                                  |
| ---------------------------------------- | -------------------------------------------- |
| `npm run build`                          | Build both targets (`gecko/dist`, `webkit/dist`) |
| `npm run build:gecko` / `build:webkit`   | Build a single target                        |
| `npm run run:gecko`                      | Launch Firefox with the extension loaded     |
| `npm run run:webkit`                     | Launch Chromium with the extension loaded    |
| `npm run lint`                           | `web-ext lint` on the Firefox build          |
| `npm run package`                        | Zip both targets into `<target>/web-ext-artifacts/` |
| `npm run sign`                           | Sign the Firefox build for AMO (needs `.env`) |
| `npm test` / `npm run typecheck`         | Unit tests / type checking                   |

To install the Chrome build manually: open `chrome://extensions`, enable
Developer mode, and choose "Load unpacked" on `webkit/dist`.

## Browser differences

- **Background:** Firefox uses an event page (`background.scripts`); Chrome uses a service worker.
- **Permissions:** Firefox declares `<all_urls>` as an optional permission as well; Chrome grants it at install, so its manifest omits `optional_permissions`.
- **Badge text color:** `action.setBadgeTextColor` is Firefox-only and is skipped on Chrome.
