# Assistant chat backend for Technopark site

Goal: site → backend → Telegram/OpenClaw assistant → owner confirmation → answer visible on site.

## Why backend is required

GitHub Pages is static. It cannot securely store Telegram bot tokens, receive Telegram webhooks, or push confirmed answers back to a browser by itself.

Do **not** expose Telegram bot token in frontend JavaScript.

## Frontend contract

If `window.TECHNOPARK_ASSISTANT_WEBHOOK` is set, `app-openai.js` sends:

```json
{
  "source": "technopark_site",
  "question": "user text",
  "page": "https://...",
  "createdAt": "ISO timestamp"
}
```

Expected backend response:

```json
{
  "status": "pending",
  "requestId": "abc123",
  "message": "Вопрос отправлен ассистенту. Ответ появится после подтверждения."
}
```

Optional immediate answer:

```json
{
  "status": "answered",
  "answer": "..."
}
```

## Recommended backend flow

1. Receive question from site.
2. Send it to Telegram bot / OpenClaw session as an approval request.
3. Store request by `requestId`.
4. After owner confirmation in Telegram, store approved answer.
5. Provide polling endpoint or SSE/WebSocket so site can fetch answer.

## Current fallback

Until backend URL is configured, the site opens `@openclaw_step3d_bot` and copies the question to clipboard.
