/*
  Мобильный режим проектов.
  На узких экранах дублирует таблицу проектов в виде компактных карточек.
  Google Sheets и структуру основной таблицы не меняет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function rows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function cell(row, index) {
    return cleanText(row.children[index]?.textContent || "");
  }

  function projectName(row) {
    return cleanText(row.children[1]?.querySelector("strong")?.textContent || row.children[1]?.textContent || "Проект без названия");
  }

  function projectSubtitle(row) {
    return cleanText(row.children[1]?.querySelector("small")?.textContent || cell(row, 3) || "статус не указан");
  }

  function readinessValue(row) {
    const text = cell(row, 6).replace(",", ".");
    const match = text.match(/\d+(\.\d+)?/);
    return match ? Math.max(0, Math.min(100, Math.round(Number(match[0])))) : null;
  }

  function readinessClass(value) {
    if (value === null) return "unknown";
    if (value < 40) return "low";
    if (value < 70) return "middle";
    if (value < 90) return "ready";
    return "submit";
  }

  function riskClass(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("срок прошел") || value.includes("дедлайн") || value.includes("нтс")) return "danger";
    if (value.includes("не указан") || value.includes("не выбран") || value.includes("нет")) return "warn";
    return "ok";
  }

  function ensureMobileSection() {
    const tableCard = document.querySelector(".projects-table-card");
    if (!tableCard || document.querySelector("#mobileProjects")) return;

    const section = document.createElement("div");
    section.className = "mobile-projects";
    section.id = "mobileProjects";
    section.innerHTML = `
      <div class="mobile-projects-head">
        <strong>Проекты</strong>
        <span id="mobileProjectsCount">0</span>
      </div>
      <div class="mobile-projects-list" id="mobileProjectsList"></div>
    `;

    tableCard.insertAdjacentElement("afterend", section);
  }

  function rowIsFilteredOut(row) {
    if (!row || row.hidden || row.getAttribute("aria-hidden") === "true") return true;
    if (row.classList.contains("is-hidden") || row.classList.contains("filtered-out")) return true;
    const inlineDisplay = row.style?.display;
    return inlineDisplay === "none";
  }

  function renderCards() {
    ensureMobileSection();
    const list = document.querySelector("#mobileProjectsList");
    const count = document.querySelector("#mobileProjectsCount");
    if (!list) return;

    /*
      Важно: на мобильной версии сама таблица может быть скрыта через CSS.
      Из-за этого offsetParent у строк становится null, хотя строки уже загружены.
      Поэтому нельзя фильтровать строки по offsetParent: берем строки из DOM,
      исключая только явно скрытые фильтрами строки.
    */
    const visibleRows = rows().filter((row) => !rowIsFilteredOut(row));
    if (count) count.textContent = `${visibleRows.length} карточек`;

    if (!visibleRows.length) {
      list.innerHTML = `
        <div class="official-empty-state">
          <strong>Проекты не найдены</strong>
          <span>Измените фильтры или обновите данные из Google Sheets.</span>
        </div>
      `;
      return;
    }

    list.innerHTML = visibleRows.map((row, index) => {
      const ready = readinessValue(row);
      const readyClass = readinessClass(ready);
      const risk = cell(row, 7) || "рисков нет";
      const uid = row.dataset.project || String(index);
      return `
        <article class="mobile-project-card ${readyClass}" data-mobile-project="${uid}">
          <header>
            <div>
              <h3>${projectName(row)}</h3>
              <small>${projectSubtitle(row)}</small>
            </div>
            <strong>${ready === null ? "—" : `${ready}%`}</strong>
          </header>
          <div class="mobile-project-meta">
            <span><b>Ответственный</b>${cell(row, 2) || "не указан"}</span>
            <span><b>Грант</b>${cell(row, 4) || "не выбран"}</span>
            <span><b>Срок</b>${cell(row, 5) || "нет срока"}</span>
            <span class="${riskClass(risk)}"><b>Риск</b>${risk}</span>
          </div>
          <button type="button" data-open-project="${uid}">Открыть паспорт</button>
        </article>
      `;
    }).join("");
  }

  function openProject(uid) {
    const row = document.querySelector(`#projectTable .project-row[data-project="${CSS.escape(uid)}"]`);
    if (!row) return;
    const detail = document.querySelector(`[data-detail="${CSS.escape(uid)}"]`);
    if (detail && !detail.classList.contains("is-open")) {
      row.click();
    }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("mobile-highlight");
    setTimeout(() => row.classList.remove("mobile-highlight"), 1400);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-project]");
      if (button) openProject(button.dataset.openProject);
      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData, #refreshSheet, #refresh")) setTimeout(renderCards, 540);
    });

    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter", "topSearchInput"].includes(event.target.id)) {
          setTimeout(renderCards, 330);
        }
      });
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__mobileProjectsObserver) return;
    window.__mobileProjectsObserver = new MutationObserver(() => setTimeout(renderCards, 220));
    window.__mobileProjectsObserver.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden", "class", "aria-hidden"] });
  }

  function init() {
    ensureMobileSection();
    attachEvents();
    observeTable();
    setTimeout(renderCards, 800);
    setTimeout(renderCards, 1800);
    setTimeout(renderCards, 4300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
