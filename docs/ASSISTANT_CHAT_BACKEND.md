# Assistant chat backend for Technopark site

Goal: site → backend → Telegram/OpenClaw assistant → owner confirmation → answer visible on site.

GitHub Pages is static. It cannot securely store Telegram bot tokens, receive Telegram webhooks, or push confirmed answers back to a browser by itself. Tokens must live only on the backend.

## What is included

`backend/assistant-chat-proxy/` contains a minimal Node/Express proxy:

- `POST /api/assistant-question` — receives a question from the site and forwards it to Telegram owner chat.
- `GET /api/assistant-answer/:id` — frontend polls this endpoint until an answer appears.
- `POST /api/telegram-webhook` — Telegram webhook. Owner can answer with `/answer_<id> text`.
- `GET /health` — health check.

## Environment variables

```bash
TELEGRAM_BOT_TOKEN=...
OWNER_CHAT_ID=7260915527
ALLOWED_ORIGIN=https://amailab.github.io
PUBLIC_BASE_URL=https://your-chat-proxy.example.com
PORT=8787
```

## Deploy outline

1. Deploy `backend/assistant-chat-proxy` to Railway/Render/Fly/VPS.
2. Set environment variables.
3. Register Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/telegram-webhook"
```

4. Copy `assistant-chat-config.example.js` to `assistant-chat-config.js` and set:

```js
window.TECHNOPARK_ASSISTANT_WEBHOOK = "https://your-chat-proxy.example.com/api/assistant-question";
```

5. Include `assistant-chat-config.js` before `app-openai.js` on the page, or inject it during deployment.

## Owner workflow

1. Visitor asks a question on the site.
2. Backend sends Telegram message to owner chat with request ID.
3. Owner replies in Telegram:

```text
/answer_ab12cd34ef Здесь текст ответа для сайта
```

4. Site polling receives the answer and shows it in the chat panel.

## Current fallback

Until backend URL is configured, the site opens `@openclaw_step3d_bot` and copies the question to clipboard.

## Added deploy files

This repo now includes:

- `backend/assistant-chat-proxy/Dockerfile` — container deploy.
- `backend/assistant-chat-proxy/railway.json` — Railway deploy config.
- `render.yaml` — Render blueprint.
- `assistant-chat-config.js` — frontend webhook config placeholder.

## Minimal launch checklist

1. Deploy `backend/assistant-chat-proxy`.
2. Set env vars:
   - `TELEGRAM_BOT_TOKEN`
   - `OWNER_CHAT_ID=7260915527`
   - `ALLOWED_ORIGIN=https://amailab.github.io`
   - `PUBLIC_BASE_URL=https://<deployed-backend>`
3. Set Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_BASE_URL/api/telegram-webhook"
```

4. Update `assistant-chat-config.js`:

```js
window.TECHNOPARK_ASSISTANT_WEBHOOK = "https://<deployed-backend>/api/assistant-question";
```

5. Commit/push config without secrets.

## Persistence and admin check

The proxy now stores recent requests in `DATA_DIR/requests.json` so pending answers survive normal process restarts when the hosting volume persists.

Optional admin endpoint:

```bash
curl -H "x-admin-token: $ADMIN_TOKEN" "$PUBLIC_BASE_URL/api/assistant-requests"
```

Set `ADMIN_TOKEN` to protect the endpoint. If it is not set, the endpoint is open on the backend URL, so set it for production.
