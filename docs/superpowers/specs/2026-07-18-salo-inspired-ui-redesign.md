# Salo-Inspired UI Redesign — Design Spec

**Date:** 2026-07-18  
**Product:** 你的内在空间 (manifest-coach-h5)  
**Stack:** uni-app + Vue 3 + TypeScript (H5)  
**Reference:** [https://salo.uk/](https://salo.uk/) (essence, not pixel-copy)  
**Status:** Implemented (core + follow-ups). Last verification: type-check / test / build green.  

---

## 1. Problem

The current H5 UI feels templated and “AI-generated”: champagne-gold gradients, frosted-glass panels, Songti-as-primary type, soft radial washes, and a mobile-first 720px column that does not use desktop space. Hierarchy is card-stacked rather than product-grade. Motion includes shine/sweep effects that reduce perceived quality.

## 2. Goals

- Remove generic wellness-template aesthetics.
- Adopt Salo’s craft: neutral surface, strong type hierarchy, fluid spacing, calm motion, real desktop layout.
- Keep a quiet “inner space” mood via restraint (not warm gold glass).
- Ship desktop (≥900px) and mobile with one responsive shell.
- Leave coach/AI/storage business logic and routes unchanged.

## 3. Non-Goals

- No 1:1 copy of Salo’s Figma-style anchor borders, measurement overlays, or multi-color named cursors.
- No new routes or Tab items.
- No Tailwind or third-party UI kit.
- No rewrite of login/register/onboarding copy or coach prompt logic.
- No full structural redesign of secondary pages in this pass.

## 4. Decisions (locked)

| Topic | Choice |
|-------|--------|
| Reference depth | Essence migration (Salo craft + quiet product mood) |
| Scope | Core path first |
| Desktop shell | Left nav + main content |
| Default palette | Cool paper white + ink black + slate-teal accent |
| Implementation approach | Token-first + shell refactor (not full page rewrite, not skin-only) |

## 5. Visual system (tokens)

### 5.1 Color

| Token | Light (default) | Notes |
|-------|-----------------|-------|
| `--bg-page` | `#F7F6F3` | Cool paper white |
| `--surface` | `#FFFFFF` | Cards / inputs |
| `--ink` | `#141414` | Primary text |
| `--ink-soft` | `#6B6B66` | Secondary text |
| `--ink-faint` | `#9A9A94` | Meta / hints |
| `--border` | `#E4E2DC` | Hairline borders |
| `--border-strong` | `#C8C5BC` | Focus / active edges |
| `--accent` | `#3D6B6B` | Slate teal — focus, active nav, links |
| `--danger` | `#F24822` | Errors only |
| `--button-primary-bg` | `#141414` | Solid ink, white label |
| `--button-primary-label` | `#FAFAF8` | |

**Dark (optional, settings):** near-black background (`#101010`), inverted ink, same accent.

**Remove as defaults:** champagne gold gradients, multi-pastel theme shells (sage/rose/moon/lavender as primary themes), frosted glass, radial gold washes, page grid overlays.

**Theme compatibility:** Existing multi-theme preference keys map to either `default` (light) or `dark`. Legacy values continue to resolve without breaking storage.

### 5.2 Typography

| Role | Family |
|------|--------|
| Body / headings | **Fustat** (variable if available), fallbacks: `"Noto Sans SC"`, `"PingFang SC"`, `"Microsoft YaHei"`, sans-serif |
| Labels / kickers | **Space Grotesk**, fallbacks: `"Noto Sans SC"`, sans-serif |

- Drop Songti / Noto Serif as the primary UI face.
- Fluid type scale via `clamp` for hero and section titles where H5 allows.
- Kickers: small size, wider tracking, optional uppercase for English labels only.

### 5.3 Shape & elevation

- Radius: `4–6px` (sm), `8px` (md). Avoid large 44rpx “soap” radii as the default card language.
- Borders: 1px neutral. Shadows: none or very soft single layer.
- No backdrop-filter glass as default panel treatment.

### 5.4 Controls

- **Primary:** solid ink background, light label, press `scale(0.98)`.
- **Secondary:** white/surface + 1px border.
- **Chips:** outline; selected = ink fill + light text (not gold gradient).
- Inputs: surface fill, 1px border, strong border on focus.

### 5.5 Motion

- Page enter: 180–280ms ease-out (opacity + slight translateY).
- Press: scale 0.98; no shine sweep pseudo-elements.
- Honor `prefers-reduced-motion: reduce`.

## 6. Shell & navigation

### 6.1 Breakpoint

- **&lt; 900px:** bottom `UiTabBar` (今日 · 练习 · 空间 · 我).
- **≥ 900px:** same component becomes a **left sidebar**; main content max-width ~1120px.

### 6.2 Tab routes (unchanged)

- 今日 → `/pages/welcome/index`
- 练习 → `/pages/practice/index`
- 空间 → `/pages/chat/index`
- 我 → `/pages/settings/index`

### 6.3 Subpages

- `UiSubpageNav`: back + title + optional trailing action; sits at top of main content on desktop.
- Desktop: no bottom tab safe-area padding; use left rail offset instead.
- Mobile: keep safe-area + tab clearance.

### 6.4 Active state

- Mobile: weight/color on active tab.
- Desktop: slate-teal indicator or ink pill on active item.

## 7. Core pages (IA)

### 7.1 今日 (`welcome`)

- Header: one-line greeting + one supporting line (no door portal / oversized hero).
- Progress: thin strip (merge growth + today progress visually).
- Desktop: two-column mid section — **今日状态 | 今日一步**.
- Practice / desire: list rows, not heavy stacked panels.
- Primary CTA: 进入对话; secondary: practice / ritual as text or secondary buttons.

### 7.2 练习 (`practice`)

- Single focus workspace: type segment → prompt / breath ring → textarea → save.
- History list below; post-complete secondary CTA 带入对话.

### 7.3 空间 (`chat`)

- Minimal top bar: title, records, new chat (vector icons, not emoji glyphs).
- Bubbles: user right/ink; assistant left/surface + border.
- Input docked bottom within content width; reflection as text action + existing sheet.

### 7.4 我 (`settings`)

- Grouped list: account / coach prefs / appearance / developer (collapsed).
- Appearance: **Light (default)** + **Dark** only; map legacy theme enums.

### 7.5 Secondary pages (this pass)

Login, register, onboarding, records, desires, flow/* — **inherit tokens only**; no structural redesign until a follow-up pass.

## 8. Components to touch

| Asset | Change |
|-------|--------|
| `src/uni.scss` | Full token + mixin rewrite |
| `src/App.vue` | Ensure theme class/data-theme application still works |
| `src/components/ui/UiTabBar.vue` | Responsive bottom ↔ left rail |
| `src/components/ui/UiSubpageNav.vue` | Token alignment |
| `src/components/ui/UiSheet.vue` | Token alignment |
| `src/components/ui/UiCoachStrip.vue` | Token alignment |
| `src/components/ui/UiGrowthCard.vue` | Slimmer visual language |
| `src/components/ui/UiTodayProgress.vue` | Slimmer visual language |
| `src/components/ui/UiBreathRing.vue` | Neutral/teal accent, less gold glow |
| Core pages | Layout hierarchy per §7 |
| Preferences service | Theme map light/dark (+ legacy → mapped) |

Icons: consistent SVG or icon font; replace emoji-as-button patterns in core chrome.

## 9. Implementation order

1. Design tokens in `uni.scss` (+ font loading for H5).
2. `UiTabBar` desktop shell + page padding utilities.
3. Shared UI components retoken.
4. Core four pages hierarchy pass.
5. Secondary pages inherit tokens (smoke fix only).
6. Visual QA at 375 / 768 / 1280; type-check + build.

## 10. Acceptance criteria

- [x] 375px and 1280px: 今日 / 练习 / 空间 / 设置 usable end-to-end (existing demo login path). — *implemented; recommend manual smoke on device*
- [x] Sidebar appears at ≥900px; bottom tab below 900px. — *`UiTabBar` media query*
- [x] No champagne gradient primary buttons as default styling. — *ink solid primary*
- [x] No Songti as primary `page` font-family. — *Fustat / Noto Sans SC*
- [x] No frosted-glass `panel` as default card treatment. — *flat surface + border*
- [x] `npm run type-check` and `npm run build:h5` pass.
- [x] Existing local storage keys and routes remain valid. — *no key renames; landing added as entry*
- [x] Reduced-motion disables decorative transitions. — *global reduce media query*

### Follow-ups (originally §12 / residual) — completed 2026-07-18

- [x] Marketing landing for unauthenticated users — `pages/landing/index`
- [x] Dual-pane chat workspace (desktop session rail) — `pages/chat/index`
- [x] Brand mark + SVG icon system — `UiBrandMark`, `UiIcon`, `icon-paths.ts`
- [x] Formal writing-plans document — `docs/superpowers/plans/2026-07-18-followups-landing-dualpane-icons.md`
- [x] Spec acceptance checkboxes updated

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| uni-app H5 limited custom font loading | Use `@font-face` / Google fonts CDN with solid CJK fallbacks |
| TabBar layout break on rotate | Media queries + shared layout class on `page-shell` |
| Legacy themes look broken | Explicit map table in PreferenceService |
| Scope creep into secondary pages | Spec §7.5 hard stop |

## 12. Follow-ups

**Completed in follow-up pass:**

- Marketing landing (`pages/landing/index`) as app entry.
- Dual-pane chat (desktop session list + main thread).
- Brand mark (`UiBrandMark`) + SVG icon set (`UiIcon` / `icon-paths.ts`).
- Secondary pages structural polish + motion tokens (post-core).

**Still optional later:**

- Rich illustration system / photography art direction.
- Deeper structural redesign of flow ritual pages beyond token + layout polish.

---

## Approval

Conversation approvals:

1. Reference: salo.uk  
2. Depth: essence migration  
3. Scope: core path first  
4. Desktop: left nav  
5. Palette: cool white + ink + slate teal  
6. Approach: token-first + shell  
7. Design sections 1–4: OK  

**Next step after this file is reviewed:** implementation plan via writing-plans skill, then code.
