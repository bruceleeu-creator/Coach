# Project Hardening And Premium UI Requirements

## Problem

The H5 app already has a complete first-pass flow for an AI manifestation coach, including login, onboarding, welcome, guided flow, chat, records, settings, preferences, and local storage. The next change must make the project more reliable end to end and raise the frontend quality so it feels polished, premium, and ready for a serious demo.

## Scope

- Audit and stabilize the existing Vue 3 + TypeScript + uni-app H5 codebase.
- Verify all existing user-facing flows are usable in the browser.
- Fix functional, routing, persistence, theme, form, and build issues found during the audit.
- Improve visual polish across the existing pages without changing the product concept.
- Preserve the current light theme and the newly added dark theme.
- Keep the current local-storage data model unless a bug requires a small migration-safe adjustment.

## Non-Goals

- Do not add a backend service or deploy infrastructure.
- Do not expose or hardcode real API keys.
- Do not redesign the product into a different app category.
- Do not introduce large UI frameworks or unnecessary dependencies unless a concrete issue requires it.
- Do not implement real NFC hardware integration beyond the existing `bracelet_id` URL behavior unless already supported locally.

## Design Specification

1. Purpose Statement: This app is a private reflective coaching space. Users should feel held, calm, and confident that every screen belongs to the same refined product rather than a prototype stitched together page by page.
2. Aesthetic Direction: Luxury/refined with a quiet wellness atmosphere.
3. Color Palette: Light theme uses ivory `#fbf7ef`, champagne gold `#c59d5f`, warm ink `#3f342b`; dark theme uses night ink `#10131c`, moon gold `#f1dca9`, soft parchment `#f1e8d9`, muted blue-grey `#8ea2c0`.
4. Typography: Preserve the existing Chinese serif direction (`Songti SC`, `Noto Serif SC`) because it matches the product's intimate reflective tone; improve hierarchy through sizing, weight, spacing, and contrast.
5. Layout Strategy: Keep mobile-first flow screens but introduce stronger rhythm, premium surfaces, refined controls, consistent vertical spacing, and purposeful contrast rather than generic centered cards.

## Users And Stories

### Story 1: First-Time User

As a first-time user, I want to enter with my phone number, set my profile, and reach the welcome screen without broken navigation so that I can start using the coach confidently.

### Story 2: Guided Reflection User

As a guided reflection user, I want to choose emotions, choose topics, complete the breathing step, and arrive in chat with my selected context preserved so that the AI opening feels relevant.

### Story 3: Direct Chat User

As a returning user, I want to start a direct chat, send a message, see loading/error states, and keep my conversation history so that the app remains usable even after navigation or refresh.

### Story 4: Personalization User

As a personalization user, I want settings for theme, reply style, prompt rules, bracelet binding, and memory management to work predictably so that the app can feel like my own space.

### Story 5: Demo Reviewer

As a reviewer, I want every screen to look intentional, premium, responsive, and consistent in both light and dark themes so that the app feels production-worthy.

### Story 6: Maintainer

As a maintainer, I want type-check, build, and a repeatable browser smoke test to pass so that future changes have a safety net.

## Acceptance Criteria

### Requirement 1: Build And Type Safety

- When `npm run type-check` is executed, the project shall complete without TypeScript errors.
- When `npm run build:h5` is executed, the project shall complete successfully.
- If build warnings remain, the project shall document whether they are existing toolchain deprecations or actionable project issues.

### Requirement 2: Route And Flow Integrity

- When the app opens at `/pages/auth/login`, the system shall allow a valid phone entry to continue to onboarding or welcome according to existing profile state.
- When the user completes onboarding, the system shall persist the profile and route to the welcome page.
- When the user starts the guided flow, the system shall route through emotions, topics, breathing, and chat without dead ends.
- When the user starts direct chat from the welcome/chat actions, the system shall create an active session and display an assistant opening message.
- When the user taps back/return controls on existing pages, the system shall navigate to the intended previous or fallback page.

### Requirement 3: Local Persistence

- When user profile, flow selections, preferences, sessions, bracelet bindings, or memories are saved, the system shall preserve them through page navigation and browser refresh.
- When stored data is missing or malformed, the system shall fall back gracefully without crashing the page.
- When settings are reset, the system shall restore default preferences without deleting unrelated profile or chat records.

### Requirement 4: Chat Reliability

- When the user sends a non-empty chat message, the system shall add the user message immediately and then append the assistant response on success.
- When DeepSeek configuration is missing or the request fails, the system shall show a clear recoverable error and keep the user's message/session state without using a local AI fallback.
- While a chat request is pending, the system shall prevent duplicate sends and show a loading message.
- When a session has prior messages, the system shall keep enough recent context for the AI request without sending unrelated local data beyond the existing prompt rules and memories.

### Requirement 5: Settings And Theme Behavior

- When the user selects light theme, the system shall render the light palette across welcome, flow, chat, records, and settings pages.
- When the user selects dark theme, the system shall render a readable dark palette across the same pages.
- When the user saves preferences, the system shall persist and apply the selected theme and prompt settings on later app launches.
- When the user edits custom or forbidden rules, the system shall reflect them in the prompt preview.
- When the user enters a DeepSeek API Key in settings and saves, the system shall use that key for later chat requests in the same browser.

### Requirement 6: Visual Quality

- When each primary page is viewed on a mobile-width viewport, the system shall show no incoherent text overlap, clipped primary controls, or unreadable contrast.
- When each primary page is viewed on a desktop-width H5 viewport, the system shall remain visually balanced and not stretch into an unfinished prototype layout.
- When controls are tapped or active, the system shall provide consistent pressed/selected states.
- When the user moves between pages, the system shall maintain a coherent premium visual language using the approved serif typography, champagne accents, refined panels, and theme tokens.

### Requirement 7: Accessibility And Usability

- When text fields are empty, the system shall provide useful placeholders or validation feedback before navigating.
- When a control is disabled or pending, the system shall communicate the state visually.
- When color themes change, the system shall keep text and interactive controls readable.
- When page content exceeds the viewport, the system shall allow scrolling without hiding critical bottom actions behind safe-area regions.

### Requirement 8: Verification Coverage

- When the hardening work is complete, the system shall have a documented smoke-test checklist covering login, onboarding, guided flow, chat error/success behavior where feasible, records, settings, and theme switching.
- When browser verification is run locally, the system shall capture or report evidence for the most important flows and both themes.
- When issues are found during verification, the system shall either fix them or document the remaining limitation clearly.

## Constraints

- The app remains a uni-app H5 project using Vue 3 and TypeScript.
- Existing page paths in `src/pages.json` must remain valid.
- Sensitive credentials must stay in environment variables and must not be committed.
- Changes should stay focused on reliability and UI quality, avoiding unrelated rewrites.
