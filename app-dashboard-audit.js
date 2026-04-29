/*
  Аудит перед показом панели Технопарка РГСУ.
  Проверяет наличие ключевых блоков, количество проектов, состояние данных
  и экспортирует повестку НТС в Markdown. Google Sheets не изменяет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function ensureAuditButton() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#auditToggle")) return;
    const button = document.createElement("button");
    button.className = "button ghost audit-toggle-button";
    button.id = "auditToggle";
    button.type = "button";
    button.textContent = "Аудит";
    actions.appendChild(button);
  }

  function ensureAuditPanel() {
    const overview = document.querySelector("#overview");
    if (!overview || document.querySelector("#dashboardAudit")) return;
    const panel = document.createElement("section");
    panel.className = "dashboard-audit";
    panel.id = "dashboardAudit";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="audit-head">
        <div>
          <p class="eyebrow">Проверка перед показом</p>
          <h2>Аудит панели</h2>
        </div>
        <div class="audit-actions">
          <button type="button" id="runAudit">Проверить</button>
          <button type="button" id="copyAuditReport">Копировать отчет</button>
          <button type="button" id="exportNtsMarkdown">Повестка Markdown</button>
        </div>
      </div>
      <div class="audit-grid" id="auditGrid"></div>
    `;
    overview.insertAdjacentElement("afterend", panel);
  }

  function test(label, ok, hint) {
    return { label, ok: Boolean(ok), hint };
  }

  function collectAudit() {
    const rows = document.querySelectorAll("#projectTable .project-row").length;
    const actions = document.querySelectorAll("#actionBoard .action-row:not(.action-head)").length;
    const agenda = document.querySelectorAll("#ntsAgenda .agenda-item").length;
    const quality = document.querySelectorAll("#qualityGrid .quality-card").length;
    const grants = document.querySelectorAll("#grantGrid .grant-line").length;
    const syncText = cleanText(document.querySelector("#syncStatus")?.textContent || "").toLowerCase();
    const hasError = syncText.includes("не удалось") || syncText.includes("ошибка");

    return [
      test("Данные Google Sheets загружены", rows > 0 && !hasError, rows > 0 ? `Найдено проектов: ${rows}` : "Проекты не отрисованы. Проверьте доступ и gid."),
      test("KPI отображаются", Number(cleanText(document.querySelector("#kpiTotal")?.textContent)) > 0, "Проверьте верхние карточки KPI."),
      test("Блок действий работает", actions > 0 || rows > 0, actions > 0 ? `Пунктов действий: ${actions}` : "Критических действий нет или данные неполные."),
      test("Качество данных рассчитано", quality >= 5, `Карточек качества данных: ${quality}`),
      test("Проекты можно фильтровать", Boolean(document.querySelector("#quickFilters")), "Быстрые фильтры подключены."),
      test("Гранты отображаются", grants > 0, grants > 0 ? `Грантовых строк: ${grants}` : "Проверьте лист грантов."),
      test("Повестка НТС сформирована", agenda > 0 || rows > 0, agenda > 0 ? `Пунктов повестки: ${agenda}` : "Нет явных вопросов к НТС."),
      test("Печать повестки доступна", Boolean(document.querySelector("#printNtsAgenda")), "Кнопка печати должна быть в разделе НТС."),
      test("CSV и сводка доступны", Boolean(document.querySelector("#exportVisibleProjects")) && Boolean(document.querySelector("#copyDashboardSummary")), "Кнопки находятся в шапке."),
      test("Режим НТС доступен", Boolean(document.querySelector("#executiveModeToggle")), "Кнопка режима НТС находится в шапке."),
    ];
  }

  function renderAudit() {
    const grid = document.querySelector("#auditGrid");
    if (!grid) return;
    const results = collectAudit();
    const passed = results.filter((item) => item.ok).length;
    grid.innerHTML = `
      <article class="audit-summary ${passed === results.length ? "is-ok" : "is-warn"}">
        <strong>${passed}/${results.length}</strong>
        <span>${passed === results.length ? "Панель готова к показу" : "Есть пункты для проверки"}</span>
      </article>
      ${results.map((item) => `
        <article class="audit-item ${item.ok ? "is-ok" : "is-warn"}">
          <b>${item.ok ? "✓" : "!"}</b>
          <div><strong>${item.label}</strong><small>${item.hint}</small></div>
        </article>
      `).join("")}
    `;
  }

  function buildAuditReport() {
    const results = collectAudit();
    const passed = results.filter((item) => item.ok).length;
    return [
      "Аудит панели Технопарка РГСУ",
      `Дата проверки: ${new Date().toLocaleString("ru-RU")}`,
      `Итог: ${passed}/${results.length}`,
      "",
      ...results.map((item) => `${item.ok ? "✓" : "!"} ${item.label} - ${item.hint}`),
    ].join("\n");
  }

  function listItems(selector) {
    return Array.from(document.querySelectorAll(selector)).map((item) => cleanText(item.textContent));
  }

  function buildNtsMarkdown() {
    const kpi = [
      ["Всего проектов", "#kpiTotal"],
      ["Активные", "#kpiActive"],
      ["Готовы к грантам", "#kpiReady"],
      ["Требуют действий", "#kpiRisks"],
      ["Пожелания НТС", "#kpiFeedback"],
    ].map(([label, selector]) => `- **${label}:** ${cleanText(document.querySelector(selector)?.textContent || "0")}`);

    const agenda = listItems("#ntsAgenda .agenda-item");
    const decisions = listItems("#decisionList .agenda-item");
    const actions = listItems("#actionBoard .action-row:not(.action-head)").slice(0, 12);

    return [
      "# Повестка НТС - Технопарк РГСУ",
      "",
      `Дата формирования: ${new Date().toLocaleString("ru-RU")}`,
      "",
      "## KPI",
      ...kpi,
      "",
      "## Что требует действия",
      ...(actions.length ? actions.map((item, index) => `${index + 1}. ${item}`) : ["Критических действий нет."]),
      "",
      "## Вынести на НТС",
      ...(agenda.length ? agenda.map((item, index) => `${index + 1}. ${item}`) : ["Нет явных вопросов для вынесения."]),
      "",
      "## Решения",
      ...(decisions.length ? decisions.map((item, index) => `${index + 1}. ${item}`) : ["Критические решения не выявлены."]),
      "",
    ].join("\n");
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast(successMessage);
    }
  }

  function downloadMarkdown() {
    const text = buildNtsMarkdown();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Повестка НТС Технопарк РГСУ.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Повестка Markdown экспортирована");
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("error");
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#auditToggle")) {
        const panel = document.querySelector("#dashboardAudit");
        if (!panel) return;
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderAudit();
      }
      if (event.target.closest("#runAudit")) renderAudit();
      if (event.target.closest("#copyAuditReport")) copyText(buildAuditReport(), "Отчет аудита скопирован");
      if (event.target.closest("#exportNtsMarkdown")) downloadMarkdown();
    });
  }

  function init() {
    ensureAuditButton();
    ensureAuditPanel();
    attachEvents();
    setTimeout(renderAudit, 2400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
