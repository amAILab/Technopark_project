/*
  Надстройка над app-compact.js.
  Работает по готовой DOM-таблице, поэтому не зависит от внутренних const-переменных
  основного скрипта и не меняет структуру Google Sheets.
*/

(function () {
  const FILTERS = [
    { key: "all", label: "Все проекты" },
    { key: "risk", label: "Есть риск" },
    { key: "no-owner", label: "Без ответственного" },
    { key: "no-readiness", label: "Без готовности" },
    { key: "no-grant", label: "Без гранта" },
    { key: "no-deadline", label: "Без срока" },
    { key: "deadline-14", label: "Дедлайн 14 дней" },
    { key: "nts", label: "На НТС" },
  ];

  let activeFilter = "all";

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase().replaceAll("ё", "е");
  }

  function getProjectRows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function safeCss(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replaceAll('"', '\\"');
  }

  function getDetailRow(uid) {
    if (!uid) return null;
    return document.querySelector(`[data-detail="${safeCss(uid)}"]`);
  }

  function rowText(row) {
    const detail = getDetailRow(row.dataset.project);
    return normalizeText(`${row.textContent || ""} ${detail?.textContent || ""}`);
  }

  function rowHasDeadlineWithin14(row) {
    const text = rowText(row);
    const match = text.match(/дедлайн через\s*(\d+)\s*дн/);
    if (!match) return false;
    const days = Number(match[1]);
    return Number.isFinite(days) && days >= 0 && days <= 14;
  }

  function rowMatches(row, key) {
    const text = rowText(row);
    if (key === "all") return true;
    if (key === "risk") return !text.includes("рисков нет");
    if (key === "no-owner") return text.includes("не указан") || text.includes("ответственный не указан");
    if (key === "no-readiness") return text.includes("расчет") || text.includes("нет процента готовности");
    if (key === "no-grant") return text.includes("не выбран") || text.includes("маршрут не выбран") || text.includes("нет грантового маршрута");
    if (key === "no-deadline") return text.includes("нет срока");
    if (key === "deadline-14") return rowHasDeadlineWithin14(row);
    if (key === "nts") return text.includes("нтс");
    return true;
  }

  function ensureToolbar() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || document.querySelector("#quickFilters")) return;
    const quickFilters = document.createElement("section");
    quickFilters.className = "quick-filters";
    quickFilters.id = "quickFilters";
    quickFilters.setAttribute("aria-label", "Быстрые фильтры");
    quickFilters.innerHTML = `<strong>Быстро:</strong>${FILTERS.map((item) => `<button class="quick-filter-button ${item.key === "all" ? "is-active" : ""}" type="button" data-fast-filter="${item.key}">${item.label}</button>`).join("")}`;
    toolbar.insertAdjacentElement("afterend", quickFilters);
  }

  function ensureProjectTools() {
    const tableCard = document.querySelector(".projects-table-card");
    if (!tableCard || document.querySelector("#projectTools")) return;
    const tools = document.createElement("div");
    tools.className = "project-tools";
    tools.id = "projectTools";
    tools.innerHTML = `
      <div class="project-counter" id="projectCounter">Проекты: загрузка...</div>
      <div class="project-tool-actions">
        <button class="small-tool-button" type="button" id="expandAllProjects">Раскрыть все</button>
        <button class="small-tool-button" type="button" id="collapseAllProjects">Свернуть все</button>
        <button class="small-tool-button" type="button" id="resetFilters">Сбросить фильтры</button>
      </div>
    `;
    tableCard.insertAdjacentElement("beforebegin", tools);
  }

  function ensurePrintButton() {
    const ntsTitle = document.querySelector("#nts .section-title");
    if (!ntsTitle || document.querySelector("#printNtsAgenda")) return;
    ntsTitle.classList.add("with-actions");
    const actions = document.createElement("div");
    actions.className = "section-actions";
    actions.innerHTML = `<button class="button ghost" id="printNtsAgenda" type="button">Печать повестки</button>`;
    ntsTitle.appendChild(actions);
    const note = document.createElement("p");
    note.className = "print-only-note";
    note.textContent = "Печатная версия сформирована из текущих данных панели Технопарка РГСУ.";
    document.querySelector("#nts")?.insertAdjacentElement("afterbegin", note);
  }

  function updateActiveButton(key) {
    activeFilter = key;
    document.querySelectorAll("[data-fast-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.fastFilter === key);
    });
  }

  function applyDomFilter(key = activeFilter) {
    updateActiveButton(key);
    getProjectRows().forEach((row) => {
      const uid = row.dataset.project;
      const detail = getDetailRow(uid);
      const visible = rowMatches(row, key);
      row.style.display = visible ? "" : "none";
      if (detail) detail.style.display = visible && detail.classList.contains("is-open") ? "table-row" : "none";
    });
    updateCounter();
  }

  function clearNativeFilters() {
    const searchInput = document.querySelector("#searchInput");
    const statusFilter = document.querySelector("#statusFilter");
    const ownerFilter = document.querySelector("#ownerFilter");
    const readinessFilter = document.querySelector("#readinessFilter");
    const riskFilter = document.querySelector("#riskFilter");
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (ownerFilter) ownerFilter.value = "all";
    if (readinessFilter) readinessFilter.value = "all";
    if (riskFilter) riskFilter.value = "all";
    searchInput?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyQuickFilter(key) {
    clearNativeFilters();
    setTimeout(() => applyDomFilter(key), 280);
  }

  function updateCounter() {
    const counter = document.querySelector("#projectCounter");
    if (!counter) return;
    const rows = getProjectRows();
    const visible = rows.filter((row) => row.style.display !== "none").length;
    counter.textContent = `Показано проектов: ${visible} из ${rows.length}`;
  }

  function setAllDetails(open) {
    document.querySelectorAll("#projectTable .project-detail-row").forEach((detail) => {
      const uid = detail.dataset.detail;
      const mainRow = document.querySelector(`[data-project="${safeCss(uid)}"]`);
      const rowVisible = !mainRow || mainRow.style.display !== "none";
      detail.classList.toggle("is-open", open);
      detail.style.display = open && rowVisible ? "table-row" : "none";
    });
    document.querySelectorAll("#projectTable .row-toggle").forEach((button) => {
      button.textContent = open ? "−" : "+";
    });
  }

  function resetFilters() {
    updateActiveButton("all");
    clearNativeFilters();
    setTimeout(() => {
      getProjectRows().forEach((row) => { row.style.display = ""; });
      document.querySelectorAll("#projectTable .project-detail-row").forEach((detail) => {
        detail.style.display = detail.classList.contains("is-open") ? "table-row" : "none";
      });
      updateCounter();
    }, 280);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      const fast = event.target.closest("[data-fast-filter]");
      if (fast) applyQuickFilter(fast.dataset.fastFilter);
      if (event.target.closest("#expandAllProjects")) setAllDetails(true);
      if (event.target.closest("#collapseAllProjects")) setAllDetails(false);
      if (event.target.closest("#resetFilters")) resetFilters();
      if (event.target.closest("#printNtsAgenda")) window.print();
    });
    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          updateActiveButton("all");
          setTimeout(updateCounter, 280);
        }
      });
    });
    document.querySelector("#projectTable")?.addEventListener("click", () => setTimeout(updateCounter, 80));
  }

  function watchProjectTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__dashboardToolsObserver) return;
    window.__dashboardToolsObserver = new MutationObserver(() => {
      setTimeout(() => applyDomFilter(activeFilter), 100);
    });
    window.__dashboardToolsObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureToolbar();
    ensureProjectTools();
    ensurePrintButton();
    attachEvents();
    watchProjectTable();
    setTimeout(() => applyDomFilter("all"), 1300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
