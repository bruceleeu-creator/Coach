# Project Hardening And Premium UI Design

## Architecture

The app remains a Vue 3 + TypeScript uni-app H5 application. Existing page paths and local-storage keys stay compatible.

- Pages own user interaction, routing, and view state.
- Services own local persistence and external API calls.
- `src/uni.scss` owns the shared visual language and theme tokens.
- Specs document the verification contract for this hardening pass.

## Functional Approach

- Keep the demo login model and one-click account entry.
- Keep DeepSeek as the only AI response provider. The request key is read from saved settings first, then `.env`; missing keys or request failures surface a clear modal and keep the user's message in the active session.
- Make local-storage reads resilient by validating preference enums and normalizing array-backed records.
- Refresh records/settings data on page show so navigation changes are reflected.
- Keep all existing page routes stable and repair navigation fallbacks where needed.

## UI Approach

The visual direction is luxury/refined quiet wellness. The implementation keeps the existing Chinese serif voice, champagne accents, soft panels, and ritual-like flow, while tightening hierarchy and consistency.

- Use CSS custom properties for all theme-dependent colors.
- Preserve light variants and dark theme.
- Avoid hardcoded light backgrounds in page components.
- Give desktop H5 a constrained premium column instead of full-width stretching.
- Allow long pages to scroll and keep bottom actions clear of safe areas.
- Use consistent pressed, selected, empty, and loading states.

## Data And Error Handling

- `StorageService` remains the only storage wrapper.
- Corrupt JSON falls back to defaults as before.
- Preferences are sanitized to valid theme/tone/length values.
- Chat sends immediately persist the user message before DeepSeek is called.
- DeepSeek errors are user-facing and recoverable; no local AI fallback is introduced.

## Verification Strategy

- Run `npm run type-check`.
- Run `npm run build:h5`.
- Start H5 locally and complete smoke tests through login, onboarding, guided flow, chat failure, records, settings, and theme switching.
- Verify mobile and desktop viewport readability in both light and dark themes.
