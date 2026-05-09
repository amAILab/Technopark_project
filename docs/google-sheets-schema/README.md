# Google Sheets schema — Technopark NTS OS

Рекомендуемые листы:

1. `Projects`
2. `People`
3. `ResourceAllocations`
4. `Requests`
5. `Grants`
6. `GrantTimeline`
7. `NTS_Agenda`
8. `Votes`
9. `VoteResponses`
10. `ChatNotes`
11. `AgentQueue`

CSV-шаблоны лежат в `data/sheets-templates/`.

## Ключевые правила

- Все ID строк стабильные: `project_id`, `person_id`, `request_id` и т.д.
- Все события пишутся в `AgentQueue`.
- Если агент недоступен, данные всё равно остаются в Sheets.
- Человеко-часы считаются формулой:

```text
hours_free_week = hours_total_week - hours_busy_week
```

- Назначения ресурсов хранятся отдельно в `ResourceAllocations`.
