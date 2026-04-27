# Технопарк РГСУ: проекты и гранты

Готовый статический dashboard для управления проектами технопарка: чтение Google Таблицы, добавление проектов через Apps Script, фильтры, реестр, грантовая воронка и список ближайших действий.

## Запуск

Откройте `index.html` в браузере. Сайт уже подключен к таблице:

`https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit?gid=969711980`

## Запись в таблицу

URL Apps Script уже добавлен в `app.js` как стандартный адрес:

`https://script.google.com/macros/s/AKfycbzTl0x-ygpETmGhnwkK0CTt0SIbeOBgM0OjhAsbK05pKkIu9UO5EUUjiYFq0V_AWxk/exec`

Для защиты от случайных изменений форма требует код подтверждения `11111111`. Этот же код проверяется в `google-apps-script.gs`, поэтому после обновления скрипта нужно заново развернуть Apps Script.

Текущий лист Google Таблицы содержит сводку и ближайшие грантовые окна. Сайт умеет читать эту структуру, а новые проекты, добавленные через форму, будут распознаваться как строки реестра после обновления.

## Публикация на GitHub Pages

1. Создайте репозиторий на GitHub.
2. Загрузите в корень репозитория все файлы проекта: `index.html`, `styles.css`, `app.js`, `.nojekyll`, `robots.txt`, `README.md`.
3. Сделайте commit и push в ветку `main`.
4. Откройте `Settings` -> `Pages`.
5. В блоке `Build and deployment` выберите `Deploy from a branch`.
6. Выберите ветку `main` и папку `/ (root)`, затем нажмите `Save`.
7. Через 1-5 минут сайт будет доступен по адресу вида `https://USERNAME.github.io/REPOSITORY/`.

Официальная инструкция GitHub: https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Файлы

- `index.html` - структура приложения и публичные метатеги.
- `styles.css` - адаптивный UI.
- `app.js` - загрузка данных, фильтры, воронка, код подтверждения и отправка в Apps Script.
- `google-apps-script.gs` - код веб-приложения Apps Script с проверкой кода.
- `.nojekyll` - отключает обработку Jekyll на GitHub Pages.
- `robots.txt` - разрешает индексацию опубликованного сайта.
