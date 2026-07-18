# CloudBase 云函数

## ai-complete（Event 函数）

代理 DeepSeek 对话请求，API Key 只保存在云函数环境变量中。

环境变量：

- `DEEPSEEK_API_KEY`：DeepSeek API Key（必填）

部署后，前端通过 `@cloudbase/js-sdk` 的 `callFunction({ name: 'ai-complete' })` 调用。

## auth-session（HTTP 函数）

为 H5 提供 HttpOnly 会话 Cookie，避免在 localStorage 保存登录态。

环境变量：

- `SESSION_SIGNING_SECRET`：Cookie 签名密钥（必填，随机长字符串）
- `CORS_ORIGIN`：允许的前端 Origin，例如 `https://your-domain.com`
- `COOKIE_SECURE`：设为 `false` 可在本地 HTTP 调试；生产保持默认

端点：

- `GET /health`：健康检查
- `GET /session`：读取当前会话
- `POST /session`：建立会话（body: `{ accountId, userId }`）
- `DELETE /session`：退出登录

部署 HTTP 函数后，在前端 `.env` 配置：

```sh
VITE_AUTH_API_BASE=https://your-gateway-url/auth-session
```

未配置时，开发环境会使用 `sessionStorage` 保存会话（关闭标签页即失效），业务数据按 `accountId` 隔离。

## 云数据库同步

CloudBase 账号登录后，前端会将 scoped 业务数据同步到文档库集合 `inner_space_sync`（每账号一条 `bundle_{accountId}` 文档）。

控制台需创建集合并配置权限（建议：仅登录用户可读写自己的 `accountId` 文档）。