# План доведения панели Технопарка до показа проректору

Цель: к вторнику получить стабильную управленческую панель и копию данных, которую можно показывать как MVP.

## Контур

- GitHub-копия: https://github.com/amAILab/Technopark_project
- GitHub Pages: https://amailab.github.io/Technopark_project/
- Исходная публичная панель: https://step3dlab.github.io/Technopark_project/
- Исходная таблица: https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit

## Статус данных

Google Workspace CLI сейчас не авторизован, поэтому полноценная новая Google Sheet пока не создана автоматически.
Сделана локальная резервная копия исходной таблицы:

- `data/technopark_projects_source_2026-05-08.xlsx`
- `data/technopark_projects_source_2026-05-08.ods`
- `data/exported_csv/` — CSV-экспорт листов для контроля и анализа.

После авторизации `gws auth login` или передачи OAuth credentials нужно создать новую Google Sheet, импортировать XLSX и заменить `sheetId/scriptUrl` в конфиге сайта.

## Ближайшие задачи

1. Стабилизировать копию сайта на GitHub Pages.
2. Сделать безопасный режим демо, чтобы сайт не ломался при недоступности Google Sheets.
3. Подготовить управленческий экран для проректора: KPI, риски, грантовая готовность, решения на 7 дней.
4. Проверить мобильный/проекторный вид.
5. Подготовить короткий текст показа: что сделано, зачем, что требуется от руководства.

## Что не ломать

- Не менять структуру исходной таблицы без копии.
- Не менять live-репозиторий STEP3DLab без отдельного решения.
- Не удалять существующие модули и Apps Script URL, пока нет новой Google Sheet.
