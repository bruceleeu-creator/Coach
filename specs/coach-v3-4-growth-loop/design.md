# v3.4 Design

## Architecture

The version adds local-only domain services:

- `desires.ts`: desire CRUD and active desire.
- `reflections.ts`: manual belief/reframe/action/insight records.
- `today.ts`: flow snapshots and lightweight text statistics.
- `disclaimer.ts`: fixed product boundary copy.

`coach.ts` gains `buildLifeContextBlock()` and `filterContextByRelevance()` so prompt context is sourced from user-saved data with bounded counts.

## Storage

All data continues to use `StorageService` with local keys:

- `desires`
- `active_desire_id`
- `reflections`
- `today_snapshots`
- `review_context`

No migration destroys old data. Missing fields are normalized with defaults.

## Pages

- `pages/desires/index`: list, create, edit, pause, complete, set active.
- `pages/welcome/index`: active desire, weekly review, upcoming actions, recent conversation.
- `pages/records/index`: conversations, beliefs, actions, statistics tabs.
- `pages/settings/index`: user settings by default, developer tools separate, disclaimer visible.
- `pages/chat/index`: manual reflection entry and disclaimer entry.

## Prompt Rules

Priority:

1. Safety/compliance boundary.
2. User-saved active desire.
3. User-saved relevant reflections.
4. Today snapshot and statistics facts.
5. Long-term memory.
6. Bracelet/entity anchor.

The prompt states that the app is a self-awareness and inner-alignment tool, not psychotherapy, medical service, divination, or result prediction.

## Testing

Use `vue-tsc` as compile-time contract verification, `npm run build:h5`, secret scans, and browser smoke tests for the main local flows.
