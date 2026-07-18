# Coach V3 Session Meta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 H5 聊天从“通用提示词 + DeepSeek 直连”升级为 v2 规则教练、v3.1 Provider 抽象、v3.2 SessionCoachMeta 连续教练状态，让显化教练更稳定、更定向、更可追溯。

**Architecture:** 新增纯函数教练算法层 `src/services/coach.ts`，新增模型 Provider 层 `src/services/providers/*`，由 `src/services/chat.ts` 在单次 API 调用前组装系统 Prompt、上下文、阶段指令和回复合同。`SessionCoachMeta` 随 `chat_sessions` 本地持久化，旧会话读取时自动补默认值。

**Tech Stack:** uni-app H5, Vue 3, TypeScript, Vite, localStorage wrapper, DeepSeek Chat Completions API.

---

## 1. 当前项目缺口

- `src/services/chat.ts` 现在只有 `buildSystemPrompt()`，没有独立教练状态机；flow 情绪/主题没有进入后续轮次 Prompt。
- `src/services/chat.ts` 发送时虽先保存用户消息，但 AI messages 使用旧 `session.messages.slice(-10)` 加当前 content，没有把本轮完整会话传给算法层。
- `src/services/chat.ts` 会把所有长期记忆全量注入 Prompt，缺少 0-3 条相关记忆筛选。
- `src/services/deepseek.ts` 直接请求 DeepSeek，没有 Provider 抽象、模型切换记录、reasoner 兼容边界。
- `src/types/index.ts` 没有 `CoachState`、`ConversationStage`、`CoachDirective`、`RiskLevel`、`SessionCoachMeta`。
- `CoachPreferences` 没有模型选择字段；回复长度尚未映射到 `max_tokens`，temperature 没有按模型限制。

## 2. 修订范围

### 本轮必须完成

- v2：规则教练算法与动态 system prompt。
- v3.1：Provider 抽象与 DeepSeek 模型选择。
- v3.2：SessionCoachMeta 半持久状态、风险保持、模型追溯。
- 回归：设置页回复风格、长度、自定义规则、禁止规则继续生效。
- 回归：亮/暗主题与现有页面路径不改。

### 本轮明确不做

- 不新增后端、云同步、流式输出、Agent 工具循环、向量库、二次模型分类。
- 不把算法字段展示到普通用户 UI。
- 不做危机热线运营文案的完整 UI 化，那属于 v3.4。
- 不把用户 API Key 写进代码、文档、日志或测试快照。

## 3. 需求与验收

### R1 动态显化教练 Prompt

- When 用户从 flow 进入聊天并发送后续消息, the system shall include flow emotions/topics in every AI request.
- When 用户有长期记忆, the system shall select at most 3 relevant memories instead of dumping all memories.
- When 用户设置回复风格、长度、自定义规则、禁止规则, the system shall include them in the final Prompt with safety and forbidden rules higher priority.

### R2 教练算法状态机

- When 用户表达焦虑、匮乏、自我怀疑、关系拉扯、行动卡住或愿望不清, the system shall classify a `CoachState`.
- When 用户处于宣泄阶段, the system shall not rush into action checklist.
- When 用户从信念识别继续澄清, the system shall move toward belief reframe instead of resetting to clarifying.

### R3 Provider 抽象

- When the app calls DeepSeek, the request shall go through `ChatProvider.complete()`.
- When the selected model is `deepseek-reasoner`, the system shall not send `temperature` and shall never feed `reasoning_content` back into messages.
- When the selected model changes within a session, the system shall preserve coach state and record model/provider in meta.

### R4 SessionCoachMeta

- When a new session starts, the system shall initialize default `coachMeta`.
- When an old session without `coachMeta` is loaded, the system shall normalize it without throwing and write it back on next send.
- When each send succeeds, the system shall update state, stage, belief, focus, strategy, risk, turnCount, provider and model.

### R5 Risk Hold

- When a message contains l2/l3 risk terms, the system shall enter crisis response contract.
- When riskHoldTurns is above 0, the next turns shall keep crisis-safe contract until hold decreases to 0.
- When in crisis hold, the system shall skip belief reframe and manifestation technique guidance.

## 4. File Structure

- Modify `src/types/index.ts`: add coach/risk/provider types and extend `ChatSession`, `CoachPreferences`.
- Create `src/services/coach.ts`: pure functions for detection, directive, prompt, response contract, memory selection, meta factory/update.
- Create `src/services/coach-debug.ts`: DEV-only logging gate.
- Create `src/services/providers/types.ts`: provider interface and request options.
- Create `src/services/providers/deepseek.ts`: DeepSeek provider implementation.
- Create `src/services/providers/index.ts`: active provider/model selection.
- Modify `src/services/deepseek.ts`: keep `testDeepSeekConnection()` compatibility or delegate to provider; avoid duplicate request logic where practical.
- Modify `src/services/preferences.ts`: add model preference, sanitize it, expose max token/temperature helpers.
- Modify `src/services/chat.ts`: replace direct prompt/request flow with coach + provider pipeline.
- Modify `src/pages/settings/index.vue`: add model selector if not present; keep connection test and prompt preview meaningful.
- Modify `.env.example`: add `VITE_COACH_DEBUG=false`, document default model without secrets.
- Create optional `specs/coach-v3-session-meta/requirements.md`, `design.md`, `tasks.md`, `verification.md` if continuing strict spec-workflow.

## 5. Implementation Tasks

### Task 1: Add Coach And Provider Types

**Files:**
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/types/index.ts`

- [ ] Add `CoachState`, `ConversationStage`, `RiskLevel`, `CoachDirective`, `RiskSignalResult`, `SessionCoachMeta`.
- [ ] Extend `ChatSession` with optional `coachMeta?: SessionCoachMeta`.
- [ ] Add `DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner'`.
- [ ] Extend `CoachPreferences` with `deepseekModel: DeepSeekModel`.
- [ ] Run `npm run type-check`; expected first pass may fail until services are updated.

### Task 2: Build v2 Coach Pure Functions

**Files:**
- Create `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/coach.ts`

- [ ] Implement `detectRiskSignals(message): RiskSignalResult`.
- [ ] Implement `detectUserState(message, session, previousMeta?)`.
- [ ] Implement `detectConversationStage(session, previousMeta?, risk?)` with the documented priority order.
- [ ] Implement `extractLikelyBelief(message, state)`.
- [ ] Implement `selectRelevantMemories(message, session, limit = 3)` using keyword overlap and recency as lightweight local heuristics.
- [ ] Implement `buildResponseContract(stage, state, preferences, riskContext?)`.
- [ ] Implement `buildCoachDirective(input, previousMeta?)`.
- [ ] Implement `buildCoachSystemPrompt(input, previousMeta?)` with blocks ordered: role/methodology, safety, user context, directive, response contract, user preferences.

### Task 3: Add SessionCoachMeta Factories And Update Logic

**Files:**
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/coach.ts`

- [ ] Implement `createDefaultCoachMeta()`.
- [ ] Implement `normalizeCoachMeta(meta?)`.
- [ ] Implement `updateSessionCoachMeta(previous, directive, options)`.
- [ ] Ensure hold decrement uses `max(0, previous.riskHoldTurns - 1)` and then `max(decrementedHold, newRiskHoldTurns)`.
- [ ] Ensure crisis risk writes `riskLevel` and does not expose enum names to normal user-facing Prompt copy.

### Task 4: Add Provider Abstraction

**Files:**
- Create `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/providers/types.ts`
- Create `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/providers/deepseek.ts`
- Create `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/providers/index.ts`
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/deepseek.ts`

- [ ] Define `ChatProvider` and `ChatCompletionOptions`.
- [ ] Move DeepSeek request implementation into provider while preserving timeout and clear error messages.
- [ ] Return only `choices[0].message.content`.
- [ ] Ignore `reasoning_content`.
- [ ] Send `temperature` only for `deepseek-chat`.
- [ ] Keep `testDeepSeekConnection(apiKey)` working for settings.

### Task 5: Make Preferences Drive Model And Token Options

**Files:**
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/preferences.ts`
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/pages/settings/index.vue`

- [ ] Add `deepseekModel` defaulting to `deepseek-chat`.
- [ ] Sanitize model values and preserve old local storage compatibility.
- [ ] Add helpers for `getActiveModel()`, `getMaxTokens()`, and `getTemperature()`.
- [ ] Map reply length to tokens: short about 260, balanced about 700, deep about 1100.
- [ ] Add settings UI selector for `deepseek-chat` and `deepseek-reasoner`.
- [ ] Ensure prompt preview reflects reply style, length, custom rules and forbidden rules.

### Task 6: Rewrite Chat Send Pipeline

**Files:**
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/chat.ts`

- [ ] Initialize `coachMeta: createDefaultCoachMeta()` in direct and guided sessions.
- [ ] Normalize `coachMeta` in `getSessions()`.
- [ ] In `send(content)`, create `withUserMessage` before all coach calculations.
- [ ] Build risk, directive, system prompt and provider options from `withUserMessage` plus `previousMeta`.
- [ ] Call `getActiveProvider().complete(messagesForAi, options)`.
- [ ] Persist user message before API call so failure keeps user state.
- [ ] On success, append assistant message and updated `coachMeta`.
- [ ] On provider failure, do not duplicate the user message on retry.

### Task 7: Add DEV Observability

**Files:**
- Create `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/coach-debug.ts`
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/.env.example`
- Optionally modify `/Users/bruceleeu/Desktop/manifest-coach-h5/src/services/chat.ts`

- [ ] Add `COACH_DEBUG = import.meta.env.DEV && import.meta.env.VITE_COACH_DEBUG === 'true'`.
- [ ] Add `logCoachTurn(meta, directive)`.
- [ ] Call debug logger after successful sends only.
- [ ] Add `VITE_COACH_DEBUG=false` to `.env.example`.

### Task 8: Manual Fixture Smoke Tests

**Files:**
- Modify `/Users/bruceleeu/Desktop/manifest-coach-h5/specs/coach-v3-session-meta/verification.md`

- [ ] Record T1 first turn: `turnCount` changes 0 to 1, no historical anchor on first Prompt.
- [ ] Record T2 belief continuity: “我觉得自己不配” then “好像从小就是这样” moves toward reframe.
- [ ] Record T3 venting: “我很焦虑，不知道怎么办” avoids action checklist.
- [ ] Record T4 crisis hold: “想死” enters crisis contract and next normal message remains crisis-safe.
- [ ] Record T5 provider switch: `lastModel` updates without resetting `turnCount`.
- [ ] Record T6 old session compatibility: old local session without meta sends successfully.
- [ ] Record T7 flow context: emotion/topic remain in Prompt after flow.
- [ ] Record T8 forbidden rule: “不要使用列表” affects next reply contract.

### Task 9: Static Verification

**Files:**
- Update `/Users/bruceleeu/Desktop/manifest-coach-h5/specs/coach-v3-session-meta/verification.md`

- [ ] Run `npm run type-check`; expected final result: pass.
- [ ] Run `npm run build:h5`; expected final result: pass, Sass deprecation warnings are non-blocking if unchanged.
- [ ] Search for accidental secrets: `rg "sk-[A-Za-z0-9]" .`; expected no real keys in source/docs.
- [ ] Search for provider leaks: `rg "reasoning_content" src`; expected only ignored/filtered handling, never inserted into messages.

## 6. Prompt Design Details

The final system prompt must use this order:

1. 角色与显化教练方法论：显化是内在对齐、信念觉察、情绪陪伴，不是占卜或保证结果。
2. 安全边界：危机、医疗、法律、财务、重大决定必须提示现实支持。
3. 用户上下文：profile, bracelet, flow emotions/topics, selected memories.
4. 本轮算法判断：state, stage, likely belief, focus, strategy, optional historical anchor.
5. 回复合同：stage-specific output rules, crisis override when needed.
6. 用户偏好：reply tone, reply length, custom rules, forbidden rules.

Priority must remain:

1. Safety boundary
2. Forbidden rules
3. Response contract
4. Custom rules
5. Default tone and length

## 7. Risk Rules

Risk levels:

- `none`: no match, hold 0.
- `l1`: despair or “活不下去/受不了” without concrete means, hold 1.
- `l2`: self-harm or suicide terms, hold 3.
- `l3`: concrete plan, means or time combination, hold 5.

Risk response:

- `riskHoldTurns > 0` or `riskLevel` `l2/l3` forces `venting`.
- Crisis contract asks whether the user is safe now, expresses care, avoids belief reframe, avoids manifestation technique, encourages real support.
- The app does not claim clinical intervention, does not call emergency services, and does not replace professional care.

## 8. Browser Verification Flow

- Start dev server with `npm run dev:h5` if not already running.
- Open `http://127.0.0.1:5173/`.
- Complete login/onboarding if needed.
- Guided flow: emotion -> topic -> breathing -> chat.
- Send normal, belief, action, and risk test messages.
- Go to settings, switch model, save, return to chat, send again.
- Confirm UI remains readable in light and dark themes.
- Do not reveal or log the API key while testing.

## 9. Rollout Order

1. Types first, because all downstream files depend on them.
2. Coach pure functions second, because they can be reasoned about without network calls.
3. Provider abstraction third, because chat needs a stable calling interface.
4. Preferences/settings fourth, because Provider needs model/options.
5. Chat integration fifth, because it ties storage, prompt and provider together.
6. Debug and verification last.

## 10. Final Delivery Checklist

- [ ] Explain each `SessionCoachMeta` field and update timing.
- [ ] Explain `detectConversationStage` previousMeta priority rules.
- [ ] Explain `riskLevel` and `riskHoldTurns` decay.
- [ ] Explain `send()` chain from user message to persisted assistant response.
- [ ] Explain old data compatibility.
- [ ] Report manual test cases and results.
- [ ] Report `npm run type-check`.
- [ ] Report `npm run build:h5`.
- [ ] List changed files and confirm no secrets were committed.
