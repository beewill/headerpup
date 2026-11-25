## 1. Scaffold
- [x] 1.1 Create `package.json`, `tsconfig.json` (strict), and a Vite multi-entry config (background, popup, options)
- [x] 1.2 Create `manifest.json` (MV3, `browser_specific_settings.gecko`, `strict_min_version` 128, `background.scripts`, `cycle-profile` command with `Alt+Shift+H`)
- [x] 1.3 Add icons and `web-ext` run/lint/build scripts

## 2. Shared modules
- [x] 2.1 `src/shared/types.ts` (HeaderRule, Profile, State)
- [x] 2.2 `src/shared/storage.ts`: load/save/migrate with default state
- [x] 2.3 `src/shared/validate.ts`: profile name, hex color, badge text, RFC 7230 header token, host pattern, 100-pattern cap

## 3. Glob matching
- [x] 3.1 `src/shared/glob.ts`: glob → host regex
- [x] 3.2 Unit tests: wildcard label matching, `*.example.com` does not match `example.com`, case-insensitivity, port ignored, dots escaped

## 4. DNR rule building
- [x] 4.1 `src/background/rules.ts`: pure function state → DNR rule list
- [x] 4.2 Unit tests: disabled rules skipped, duplicate names resolve to last enabled, empty patterns → one rule with no host restriction, null active → no rules
- [x] 4.3 `apply()`: replace existing dynamic rule IDs atomically in one `updateDynamicRules` call, and record errors

## 5. Background
- [x] 5.1 `src/background/index.ts`: apply on install, startup, and `storage.onChanged`
- [x] 5.2 Update the badge (color, text, contrasting text color, tooltip, `!` on error)
- [x] 5.3 Handle the `cycle-profile` command

## 6. Popup UI
- [x] 6.1 List Off plus each profile (swatch, name, header count), highlight the active row, and activate on click
- [x] 6.2 Options page link, plus a missing-host-permission warning with a grant button

## 7. Options UI
- [x] 7.1 Two-pane layout: profile list (create/duplicate/delete/reorder) and editor
- [x] 7.2 Editor fields: name, color, badge text, host patterns textarea, header rule table
- [x] 7.3 Inline validation and debounced (~300ms) per-field save
- [x] 7.4 Duplicate-header warning, active pattern preview, DNR error display, permission prompt, protected-header help text

## 8. Verification
- [x] 8.1 `vitest` passes
- [x] 8.2 `web-ext lint` reports zero errors
- [ ] 8.3 Manual check in `web-ext run` against https://httpbin.org/headers: profile on/off, a host outside the patterns stays unmodified, badge updates, shortcut cycles, rules survive a restart
