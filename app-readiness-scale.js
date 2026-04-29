/*
  Цветовая шкала готовности проектов.
  Добавляет понятную управленческую интерпретацию процентов готовности
  и визуально маркирует строки таблицы. Google Sheets не изменяет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getRows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function readinessValue(row) {
    const text = cleanText(row.children[6]?.textContent || "").replace(",", ".");
    const match = text.match(/\d+(\.\d+)?/);
    return match ? Math.max(0, Math.min(100, Math.round(Number(match[0])))) : null;
  }

  function readinessLevel(value) {
    if (value === null) return { key: "unknown", label: "нет данных" };
    if (value < 40) return { key: "low", label: "ранняя стадия" };
    if (value < 70) return { key: "middle", label: "нужна доупаковка" };
    if (value < 90) return { key: "ready", label: "готов к гранту" };
    return { key: "submit", label: "можно подавать" };
  }

  function ensureLegend() {
    const legend = document.querySelector("#statusLegend");
    if (!legend || document.querySelector("#readinessScaleLegend")) return;

    const scale = document.createElement("div");
    scale.className = "readiness-scale-legend";
    scale.id = "readinessScaleLegend";
    scale.innerHTML = `
      <strong>Готовность:</strong>
      <span><b class="readiness-dot low"></b>0-39% ранняя стадия</span>
      <span><b class="readiness-dot middle"></b>40-69% доупаковка</span>
      <span><b class="readiness-dot ready"></b>70-89% готов к гранту</span>
      <span><b class="readiness-dot submit"></b>90-100% можно подавать</span>
    `;
    legend.insertAdjacentElement("afterend", scale);
  }

  function markRows() {
    getRows().forEach((row) => {
      const value = readinessValue(row);
      const level = readinessLevel(value);
      row.dataset.readinessLevel = level.key;

      const cell = row.children[6];
      if (!cell || cell.querySelector(".readiness-stage-label")) return;
      const label = document.createElement("small");
      label.className = `readiness-stage-label ${level.key}`;
      label.textContent = level.label;
      cell.appendChild(label);
    });
  }

  function updatePassportReadiness() {
    document.querySelectorAll(".project-passport").forEach((passport) => {
      const valueText = cleanText(passport.querySelector(".passport-readiness strong")?.textContent || "");
      const match = valueText.match(/\d+/);
      const value = match ? Number(match[0]) : null;
      const level = readinessLevel(value);
      passport.dataset.readinessLevel = level.key;
      const existing = passport.querySelector(".passport-readiness-level");
      if (existing) {
        existing.textContent = level.label;
        existing.className = `passport-readiness-level ${level.key}`;
        return;
      }
      const target = passport.querySelector(".passport-readiness");
      if (!target) return;
      const label = document.createElement("em");
      label.className = `passport-readiness-level ${level.key}`;
      label.textContent = level.label;
      target.appendChild(label);
    });
  }

  function updateAll() {
    ensureLegend();
    markRows();
    updatePassportReadiness();
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".project-row, #expandAllProjects, [data-fast-filter], #resetFilters")) {
        setTimeout(updateAll, 160);
      }
    });
    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(updateAll, 260);
        }
      });
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__readinessScaleObserver) return;
    window.__readinessScaleObserver = new MutationObserver(() => setTimeout(updateAll, 180));
    window.__readinessScaleObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    attachEvents();
    observeTable();
    setTimeout(updateAll, 1800);
    setTimeout(updateAll, 4200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
