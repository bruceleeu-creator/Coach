# 你的内在空间 H5

独立的 `uni-app + Vue3 + TypeScript` H5 项目，用于实现 AI 显化教练。

## 运行

```sh
npm install
cp .env.example .env
npm run dev:h5
```

## 让 AI 对话可用（必读）

对话需要 DeepSeek 密钥，二选一：

### 方式 A：开发者本机 Key（最快）

1. 登录后进入 **我 → 开发者工具**
2. 粘贴 DeepSeek API Key（控制台 `sk-...`）
3. 点 **保存 API Key** → **测试 AI 连接**
4. 回到 **空间** 开始对话

密钥只存在本浏览器本地，不同步云端、不进 Prompt。

也可从聊天页顶部「AI 尚未配置」横幅，或失败弹窗 **去配置** 直达开发者工具。

### 方式 B：CloudBase 云函数（推荐生产）

1. 部署 `cloudfunctions/ai-complete`
2. 在云函数环境变量设置 `DEEPSEEK_API_KEY`
3. 前端配置 CloudBase 相关 `VITE_*` 变量
4. 本机可不填 Key，请求走云函数转发

## 架构要点

- **无传统业务后端**：对话、愿望、沉淀等数据默认保存在浏览器本地，并按 `accountId` 隔离。
- **AI 调用**：有本地 Key 时浏览器直连 DeepSeek；否则调用云函数 `ai-complete`。
- **会话安全**：配置 `VITE_AUTH_API_BASE` 后，登录态写入 HttpOnly Cookie；未配置时使用 `sessionStorage`（关闭标签页失效）。

## 环境变量

```sh
VITE_DEEPSEEK_MODEL=deepseek-chat
VITE_COACH_DEBUG=false
VITE_CLOUDBASE_ENV_ID=your-full-cloudbase-env-id
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=your-cloudbase-publishable-key
VITE_AUTH_API_BASE=
```

请勿把 DeepSeek 密钥写进 `.env` 前端变量；开发用「开发者工具」本机 Key，生产用云函数环境变量。

## CloudBase 部署

1. 部署 `cloudfunctions/ai-complete`，设置 `DEEPSEEK_API_KEY`（含服务端规则安全层）。
2. 部署 `cloudfunctions/auth-session`（HTTP 函数），设置 `SESSION_SIGNING_SECRET` 与 `CORS_ORIGIN`。
3. 创建 NoSQL 集合 `inner_space_sync`，允许 CloudBase 登录用户读写自己的同步文档。
4. 将 HTTP 函数网关地址填入 `VITE_AUTH_API_BASE`。

详见 [cloudfunctions/README.md](cloudfunctions/README.md)。

## 测试

```sh
npm run test
npm run type-check
npm run build:h5
```

## 页面与导航

入口：`/pages/landing/index`（未登录落地页）

主 Tab（自定义 `UiTabBar`）：

- `/pages/welcome/index`：今日
- `/pages/practice/index`：练习
- `/pages/chat/index`：空间（桌面双栏会话列表）
- `/pages/settings/index`：我（用户设置 / 开发者工具）

子页面：`/pages/records/index`、`/pages/desires/index`、仪式流 `flow/*`、`/pages/shop/index`（积分商店 / Skill 商城）。

快捷：
- `/pages/settings/index?tab=developer` 直达开发者工具
- 今日页 / 成长记录 / 设置 → 成长进度 可进商城

## NFC / 二维码入口

链接携带 `bracelet_id` 可触发实体锚点绑定：

```text
https://your-domain.com/#/pages/auth/login?bracelet_id=crystal_001
```
