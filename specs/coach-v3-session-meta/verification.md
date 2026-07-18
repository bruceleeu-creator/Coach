# Coach V3 Session Meta Verification

Date: 2026-07-01

## Static Checks

- `npm run type-check`: passed.
- `npm run build:h5`: passed.
- Build warnings: existing Sass legacy JS API and `@import` deprecation warnings remain non-blocking.
- Secret scan: `rg "sk-[a-f0-9]{32,}|sk-[A-Za-z0-9]{20,}" . -g '!node_modules' -g '!dist' -g '!unpackage' -g '!package-lock.json'` returned no real API key matches.
- Provider leak scan: `rg "reasoning_content" src -S` returned no matches.

## Browser Smoke Test

- Opened `http://localhost:5173/#/pages/auth/login`.
- Logged in with the demo account.
- Completed onboarding with a test display name and important past.
- Confirmed welcome page shows the saved display name and bracelet connection state.
- Opened settings page.
- Confirmed settings page shows the new DeepSeek model selector.
- Switched model from `deepseek-chat` to `deepseek-reasoner`.
- Switched theme to dark and saved settings.
- Confirmed `document.documentElement` has `data-theme="dark"`.
- Confirmed Prompt preview shows `模型选择：deepseek-reasoner`.
- Walked guided flow: emotions `焦虑` and `匮乏感`, topic `丰盛与事业`, breathing page, then chat.
- Confirmed chat opening message includes selected flow emotions and topic.
- Sent `我觉得自己不配赚到更多钱` without an API key.
- Confirmed the user message remains visible after the request fails.
- Confirmed the modal shows a clear DeepSeek API Key message and provides `去设置`.
- Confirmed `去设置` routes back to `/pages/settings/index`.

## Manual Cases Covered

- T1 first session start: guided chat starts with flow context and default coach meta is created in code path.
- T3 venting/no key failure: user message is preserved before provider failure.
- T5 provider selection: settings can save `deepseek-reasoner`; chat uses preference-driven provider options.
- T7 flow context: selected flow emotions/topics are visible in opening message and are now included in the system prompt builder.

## Cases Requiring A Real API Key

- Real DeepSeek response quality with `deepseek-chat`.
- Real DeepSeek response quality with `deepseek-reasoner`.
- Multi-turn `riskHoldTurns` decay after successful assistant replies.
- `lastProviderId` / `lastModel` persistence after successful provider calls.

These paths are implemented but require a valid API key to verify against the live DeepSeek API.
