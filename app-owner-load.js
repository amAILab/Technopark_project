/*
  Нагрузка по ответственным.
  Считает проекты, риски и отсутствие грантового маршрута по каждой ответственной группе.
  Работает по DOM-таблице, Google Sheets не изменяет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanText(value).toLowerCase().replaceAll("ё", "е");
  }

  function getRows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function getOwner(row) {
    return cleanText(row.children[2]?.textContent || "не указан") || "не указан";
  }

  function hasRisk(row) {
    const text = normalizeText(row.children[7]?.textContent || "");
    return text && !text.includes("рисков нет");
  }

  function hasNoGrant(row) {
    const text = normalizeText(row.children[4]?.textContent || "");
    return text.includes("не выбран") || text.includes("нет") || !text;
  }

  function readiness(row) {
    const text = cleanText(row.children[6]?.textContent || "").replace(",", ".");
    const match = text.match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function ensureOwnerSection() {
    const quality = document.querySelector("#quality");
    if (!quality || document.querySelector("#ownerLoad")) return;
    const section = document.createElement("section");
    section.className = "section owner-load-section";
    section.id = "ownerLoad";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Команда</p>
          <h2>Нагрузка по ответственным</h2>
        </div>
        <p>Показывает распределение проектов, рисков и грантовых пробелов по ответственным.</p>
      </div>
      <div class="owner-load-board" id="ownerLoadBoard"></div>
    `;
    quality.insertAdjacentElement("afterend", section);
  }

  function collectOwnerStats() {
    const map = new Map();
    getRows().forEach((row) => {
      const owner = getOwner(row);
      if (!map.has(owner)) {
        map.set(owner, { owner, total: 0, risks: 0, noGrant: 0, readinessSum: 0 });
      }
      const item = map.get(owner);
      item.total += 1;
      item.risks += hasRisk(row) ? 1 : 0;
      item.noGrant += hasNoGrant(row) ? 1 : 0;
      item.readinessSum += readiness(row);
    });
    return Array.from(map.values())
      .map((item) => ({ ...item, avgReadiness: item.total ? Math.round(item.readinessSum / item.total) : 0 }))
      .sort((a, b) => b.risks - a.risks || b.total - a.total || a.owner.localeCompare(b.owner, "ru"));
  }

  function renderOwnerLoad() {
    const board = document.querySelector("#ownerLoadBoard");
    if (!board) return;
    const items = collectOwnerStats();
    if (!items.length) {
      board.innerHTML = `<div class="empty-state"><strong>Данные еще не загружены</strong><span>После загрузки проектов появится распределение по ответственным.</span></div>`;
      return;
    }
    board.innerHTML = `
      <div class="owner-load-head">
        <span>Ответственный</span><span>Проекты</span><span>Риски</span><span>Без гранта</span><span>Средняя готовность</span>
      </div>
      ${items.map((item) => `
        <article class="owner-load-row ${item.risks ? "has-risk" : ""}">
          <strong>${item.owner}</strong>
          <span>${item.total}</span>
          <span>${item.risks}</span>
          <span>${item.noGrant}</span>
          <span><b class="owner-readiness"><i style="width:${item.avgReadiness}%"></i></b>${item.avgReadiness}%</span>
        </article>
      `).join("")}
    `;
  }

  function attachEvents() {
    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(renderOwnerLoad, 260);
        }
      });
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData")) {
        setTimeout(renderOwnerLoad, 500);
      }
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__ownerLoadObserver) return;
    window.__ownerLoadObserver = new MutationObserver(() => setTimeout(renderOwnerLoad, 180));
    window.__ownerLoadObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureOwnerSection();
    attachEvents();
    observeTable();
    setTimeout(renderOwnerLoad, 1800);
    setTimeout(renderOwnerLoad, 4200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
