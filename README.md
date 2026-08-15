# 你的内在空间（Coach）

uni-app + Vue 3 + TypeScript 的 H5 应用：AI 显化教练「你的内在空间」。数据默认存浏览器本地、按账号隔离，AI 对话走 DeepSeek（本机 Key 直连或 CloudBase 云函数转发）。本文档是项目唯一文档，涵盖运行、架构、约定与红线。

## 常用命令

```sh
npm install
cp .env.example .env
npm run dev:h5        # 本地开发（H5）
npm run test          # vitest（tests/ 下 3 个文件 7 个用例）
npm run type-check    # vue-tsc --noEmit
npm run build:h5      # 生产构建
```

改动后的最低验证标准：type-check、test、build:h5 三项全绿；涉及 UI 时用浏览器冒烟（构建产物可用任意静态服务器 + hash 路由直接打开）。

## 环境变量（.env）

```sh
VITE_DEEPSEEK_MODEL=deepseek-chat          # 默认模型，可选 deepseek-reasoner
VITE_COACH_DEBUG=false                     # true 时开发模式打印教练轮次日志（src/services/coach-debug.ts）
VITE_CLOUDBASE_ENV_ID=                     # CloudBase 环境 ID（云函数转发/云同步用）
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=                 # CloudBase publishable key
VITE_AUTH_API_BASE=                        # auth-session HTTP 函数网关地址，空则用 sessionStorage 会话
```

> 注意：`your-*` 占位值会被代码视为「未配置」（`cloudbase-app.ts` 的 `normalizeEnvValue`）。注册/登录用的手机号短信验证码走 CloudBase Auth：需要在控制台创建/激活环境、开启「身份认证 → 登录方式 → 手机号 → 短信验证码登录」（并配置短信签名/模板），再把真实环境 ID 与 Publishable Key 填入 .env；未配置时注册页会显示提示条，登录自动回退到历史本地账号。

**红线：任何 DeepSeek API Key 不进代码、.env、文档、日志。** 本地开发在「我 → 开发者工具」页面粘贴 Key（存 localStorage 键 `inner_space_developer_deepseek_api_key`，全局不隔离不同步）；生产放在云函数 `ai-complete` 的环境变量 `DEEPSEEK_API_KEY`。

## 目录结构

```
src/
  pages/            # 14 个路由页（见下文路由）
  components/ui/    # Ui* 组件，easycom 自动注册（^Ui([A-Z]...) → @/components/ui/Ui$1.vue）
  components/icons/ # icon-paths.ts + UiIcon（SVG 路径表）
  services/         # 全部业务逻辑（无传统后端）
    coach/          # 教练算法纯函数：state-machine / risk / prompt / context / meta / labels / tokenize
    providers/      # ChatProvider 抽象：types / deepseek / index(getActiveProvider)
    storage.ts      # localStorage 封装 + accountId 作用域隔离
    chat.ts         # 会话与发送管线（ChatService）
    cloudbase-app.ts / cloudbase-auth.ts / cloud-sync.ts / auth.ts / session-cookie.ts
    preferences.ts  # 外观(明/暗+点缀色)、回复风格/长度、模型选择、自定义规则
    desires.ts reflections.ts today.ts practice.ts local-stats.ts  # v3.4 成长闭环
    gamification.ts shop.ts   # 积分账本 / 商城 / Skill
    deepseek.ts     # testDeepSeekConnection（设置页测试连接）
  types/index.ts    # 全部领域类型
  utils/tab-nav.ts  # Tab 导航
  platform/runtime.ts
cloudfunctions/
  ai-complete/      # Event 函数：代理 DeepSeek，Key 在环境变量
  auth-session/     # HTTP 函数：HttpOnly Cookie 会话
```

## 功能详解

### 使用旅程

入口 `/pages/landing/index`（营销落地页：价值主张「安静下来，才能听见自己」+ 演示账号/注册/登录入口，已有会话自动跳进应用）→ auth/register（CloudBase 短信验证码注册，一手机号一账号）/ auth/login（手机号+密码，支持演示账号与历史本地账号）→ onboarding（收集称呼与重要过往，进入 Prompt 上下文）→ 主应用。

自定义 `UiTabBar` 四个主 Tab：**welcome(今日) / practice(练习) / chat(空间) / settings(我)**。<900px 底栏，≥900px 左侧栏；空间页桌面端为双栏（左会话列表右对话），移动端单栏。

### 空间（AI 教练对话）— 核心模块

`pages/chat/index` + `services/chat.ts`。右上角 ＋ 提供 6 种进入方式（`services/chat-entry.ts`）：

- **完整仪式**：flow 引导流 情绪(多选)→主题(多选)→呼吸调频(30 秒呼吸练习，可选疗愈音频)→进入对话；情绪与主题写入会话 `SessionCoachMeta`，此后每轮 Prompt 都携带
- **直接倾诉** / **继续上次对话** / **带着愿望进入**（携带活跃愿望上下文）
- **练习后进入**（把练习写下的内容带进对话）/ **带着回顾进入**（携带 7 天回顾摘要，今日页与记录页均可触发）

对话机制：规则教练状态机识别用户状态（焦虑/匮乏/自我怀疑/关系拉扯/行动卡住/愿望不清）与会话阶段（宣泄→澄清→信念识别→信念重构→行动落地），长期记忆按相关性最多选 3 条注入；失败保留用户消息、缺 Key 弹窗直达开发者工具；「沉淀这一刻」可手动把关键句存为信念/重构/行动/洞察（**绝不自动总结**）。危机协议对用户不可见（详见 AI 对话链路）。

### 今日（仪表盘）

`pages/welcome/index` + `services/today.ts`。按称呼问候、**今日状态**（记录此刻情绪+一句话，写入当日快照）、**今日一步**（未完成的小行动）、活跃愿望锚点（约 3 分钟）、手环连接状态、最近对话（继续/带着回顾进入）、今日练习入口、完整仪式入口、积分商店入口。文案基调：「今天，先不用急着变好」。

### 练习

`pages/practice/index` + `services/practice.ts`。每日练习按年内天数轮换 5 种类型，也可手动选当日类型：**信念改写 / 感谢记录 / 愿望靠近 / 身体扫描 / 呼吸稳定**。完成后记入练习历史（统计用），并可一键把练习内容带进 AI 对话（after_practice 模式）。

### 愿望管理

`pages/desires/index` + `services/desires.ts`。字段：标题 / 领域 / 为什么重要 / **当前阻碍信念** / 下一步小行动。状态 active / paused / completed，可设为活跃（作为对齐锚点显示在今日页并注入 Prompt 上下文）。

### 沉淀与成长记录

`pages/records/index` + `services/reflections.ts` / `local-stats.ts`。沉淀 4 类：**信念 / 重构句 / 行动 / 洞察**（对话页手动保存；行动完成后自动记积分）。记录页四个 Tab：最近对话 / 信念与重构 / 行动 / 统计。统计含 **7 天自我觉察**（练习天数、对话次数、信念/重构数、洞察数、行动完成率，反复声明「数字来自主动记录，不代表诊断」）与最近 30 天，可**带着回顾进入聊天**。

### 成长系统（积分 / 等级 / 每日任务）

`services/gamification.ts`。积分账本 `growth_points_ledger`，`awardOnce(source, refId)` 幂等去重：

| 每日任务 | 要求 | 积分 |
|---|---|---|
| 今日觉察 | 记录情绪或一句话 | 10 |
| 今日练习 | 完成当日练习 | 20 |
| 深入对话 | 当天 3 轮用户发言 | 25 |
| 沉淀一句 | 保存任一沉淀 | 15 |

等级按**累计获得**判定（消费不降级）共 5 级：初入空间(0) → 稳定回访(120) → 深度觉察(360) → 行动整合(720) → 内在锚定(1200)。聊天、练习完成、行动完成等行为均会计分。

### 商城（积分商店 / Skill 商城）

`pages/shop/index` + `services/shop.ts`。积分商店（一次性购买）：初锚徽章 40、稳定回访徽章 80、沉淀提示增强 60、今日进度高亮 50、紧凑气泡 70、标签字重 45。Skill 商城：**最多同时装备 2 个**，深听(免费) / 信念透镜 90 / 微行动落地 100 / 丰盛对齐 120 / 身体信号 85 / 清醒镜子 110。装备的技能通过 `buildEquippedSkillPromptBlock()` 注入教练 System Prompt 增强本轮风格（如「更少建议、更多情绪命名」「把对话收成 5–15 分钟小行动」），**安全边界永远优先于技能**。

### 个性化与我

`pages/settings/index` 双 Tab：

- **用户设置**：AI 配置（教练语气/回复长度/自定义规则/禁止限制规则，附实时 Prompt 预览）、明暗（结构层）+ 点缀色（气质层，9 种）、账号资料（称呼/重要过往）、成长进度、账户安全（改密码）、愿望概览、实体锚点、退出登录。
- **开发者工具**（`settings?tab=developer` 直达）：DeepSeek API Key 管理（本机 localStorage，密码框输入、可测试连接）、模型选择（deepseek-chat / deepseek-reasoner）、当前调用路径展示。

### 实体锚点（手环）

链接携带 `bracelet_id`（NFC/二维码）进入即触发绑定；绑定后显示在今日页连接状态，并作为物理锚点意象进入 Prompt 上下文。完全可选。

### 云同步

登录 CloudBase 账号后，scoped 本地数据同步到 NoSQL 集合 `inner_space_sync`（每账号一条 `bundle_{accountId}` 文档）；开发者 API Key 全局存储、**永不**同步云端。

## 数据层

`src/services/storage.ts`：前缀 `inner_space_`，迁移标志 `storage_scoped_v2`。

- **GLOBAL_DATA_KEYS**（跨账号）：auth_accounts、user_profile(s)、developer_deepseek_api_key 等。
- **SCOPED_DATA_KEYS**（按 accountId 隔离）：chat_sessions、active_session_id、coach_preferences、desires/reflections/today_snapshots/practice_history、active_flow、bracelets、memories、growth_points_ledger、shop/skill inventory、cloud_sync_meta 等。

登录后若配置了 CloudBase，scoped 数据同步到 NoSQL 集合 `inner_space_sync`（每账号一条 `bundle_{accountId}` 文档，集合权限设为仅登录用户读写自己文档）。

## AI 对话链路（核心）

`ChatService.send()` 单次发送的完整链路：

1. 先持久化用户消息（失败重试不重复插入），基于含新消息的会话计算教练指令。
2. `coach/` 纯函数层：`detectRiskSignals` → `detectUserState`/`detectConversationStage`（优先沿用 previousMeta 的 stage，避免回退）→ `extractLikelyBelief` → `selectRelevantMemories`（最多 3 条，关键词+近因）→ `buildCoachDirective` → `buildCoachSystemPrompt`。
3. System Prompt 块顺序（固定）：角色方法论 → 安全边界 → 用户上下文（profile/手环/flow 情绪主题/相关记忆）→ 本轮算法判断 → 回复合同 → 用户偏好。优先级：安全 > 禁止规则 > 回复合同 > 自定义规则 > 默认风格长度。
4. `getActiveProvider().complete()`（providers 抽象，当前仅 deepseek）。`deepseek-reasoner` 不发 temperature、绝不把 `reasoning_content` 回灌 messages；会话内切模型保留 coach 状态，`SessionCoachMeta` 记录 provider/model/turnCount。
5. `SessionCoachMeta` 随 chat_sessions 持久化；旧会话读取时 `normalizeCoachMeta` 自动补默认值。

**风险保持协议（不可削弱）**：`detectRiskSignals` 分级 none/l1(绝望感,hold 1)/l2(自伤自杀词,hold 3)/l3(具体计划手段时间,hold 5)。hold>0 或 l2/l3 时强制 venting 阶段，`shouldOverrideModelReply` 可触发 `buildCrisisOverrideReply` 覆盖模型回复：确认当下安全、表达关心、不做信念重构、不给显化技术、鼓励现实支持。应用不做临床干预、不替代专业帮助。每轮衰减 `max(0, hold-1)` 后再取新风险值。

**有本地 Key 浏览器直连 DeepSeek；否则走云函数 ai-complete**（`cloudbase-app.ts` 用 callFunction，窄类型 `CloudBaseApp` 不暴露 .ai()）。缺 Key 报错要可恢复：保留用户消息、弹窗可直达开发者工具。

## 认证与会话

配置 `VITE_AUTH_API_BASE` 时登录态写入 HttpOnly Cookie（auth-session HTTP 函数：GET/POST/DELETE /session、GET /health；环境变量 SESSION_SIGNING_SECRET、CORS_ORIGIN、COOKIE_SECURE）；未配置时用 sessionStorage（关标签页失效）。业务数据始终按 accountId 隔离，与认证方式解耦。

## 主题与 UI 系统

- **token 体系在 `src/uni.scss`**：结构层 `data-theme`（light/dark，中性骨架）+ 气质层 `data-accent`（slate/ink/terracotta/amber/forest/ocean/plum/rose/ochre 点缀色）。旧多主题键（sage/moon 等）归一化为 light。
- **重要：uni 编译器会把 uni.scss 完整内容自动注入每个样式块，组件里不要再写 `@import/@use 'uni.scss'`**（历史上写过 22 处冗余导入，已删除）。
- Salo 风格设计语言：冷纸白 `#f7f6f3` + 墨色 `#141414` + 石板青 accent；小圆角(4-8px)、1px 中性描边、无/极弱阴影、无玻璃拟态；主按钮墨底浅字，按压 `scale(0.98)`；入场动画 180-280ms ease-out；尊重 `prefers-reduced-motion`。
- 断点 <900px 底部 TabBar，≥900px 同一组件变左侧栏，内容 max-width 1120px。
- 字体：正文 Fustat（回退 Noto Sans SC/PingFang/微软雅黑），标签 Space Grotesk。

## CloudBase 部署（生产）

1. 部署 Event 函数 `ai-complete`，设 `DEEPSEEK_API_KEY`（含服务端规则安全层）。
2. 部署 HTTP 函数 `auth-session`（scf_bootstrap 已含），设 `SESSION_SIGNING_SECRET` 与 `CORS_ORIGIN`。
3. 创建 NoSQL 集合 `inner_space_sync` 并配置权限。
4. 前端 .env 填 VITE_CLOUDBASE_* 与 VITE_AUTH_API_BASE。

## 工具链注意事项（2026-08 修复记录）

- **type-check 的 `@cloudbase/ai` 隔离**：`@cloudbase/js-sdk@3.6.2` 的 d.ts 引用了未声明的 `@cloudbase/ai`，npm 会向上层目录解析；宿主机若存在语法过新的全局副本（TS5 `const` 类型参数），vue-tsc 解析直接失败（skipLibCheck 不吞语法错误）。tsconfig `paths` 已将其映射到本地垫片 `src/types/cloudbase-ai.d.ts`（`export type AI = unknown`）。若未来真要用 js-sdk AI 命名空间，改为声明真实依赖。
- **Sass**：构建零弃用警告。vite 5.2（uni-app 锁定版本）只支持 legacy JS API，已在 vite.config.ts 用 `silenceDeprecations: ['legacy-js-api']` 显式静音；升级 vite ≥5.4 后可改 `api: 'modern-compiler'` 并移除静音。不要恢复任何 `@import 'uni.scss'` 写法。
- TypeScript 锁 4.9 / vue-tsc 1.x，勿在依赖类型里使用 TS5 语法。

## 历史规格（已全部实现，原文档已删除）

- coach-v3-session-meta：规则教练状态机 + Provider 抽象 + SessionCoachMeta + 风险保持（上文已浓缩）。
- coach-v3-4-growth-loop：愿望 CRUD、反思沉淀、今日快照、练习历史、本地统计、设置页拆分与免责声明、Prompt 生活上下文相关性筛选。
- project-hardening-premium-ui：偏好校验、页面流稳定、主题变量全覆盖、Salo 高级 UI 与响应式。
- salo-ui-redesign + follow-ups：落地页、桌面双栏会话、UiIcon/UiBrandMark 图标系统。
- toolchain-hygiene：上文工具链修复。

## 约定

- 业务逻辑放 services 纯函数，页面只做编排与展示；coach 算法字段不暴露到普通用户 UI。
- 回复长度映射 max_tokens：简短≈260 / 平衡≈700 / 深入≈1100；temperature 仅 deepseek-chat 发送。
- 存储键改动需同步 GLOBAL/SCOPED 清单与 cloud-sync 兼容性；列表读取需 normalize（容错旧数据缺字段）。
- 危机文案、免责声明（settings 页）不可删除或弱化。
- 提交信息用英文 conventional commits（feat/fix/chore）。
