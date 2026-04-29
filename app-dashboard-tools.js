/*
  Небольшая надстройка над app-compact.js.
  Добавляет быстрые управленческие фильтры, счетчик найденных проектов,
  раскрытие всех строк и печать повестки НТС без изменения Google Sheets.
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

  const toolState = {
    active: "all",
    ready: false,
  };

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase().replaceAll("ё", "е");
  }

  function daysUntilLocal(iso) {
    if (!iso) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(`${iso}T00:00:00`) - today) / 86400000);
  }

  function getProjectList() {
    return Array.isArray(window.state?.projects) ? window.state.projects : [];
  }

  function getFilteredProjectRows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
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

  function applyQuickFilter(key) {
    const projects = getProjectList();
    const searchInput = document.querySelector("#searchInput");
    const statusFilter = document.querySelector("#statusFilter");
    const ownerFilter = document.querySelector("#ownerFilter");
    const readinessFilter = document.querySelector("#readinessFilter");
    const riskFilter = document.querySelector("#riskFilter");

    toolState.active = key;
    document.querySelectorAll("[data-fast-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.fastFilter === key);
    });

    if (!searchInput || !statusFilter || !ownerFilter || !readinessFilter || !riskFilter) return;

    searchInput.value = "";
    statusFilter.value = "all";
    ownerFilter.value = "all";
    readinessFilter.value = "all";
    riskFilter.value = "all";

    if (key === "risk") riskFilter.value = "risk";
    if (key === "no-readiness") readinessFilter.value = "unknown";
    if (key === "no-owner") ownerFilter.value = "требует уточнения";
    if (key === "no-grant") searchInput.value = "не выбран";
    if (key === "no-deadline") searchInput.value = "нет срока";
    if (key === "nts") statusFilter.value = Array.from(statusFilter.options).find((option) => normalizeText(option.value).includes("нтс"))?.value || "all";

    // Для дедлайна 14 дней и части фильтров используем временную пометку в поиске,
    // а затем дополнительно скрываем строки после стандартного renderProjects.
    if (key === "deadline-14") searchInput.value = "";

    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    statusFilter.dispatchEvent(new Event("change", { bubbles: true }));
    ownerFilter.dispatchEvent(new Event("change", { bubbles: true }));
    readinessFilter.dispatchEvent(new Event("change", { bubbles: true }));
    riskFilter.dispatchEvent(new Event("change", { bubbles: true }));

    setTimeout(() => postFilterRows(projects), 240);
  }

  function postFilterRows(projects = getProjectList()) {
    const key = toolState.active;
    const rows = getFilteredProjectRows();
    rows.forEach((row) => {
      const uid = row.dataset.project;
      const project = projects.find((item) => item.uid === uid);
      const detail = document.querySelector(`[data-detail="${CSS.escape(uid)}"]`);
      let visible = true;
      if (project) {
        if (key === "no-grant") visible = !project.grant;
        if (key === "no-deadline") visible = !project.deadline;
        if (key === "deadline-14") {
          const days = daysUntilLocal(project.deadline);
          visible = Number.isFinite(days) && days >= 0 && days <= 14;
        }
      }
      row.style.display = visible ? "" : "none";
      if (detail) detail.style.display = visible && detail.classList.contains("is-open") ? "table-row" : "none";
    });
    updateCounter();
  }

  function updateCounter() {
    const counter = document.querySelector("#projectCounter");
    if (!counter) return;
    const rows = getFilteredProjectRows();
    const visible = rows.filter((row) => row.style.display !== "none").length;
    const total = getProjectList().length || rows.length;
    counter.textContent = `Показано проектов: ${visible} из ${total}`;
  }

  function setAllDetails(open) {
    document.querySelectorAll("#projectTable .project-detail-row").forEach((detail) => {
      const uid = detail.dataset.detail;
      const mainRow = document.querySelector(`[data-project="${CSS.escape(uid)}"]`);
      const rowVisible = !mainRow || mainRow.style.display !== "none";
      detail.classList.toggle("is-open", open);
      detail.style.display = open && rowVisible ? "table-row" : "none";
    });
    document.querySelectorAll("#projectTable .row-toggle").forEach((button) => {
      button.textContent = open ? "−" : "+";
    });
  }

  function resetFilters() {
    toolState.active = "all";
    document.querySelectorAll("[data-fast-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.fastFilter === "all");
    });
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
    setTimeout(() => {
      getFilteredProjectRows().forEach((row) => row.style.display = "");
      document.querySelectorAll("#projectTable .project-detail-row").forEach((detail) => {
        detail.style.display = detail.classList.contains("is-open") ? "table-row" : "none";
      });
      updateCounter();
    }, 240);
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
          if (!event.target.closest(".quick-filters")) toolState.active = toolState.active === "deadline-14" ? "all" : toolState.active;
          setTimeout(() => postFilterRows(), 260);
        }
      });
    });

    const table = document.querySelector("#projectTable");
    table?.addEventListener("click", () => setTimeout(updateCounter, 60));
  }

  function patchRenderProjects() {
    if (typeof window.renderProjects !== "function" || window.renderProjects.__patchedByTools) return;
    const original = window.renderProjects;
    window.renderProjects = function patchedRenderProjects(...args) {
      const result = original.apply(this, args);
      setTimeout(() => postFilterRows(), 0);
      return result;
    };
    window.renderProjects.__patchedByTools = true;
  }

  function init() {
    ensureToolbar();
    ensureProjectTools();
    ensurePrintButton();
    attachEvents();
    patchRenderProjects();
    setTimeout(() => {
      postFilterRows();
      updateCounter();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
