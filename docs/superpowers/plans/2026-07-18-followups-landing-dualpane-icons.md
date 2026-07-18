# Follow-ups: Landing, Dual-pane Chat, Icons, Brand — Implementation Plan

> **For agentic workers:** Steps use checkbox syntax. Spec source: `docs/superpowers/specs/2026-07-18-salo-inspired-ui-redesign.md` §12 + residual gaps.

**Goal:** Close remaining out-of-scope / residual items: marketing landing, dual-pane chat workspace, brand mark + SVG icon system, formal plan doc, and Spec acceptance checkboxes.

**Architecture:** Keep uni-app Vue3 H5; add landing as app entry route; share `UiIcon` / `UiBrandMark`; extend chat page with desktop session rail without changing storage keys or coach logic.

**Tech Stack:** Vue 3, TypeScript, uni-app H5, SCSS tokens in `uni.scss`

---

### Task 1: Spec acceptance + this plan

**Files:**
- Modify: `docs/superpowers/specs/2026-07-18-salo-inspired-ui-redesign.md`
- Create: `docs/superpowers/plans/2026-07-18-followups-landing-dualpane-icons.md`

- [x] **Step 1:** Document plan (this file)
- [x] **Step 2:** Mark §10 acceptance items completed with implementation notes

### Task 2: Icon system + brand mark

**Files:**
- Create: `src/components/icons/icon-paths.ts`
- Create: `src/components/ui/UiIcon.vue`
- Create: `src/components/ui/UiBrandMark.vue`

- [x] **Step 1:** Define path map for chrome icons
- [x] **Step 2:** `UiIcon` SVG renderer
- [x] **Step 3:** `UiBrandMark` geometric logomark + optional wordmark

### Task 3: Marketing landing

- [x] **Step 1:** Landing page: hero, value props, CTAs
- [x] **Step 2:** Session exists on show → redirect into app
- [x] **Step 3:** Desktop + mobile layout

### Task 4: Dual-pane chat

- [x] **Step 1:** Desktop session list
- [x] **Step 2:** Select session → setActive + reload
- [x] **Step 3:** Mobile single column preserved

### Task 5: Wire icons + verify

- [x] **Step 1:** TabBar, chat chrome, subpage nav use `UiIcon` / brand
- [x] **Step 2:** type-check / test / build

---

## Verification

- Landing is default route; logged-in users skip to welcome/onboarding
- Chat desktop shows session rail; mobile does not
- Icons render consistently; brand mark on landing + tab sidebar
- Build green
