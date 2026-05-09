# Google Apps Script API contract

## Endpoints

Apps Script Web App должен принимать `POST` JSON и возвращать JSON.

### `submitRequest`

Запись универсальной формы в `Requests` + событие в `AgentQueue`.

```json
{
  "action": "submitRequest",
  "payload": {
    "name": "Иванов И.И.",
    "email": "ivanov@example.com",
    "telegram": "@ivanov",
    "category": "студент",
    "type": "вопрос для обсуждения на НТС",
    "project_id": "PRJ-001",
    "lab": "Робототехника и БПЛА",
    "text": "Предлагаю обсудить проект",
    "nts_required": true
  }
}
```

### `submitChatNote`

Запись нижнего чата в `ChatNotes` + событие в `AgentQueue`.

### `createVote`

Создание голосования в `Votes`, генерация `qr_url`, событие агенту.

### `submitVoteResponse`

Запись ответа участника в `VoteResponses`.

### `updateResourceAllocation`

Запись назначения человеко-часов в `ResourceAllocations`, пересчёт занятости.

## Response format

```json
{
  "ok": true,
  "id": "REQ-001",
  "message": "saved"
}
```

Ошибки:

```json
{
  "ok": false,
  "error": "validation_error",
  "message": "name is required"
}
```
