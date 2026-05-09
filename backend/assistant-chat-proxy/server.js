import express from 'express';
import crypto from 'node:crypto';

const app = express();
app.use(express.json({ limit: '64kb' }));

const PORT = process.env.PORT || 8787;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://amailab.github.io';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

const requests = new Map();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function compactId() {
  return crypto.randomBytes(5).toString('hex');
}

function cleanText(value, max = 1800) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

async function sendTelegram(text) {
  if (!BOT_TOKEN || !OWNER_CHAT_ID) return { skipped: true };
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: OWNER_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) throw new Error(`Telegram ${response.status}: ${await response.text()}`);
  return response.json();
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'technopark-assistant-chat-proxy' });
});

app.post('/api/assistant-question', async (req, res) => {
  const question = cleanText(req.body?.question);
  if (!question) return res.status(400).json({ status: 'error', message: 'Question is required' });

  const id = compactId();
  const record = {
    id,
    status: 'pending',
    question,
    page: cleanText(req.body?.page, 500),
    createdAt: new Date().toISOString(),
    answer: '',
  };
  requests.set(id, record);

  const approveHint = `/answer_${id} текст ответа`;
  const message = [
    '🦞 <b>Вопрос с сайта Технопарка</b>',
    `<b>ID:</b> <code>${id}</code>`,
    `<b>Страница:</b> ${record.page || 'не указана'}`,
    '',
    question,
    '',
    `Ответить для сайта: <code>${approveHint}</code>`,
  ].join('\n');

  try {
    await sendTelegram(message);
  } catch (error) {
    record.status = 'telegram_error';
    record.error = String(error.message || error);
  }

  res.json({
    status: record.status,
    requestId: id,
    message: record.status === 'pending'
      ? 'Вопрос отправлен ассистенту. Ответ появится после подтверждения в Telegram.'
      : 'Вопрос сохранён, но Telegram-отправка не прошла. Проверьте backend env.',
    pollUrl: `${PUBLIC_BASE_URL}/api/assistant-answer/${id}`,
  });
});

app.get('/api/assistant-answer/:id', (req, res) => {
  const record = requests.get(req.params.id);
  if (!record) return res.status(404).json({ status: 'not_found' });
  res.json({ status: record.status, requestId: record.id, answer: record.answer || '', updatedAt: record.updatedAt || record.createdAt });
});

app.post('/api/telegram-webhook', async (req, res) => {
  const text = req.body?.message?.text || req.body?.edited_message?.text || '';
  const chatId = String(req.body?.message?.chat?.id || req.body?.edited_message?.chat?.id || '');
  if (OWNER_CHAT_ID && chatId && chatId !== String(OWNER_CHAT_ID)) return res.json({ ok: true, ignored: true });

  const match = text.match(/^\/answer_([a-f0-9]{10})\s+([\s\S]+)/i);
  if (!match) return res.json({ ok: true, ignored: true });

  const [, id, answerRaw] = match;
  const record = requests.get(id);
  if (!record) return res.json({ ok: false, error: 'request_not_found' });

  record.answer = cleanText(answerRaw, 4000);
  record.status = 'answered';
  record.updatedAt = new Date().toISOString();
  requests.set(id, record);
  await sendTelegram(`✅ Ответ для <code>${id}</code> сохранён и доступен на сайте.`).catch(() => {});
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`assistant-chat-proxy listening on :${PORT}`);
});
