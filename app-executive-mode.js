/*
  Режим показа для НТС, сортировка таблицы, копирование строки проекта,
  справка по расчетам и горячие клавиши.
  Работает поверх отрисованной таблицы и не меняет Google Sheets.
*/

(function () {
  const SORTABLE_COLUMNS = [1, 2, 3, 4, 5, 6, 7];
  let sortState = { index: null, direction: "asc" };
  const pageOpenedAt = Date.now();

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function safeCss(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replaceAll('"', '\\"');
  }

  function getRows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function getDetail(uid) {
    if (!uid) return null;
    return document.querySelector(`[data-detail="${safeCss(uid)}"]`);
  }

  function ensureExecutiveButton() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#executiveModeToggle")) return;
    const button = document.createElement("button");
    button.className = "button ghost executive-mode-button";
    button.id = "executiveModeToggle";
    button.type = "button";
    button.textContent = "Режим НТС";
    actions.insertBefore(button, actions.firstChild);
  }

  function ensureHelpButton() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#dashboardHelpToggle")) return;
    const button = document.createElement("button");
    button.className = "button ghost dashboard-help-button";
    button.id = "dashboardHelpToggle";
    button.type = "button";
    button.textContent = "?";
    button.setAttribute("aria-label", "Горячие клавиши и справка");
    actions.appendChild(button);
  }

  function toggleExecutiveMode() {
    const enabled = document.body.classList.toggle("executive-mode");
    const button = document.querySelector("#executiveModeToggle");
    if (button) {
      button.classList.toggle("is-active", enabled);
      button.textContent = enabled ? "Обычный режим" : "Режим НТС";
    }
    try {
      localStorage.setItem("technopark_executive_mode", enabled ? "1" : "0");
    } catch (error) {
      console.warn("Не удалось сохранить режим НТС", error);
    }
  }

  function restoreExecutiveMode() {
    try {
      const saved = localStorage.getItem("technopark_executive_mode") === "1";
      if (!saved) return;
      document.body.classList.add("executive-mode");
      const button = document.querySelector("#executiveModeToggle");
      if (button) {
        button.classList.add("is-active");
        button.textContent = "Обычный режим";
      }
    } catch (error) {
      console.warn("Не удалось восстановить режим НТС", error);
    }
  }

  function ensureDataFreshness() {
    const syncCard = document.querySelector(".sync-card");
    if (!syncCard || document.querySelector("#dataFreshness")) return;
    const freshness = document.createElement("div");
    freshness.className = "data-freshness is-fresh";
    freshness.id = "dataFreshness";
    freshness.innerHTML = `<strong>Данные свежие</strong><small>Автоконтроль времени с момента открытия панели</small>`;
    syncCard.appendChild(freshness);
  }

  function updateDataFreshness() {
    const node = document.querySelector("#dataFreshness");
    if (!node) return;
    const minutes = Math.floor((Date.now() - pageOpenedAt) / 60000);
    const stale = minutes >= 30;
    node.classList.toggle("is-stale", stale);
    node.classList.toggle("is-fresh", !stale);
    node.innerHTML = stale
      ? `<strong>Данные могут устареть</strong><small>Панель открыта ${minutes} мин. Нажмите «Обновить».</small>`
      : `<strong>Данные свежие</strong><small>Панель открыта ${minutes} мин.</small>`;
  }

  function ensureMethodologyPanel() {
    const quality = document.querySelector("#quality");
    if (!quality || document.querySelector("#methodologyPanel")) return;
    const panel = document.createElement("details");
    panel.className = "methodology-panel";
    panel.id = "methodologyPanel";
    panel.innerHTML = `
      <summary>Как панель считает готовность и риски</summary>
      <div class="methodology-grid">
        <article>
          <strong>Готовность проекта</strong>
          <p>Если в таблице указан процент готовности, панель использует его. Если процент не указан, сайт рассчитывает ориентировочную готовность по заполненным признакам: описание, ТЗ, ответственный, грант, бюджет, срок, партнер и следующее действие.</p>
        </article>
        <article>
          <strong>Риск проекта</strong>
          <p>Проект попадает в риск, если нет ответственного, готовности, грантового маршрута, срока, следующего действия, есть просрочка, дедлайн меньше 14 дней или статус связан с решением НТС.</p>
        </article>
        <article>
          <strong>Качество данных</strong>
          <p>Блок показывает не качество проекта, а качество заполнения реестра. Низкий процент означает, что управленческие выводы могут быть неточными.</p>
        </article>
      </div>
    `;
    quality.appendChild(panel);
  }

  function ensureHelpPanel() {
    if (document.querySelector("#dashboardHelpPanel")) return;
    const panel = document.createElement("aside");
    panel.className = "dashboard-help-panel";
    panel.id = "dashboardHelpPanel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="dashboard-help-card">
        <div class="help-head"><strong>Горячие клавиши</strong><button type="button" id="closeDashboardHelp" aria-label="Закрыть справку">×</button></div>
        <dl>
          <dt>/</dt><dd>перейти в поиск проектов</dd>
          <dt>Esc</dt><dd>сбросить фокус и закрыть справку</dd>
          <dt>N</dt><dd>включить или выключить режим НТС</dd>
          <dt>P</dt><dd>печать повестки НТС</dd>
          <dt>?</dt><dd>открыть эту справку</dd>
        </dl>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function toggleHelp(force) {
    const panel = document.querySelector("#dashboardHelpPanel");
    if (!panel) return;
    const open = typeof force === "boolean" ? force : !panel.classList.contains("is-visible");
    panel.classList.toggle("is-visible", open);
    panel.setAttribute("aria-hidden", String(!open));
  }

  function ensureSortableHeaders() {
    const headers = Array.from(document.querySelectorAll(".projects-table thead th"));
    headers.forEach((header, index) => {
      if (!SORTABLE_COLUMNS.includes(index) || header.classList.contains("sortable-th")) return;
      const label = cleanText(header.textContent);
      header.classList.add("sortable-th");
      header.innerHTML = `<button type="button" data-sort-index="${index}">${label}</button>`;
    });
  }

  function parseNumber(text) {
    const match = cleanText(text).replace(",", ".").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : Number.NaN;
  }

  function sortValue(row, index) {
    const cell = row.children[index];
    if (!cell) return "";
    const text = cleanText(cell.textContent).toLowerCase();
    if (index === 6) {
      const num = parseNumber(text);
      return Number.isNaN(num) ? -1 : num;
    }
    if (index === 5) {
      const missing = text.includes("нет срока");
      if (missing) return 99999999;
    }
    return text;
  }

  function sortProjects(index) {
    const body = document.querySelector("#projectTable");
    if (!body) return;
    const rows = getRows();
    if (!rows.length) return;
    const direction = sortState.index === index && sortState.direction === "asc" ? "desc" : "asc";
    sortState = { index, direction };

    const pairs = rows.map((row) => ({ row, detail: getDetail(row.dataset.project), value: sortValue(row, index) }));
    pairs.sort((a, b) => {
      let result;
      if (typeof a.value === "number" && typeof b.value === "number") result = a.value - b.value;
      else result = String(a.value).localeCompare(String(b.value), "ru");
      return direction === "asc" ? result : -result;
    });

    pairs.forEach((pair) => {
      body.appendChild(pair.row);
      if (pair.detail) body.appendChild(pair.detail);
    });

    document.querySelectorAll(".sortable-th").forEach((header) => header.classList.remove("is-sort-asc", "is-sort-desc"));
    const active = document.querySelector(`[data-sort-index="${index}"]`)?.closest("th");
    if (active) active.classList.add(direction === "asc" ? "is-sort-asc" : "is-sort-desc");
  }

  function ensureRowCopyButtons() {
    getRows().forEach((row) => {
      const uid = row.dataset.project;
      const detail = getDetail(uid);
      if (!detail || detail.querySelector(".row-copy-button")) return;
      const button = document.createElement("button");
      button.className = "row-copy-button";
      button.type = "button";
      button.dataset.copyProject = uid;
      button.textContent = "Копировать проект";
      const container = detail.querySelector(".project-detail") || detail.children[0];
      container?.appendChild(button);
    });
  }

  function buildProjectText(uid) {
    const row = document.querySelector(`[data-project="${safeCss(uid)}"]`);
    const detail = getDetail(uid);
    if (!row) return "";
    const cells = Array.from(row.children).slice(1).map((cell) => cleanText(cell.textContent));
    const detailText = cleanText(detail?.textContent || "").replace("Копировать проект", "").trim();
    return [
      "Проект Технопарка РГСУ",
      `Проект: ${cells[0] || ""}`,
      `Ответственный: ${cells[1] || ""}`,
      `Статус: ${cells[2] || ""}`,
      `Грант: ${cells[3] || ""}`,
      `Срок: ${cells[4] || ""}`,
      `Готовность: ${cells[5] || ""}`,
      `Риск: ${cells[6] || ""}`,
      detailText ? `Детали: ${detailText}` : "",
    ].filter(Boolean).join("\n");
  }

  async function copyProject(uid) {
    const text = buildProjectText(uid);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Проект скопирован");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Проект скопирован");
    }
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

  function isTypingTarget(target) {
    const tag = target?.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#executiveModeToggle")) toggleExecutiveMode();
      if (event.target.closest("#dashboardHelpToggle")) toggleHelp();
      if (event.target.closest("#closeDashboardHelp")) toggleHelp(false);
      const sortButton = event.target.closest("[data-sort-index]");
      if (sortButton) sortProjects(Number(sortButton.dataset.sortIndex));
      const copyButton = event.target.closest("[data-copy-project]");
      if (copyButton) copyProject(copyButton.dataset.copyProject);
    });

    document.addEventListener("keydown", (event) => {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") event.target.blur();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        document.querySelector("#searchInput")?.focus();
      }
      if (event.key === "Escape") toggleHelp(false);
      if (event.key.toLowerCase() === "n") toggleExecutiveMode();
      if (event.key.toLowerCase() === "p") document.querySelector("#printNtsAgenda")?.click();
      if (event.key === "?" || (event.shiftKey && event.key === "/")) toggleHelp();
    });
  }

  function watchTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__executiveModeObserver) return;
    window.__executiveModeObserver = new MutationObserver(() => {
      setTimeout(() => {
        ensureSortableHeaders();
        ensureRowCopyButtons();
      }, 120);
    });
    window.__executiveModeObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureExecutiveButton();
    ensureHelpButton();
    restoreExecutiveMode();
    ensureDataFreshness();
    ensureMethodologyPanel();
    ensureHelpPanel();
    ensureSortableHeaders();
    ensureRowCopyButtons();
    attachEvents();
    watchTable();
    updateDataFreshness();
    setInterval(updateDataFreshness, 60000);
    setTimeout(() => {
      ensureSortableHeaders();
      ensureRowCopyButtons();
      updateDataFreshness();
    }, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
