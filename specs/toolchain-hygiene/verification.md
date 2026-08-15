# Verification Results — Toolchain Hygiene

**Date:** 2026-08-15
**Scope:** Restore `type-check` on machines with a global `@cloudbase/ai` copy; remove Sass deprecation warnings.

## Problem And Root Cause

1. `npm run type-check` failed with syntax errors inside `node_modules/@cloudbase/ai/dist/cjs/*.d.ts`.
   - `@cloudbase/js-sdk@3.6.2`'s `index.d.ts` imports `@cloudbase/ai` but does not declare it as a dependency.
   - On machines where a global copy exists in a parent directory (e.g. `~/node_modules`), npm resolution walks up and finds it. That copy (`2.23.0`) uses TypeScript 5-only syntax (`const` type parameters), which the project's TypeScript 4.9 / vue-tsc 1.x cannot parse. Syntax errors are not suppressed by `skipLibCheck`, so the check fails.
   - On machines without such a copy the import stays unresolved inside a `.d.ts`, which `skipLibCheck` hides — this is why the original author's environment passed.

2. Every build printed `DEPRECATION WARNING [import]` and `[legacy-js-api]` from Sass.
   - The 22 explicit `@import '@/uni.scss'` statements in pages/components were redundant: the uni-app compiler already injects the full `src/uni.scss` content at the top of every compiled style block.
   - `[legacy-js-api]` comes from vite 5.2.8 (the version uni-app pins) invoking Sass through the legacy JS API; there is no `api: 'modern-compiler'` support below vite 5.4.

## Changes

- `tsconfig.json`: map `@cloudbase/ai` to `src/types/cloudbase-ai.d.ts` via `paths` so type resolution always lands inside the project regardless of host environment.
- `src/types/cloudbase-ai.d.ts`: minimal module shape (`export type AI = unknown`). The app never uses the js-sdk AI namespace (`CloudBaseApp` in `src/services/cloudbase-app.ts` does not expose `.ai()`).
- Removed the 22 redundant `@import` / `@use` lines from `App.vue`, pages, and UI components. Verified before removal that each import was the first statement of its style block and that the auto-injection provides the variables (build fails loudly on any undefined variable).
- `vite.config.ts`: `css.preprocessorOptions.scss.silenceDeprecations: ['legacy-js-api']` with a comment explaining the vite 5.4 upgrade path.

## Static Checks

- `npm run type-check`: passed on a machine with a global `@cloudbase/ai@2.23.0` present (the previously failing environment).
- `npm run test`: 3 files, 7 tests, all passed.
- `npm run build:h5`: passed with **0** deprecation warnings (previously 23 `legacy-js-api` + `import` warnings per build).

## Output Parity

- All 21 built CSS files still contain the complete theme system (`[data-theme]` blocks, `page-enter` keyframes, `primary-btn`, `prefers-reduced-motion`, desktop `min-width` rules).
- Total CSS shrank by ~15 KB (≈3%) — exactly one redundant copy of the uni.scss rules that the explicit import used to duplicate inside one compilation unit.
- Served the built H5 and screenshotted the landing route in a browser: cool paper background (`#f7f6f3`), type hierarchy, ink primary buttons all render correctly.

## Known Remaining Notes

- `legacy-js-api` is silenced, not fixed; the real fix requires vite ≥ 5.4 (`api: 'modern-compiler'`), which the pinned uni-app toolchain does not support yet. Supersedes the "Known Remaining Warnings" note in `specs/project-hardening-premium-ui/verification.md`.
- The `@cloudbase/ai` shim types the package as `unknown`; if the project ever adopts the js-sdk AI namespace, replace the shim with a real dependency declaration.
