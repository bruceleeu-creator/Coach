# v3.4 Requirements

## Scope

v3.4 upgrades the H5 app into a lightweight local "inner growth loop" while preserving local-only storage, no backend, no heavy dependencies, no AI-generated desires, no result promises, and no clinical positioning.

## User Stories

1. As a returning user, I want to manage my own desires so I can keep a clear self-alignment anchor.
2. As a returning user, I want to manually save beliefs, reframes, actions, and insights from chat so I can review them later.
3. As a returning user, I want a lightweight weekly review and statistics view so I can notice patterns from my own records.
4. As a user, I want ordinary settings separated from developer tools so API keys and prompt preview are not the first thing I see.
5. As a user, I want the product boundary to be visible so I understand this is self-awareness support, not therapy or medical care.

## Acceptance Criteria

- When the user creates a desire without `why`, the app shall block saving and show a clear message.
- When the user creates, edits, pauses, completes, or activates a desire, the app shall persist the change in local storage.
- When a desire is active, the welcome page shall show it and link to the desire management page.
- When the user saves a reflection from chat, the records page shall show it under the correct tab.
- When an action reflection has `remindAt`, the welcome page shall show it as an upcoming action.
- When the records page opens, the app shall provide tabs for conversations, beliefs, actions, and statistics.
- When there are no statistics, the statistics tab shall show an empty state without errors.
- When the user opens settings, the app shall default to user settings and hide developer tools behind a visible toggle/tab.
- When the user opens settings or chat, the app shall make the fixed disclaimer available.
- When building the system prompt, the app shall include relevant active desire, relevant reflections, recent snapshot facts, and selected memories within bounded counts.
- When context is irrelevant, the app shall avoid injecting large unrelated records.
- The app shall pass `npm run type-check` and `npm run build:h5`.

## Non-Goals

- No backend, cloud sync, account system, chart library, streaks, points, payments, or social sharing.
- No AI auto-generation of desires or reflections.
- No clinical assessment, diagnosis, therapy claim, result prediction, relationship manipulation, or major decision proxying.
