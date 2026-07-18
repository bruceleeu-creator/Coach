# Implementation Plan

- [x] 1. Add v3.4 type and service contracts
  - Add Desire, ReflectionItem, TodaySnapshot, PracticeHistoryItem, LocalStatistics.
  - Add compile-time contract file for v3.4 services and prompt helpers.
  - _Requirement: Prompt/context, local storage_

- [x] 2. Implement local services
  - Add DesireService, ReflectionService, TodayService, disclaimer constant.
  - _Requirement: Desire CRUD, reflections, statistics_

- [x] 3. Add desire management page
  - Register route and implement CRUD UI.
  - _Requirement: Desire CRUD_

- [x] 4. Upgrade dashboard and records
  - Add active desire, weekly review, upcoming actions.
  - Add records tabs for conversations, beliefs, actions, statistics.
  - _Requirement: Retention and review_

- [x] 5. Split settings and add disclaimer
  - Default user settings; developer tools behind tab.
  - _Requirement: Settings separation and compliance_

- [x] 6. Add chat manual reflection entry
  - Save belief/reframe/action/insight from user input.
  - _Requirement: Manual sedimentation_

- [x] 7. Extend prompt context
  - Add life context and relevance filtering.
  - _Requirement: Prompt context_

- [x] 8. Verify
  - Run type-check, build:h5, scans, browser smoke test.
  - _Requirement: Acceptance_
