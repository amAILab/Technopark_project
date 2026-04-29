/*
  Пустые состояния и диагностика загрузки данных.
  Задача: если Google Sheets / Apps Script не отдали данные, показать понятную
  официальную карточку с действиями, а не пустой или сломанный интерфейс.
  Google Sheets и Apps Script не изменяет.
*/

(function () {
  const CHECK_DELAY = 6500;

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasProjects() {
    return document.querySelectorAll("#projectTable .project-row").length > 0;
  }

  function syncText() {
    return cleanText(document.querySelector("#syncStatus")?.textContent || "");
  }

  function isLoadingStill() {
    const text = syncText().toLowerCase();
    return text.includes("загрузка") || text.includes("ожидание") || text.includes("не выполнено");
  }

  function ensureLoadState() {
    const actions = document.querySelector("#actions");
    if (!actions || document.querySelector("#dataLoadState")) return;

    const panel = document.createElement("section");
    panel.className = "section data-load-state";
    panel.id = "dataLoadState";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="data-load-card">
        <div>
          <p class="eyebrow">Диагностика данных</p>
          <h2>Данные пока не загружены</h2>
          <p>Панель не нашла проекты в таблице. Обычно это связано с доступом к Google Sheets, публикацией Apps Script, кешем GitHub Pages или изменением структуры ответа.</p>
        </div>
        <div class="data-load-actions">
          <button type="button" id="retryDataLoad">Обновить данные</button>
          <button type="button" id="openDataSource">Открыть таблицу</button>
          <button type="button" id="copyDataLoadReport">Копировать диагностику</button>
        </div>
        <div class="data-load-checklist">
          <article><b>1</b><span>Проверьте доступ к Google Таблице</span></article>
          <article><b>2</b><span>Проверьте, опубликован ли Apps Script как Web App</span></article>
          <article><b>3</b><span>Проверьте, что GitHub Pages показывает свежую версию</span></article>
          <article><b>4</b><span>Нажмите «Обновить без кеша» в блоке версии</span></article>
        </div>
      </div>
    `;

    actions.insertAdjacentElement("beforebegin", panel);
  }

  function updateLoadState() {
    ensureLoadState();
    const panel = document.querySelector("#dataLoadState");
    if (!panel) return;

    const shouldShow = !hasProjects() && isLoadingStill();
    panel.hidden = !shouldShow;
    document.body.classList.toggle("has-data-load-warning", shouldShow);
  }

  function fillEmptyContainers() {
    const configs = [
      { selector: "#actionBoard", title: "Нет действий", text: "После загрузки проектов здесь появятся управленческие действия." },
      { selector: "#qualityGrid", title: "Качество данных не рассчитано", text: "Проверка появится после загрузки проектного реестра." },
      { selector: "#gapList", title: "Нет данных для проверки", text: "Список полей для дозаполнения появится после синхронизации." },
      { selector: "#funnelBoard", title: "Воронка не рассчитана", text: "Этапы появятся после загрузки проектов." },
      { selector: "#grantGrid", title: "Гранты не загружены", text: "Календарь появится после синхронизации данных." },
      { selector: "#ntsAgenda", title: "Повестка не сформирована", text: "Вопросы к НТС появятся после анализа проектов." },
      { selector: "#decisionList", title: "Решений нет", text: "Список решений появится после анализа рисков и пустых полей." },
    ];

    configs.forEach((item) => {
      const node = document.querySelector(item.selector);
      if (!node || cleanText(node.textContent) || node.querySelector(".official-empty-state")) return;
      node.innerHTML = `
        <div class="official-empty-state">
          <strong>${item.title}</strong>
          <span>${item.text}</span>
        </div>
      `;
    });
  }

  function buildReport() {
    return [
      "Диагностика загрузки данных - Технопарк РГСУ",
      `Время: ${new Date().toLocaleString("ru-RU")}`,
      `Адрес: ${location.href}`,
      `Статус синхронизации: ${syncText() || "не найден"}`,
      `Проектов в DOM: ${document.querySelectorAll("#projectTable .project-row").length}`,
      `KPI всего: ${cleanText(document.querySelector("#kpiTotal")?.textContent || "0")}`,
      "",
      "Что проверить:",
      "1. Доступность Google Таблицы.",
      "2. Публикацию Apps Script как Web App.",
      "3. Корректность gid и структуры ответа.",
      "4. Кеш GitHub Pages и браузера.",
    ].join("\n");
  }

  async function copyReport() {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      toast("Диагностика скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Диагностика скопирована");
    }
  }

  function toast(message) {
    const node = document.querySelector("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("error");
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2800);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#retryDataLoad")) document.querySelector("#refreshData")?.click();
      if (event.target.closest("#openDataSource")) window.open("https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit", "_blank", "noopener,noreferrer");
      if (event.target.closest("#copyDataLoadReport")) copyReport();
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__emptyStatesObserver) return;
    window.__emptyStatesObserver = new MutationObserver(() => {
      setTimeout(updateLoadState, 180);
      setTimeout(fillEmptyContainers, 220);
    });
    window.__emptyStatesObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureLoadState();
    attachEvents();
    observeTable();
    setTimeout(fillEmptyContainers, 1200);
    setTimeout(updateLoadState, CHECK_DELAY);
    setTimeout(updateLoadState, 12000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
