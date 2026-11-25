# Change: Add header profiles

## Why
Developers often need to switch between sets of request headers, such as auth tokens, feature flags, and tenant IDs, for specific hosts. Re-editing those headers every time is slow and easy to get wrong. HeaderPup lets them save header sets as profiles and switch between them in one click.

## What Changes
- **profiles** (new): create, rename, duplicate, delete, and reorder profiles. Only one profile is active at a time. State persists across restarts.
- **header-rules** (new): each profile holds a flat list of request-header rules (`set`/`remove`, each with its own on/off switch), scoped by wildcard host patterns. Rules are applied via `declarativeNetRequest` dynamic rules.
- **toolbar-popup** (new): a colored toolbar badge shows the active profile. A popup switches profiles. The `cycle-profile` keyboard shortcut cycles through them.
- **options-page** (new): a separate page for editing profiles, with inline validation, debounced auto-save, and DNR error display.

## Impact
- Affected specs: `profiles`, `header-rules`, `toolbar-popup`, `options-page` (all new)
- Affected code: new codebase (`src/shared`, `src/background`, `src/popup`, `src/options`, `manifest.json`)
- Permissions: `declarativeNetRequest`, `storage`, and `host_permissions: ["<all_urls>"]`. Under MV3, Firefox requires the user to grant host permissions. When access is missing, the popup and options pages show a prompt that calls `permissions.request`.
