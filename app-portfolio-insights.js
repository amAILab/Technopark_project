/*
  Инсайты проектного портфеля: дедлайны, активный фильтр и подсветка поиска.
  Работает поверх DOM, не изменяет Google Sheets.
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

  function getVisibleRows() {
    return getRows().filter((row) => row.style.display !== "none");
  }

  function rowText(row) {
    return normalizeText(row.textContent || "");
  }

  function riskText(row) {
    return normalizeText(row.children[7]?.textContent || "");
  }

  function ensureDeadlineInsights() {
    const pulse = document.querySelector("#portfolioPulse");
    if (!pulse || document.querySelector("#deadlineInsights")) return;
    const panel = document.createElement("section");
    panel.className = "deadline-insights";
    panel.id = "deadlineInsights";
    panel.innerHTML = `
      <article><span>Просрочено</span><strong id="insightOverdue">0</strong><small>срок уже прошел</small></article>
      <article><span>14 дней</span><strong id="insight14">0</strong><small>срочная зона</small></article>
      <article><span>Без срока</span><strong id="insightNoDeadline">0</strong><small>нужно дозаполнить</small></article>
      <article><span>Без ответственного</span><strong id="insightNoOwner">0</strong><small>нужно назначить</small></article>
    `;
    pulse.insertAdjacentElement("afterend", panel);
  }

  function ensureActiveFilterPanel() {
    const tools = document.querySelector("#projectTools");
    if (!tools || document.querySelector("#activeFilterPanel")) return;
    const panel = document.createElement("div");
    panel.className = "active-filter-panel";
    panel.id = "activeFilterPanel";
    panel.innerHTML = `<span>Фильтр: все проекты</span>`;
    tools.insertAdjacentElement("afterend", panel);
  }

  function setNumber(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function updateDeadlineInsights() {
    const rows = getRows();
    const overdue = rows.filter((row) => riskText(row).includes("срок прошел")).length;
    const urgent14 = rows.filter((row) => /дедлайн через\s*\d+\s*дн/.test(riskText(row))).length;
    const noDeadline = rows.filter((row) => rowText(row).includes("нет срока")).length;
    const noOwner = rows.filter((row) => rowText(row).includes("ответственный не указан") || rowText(row).includes(" не указан ")).length;
    setNumber("#insightOverdue", overdue);
    setNumber("#insight14", urgent14);
    setNumber("#insightNoDeadline", noDeadline);
    setNumber("#insightNoOwner", noOwner);
  }

  function activeFastFilterLabel() {
    const active = document.querySelector("[data-fast-filter].is-active");
    return cleanText(active?.textContent || "Все проекты");
  }

  function updateActiveFilterPanel() {
    const panel = document.querySelector("#activeFilterPanel span");
    if (!panel) return;
    const search = cleanText(document.querySelector("#searchInput")?.value || "");
    const status = cleanText(document.querySelector("#statusFilter")?.selectedOptions?.[0]?.textContent || "Все статусы");
    const owner = cleanText(document.querySelector("#ownerFilter")?.selectedOptions?.[0]?.textContent || "Все ответственные");
    const readiness = cleanText(document.querySelector("#readinessFilter")?.selectedOptions?.[0]?.textContent || "Любая");
    const risk = cleanText(document.querySelector("#riskFilter")?.selectedOptions?.[0]?.textContent || "Все");
    const visible = getVisibleRows().length;
    const total = getRows().length;
    const parts = [`быстрый: ${activeFastFilterLabel()}`];
    if (search) parts.push(`поиск: ${search}`);
    if (status !== "Все статусы") parts.push(`статус: ${status}`);
    if (owner !== "Все ответственные") parts.push(`ответственный: ${owner}`);
    if (readiness !== "Любая") parts.push(`готовность: ${readiness}`);
    if (risk !== "Все") parts.push(`риски: ${risk}`);
    panel.textContent = `Фильтр: ${parts.join(" · ")} · показано ${visible} из ${total}`;
  }

  function clearMarks(root) {
    root.querySelectorAll("mark.search-hit").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    });
    root.normalize();
  }

  function highlightTextNode(node, query) {
    const text = node.nodeValue || "";
    const normalized = normalizeText(text);
    const index = normalized.indexOf(normalizeText(query));
    if (index < 0) return;
    const before = document.createTextNode(text.slice(0, index));
    const mark = document.createElement("mark");
    mark.className = "search-hit";
    mark.textContent = text.slice(index, index + query.length);
    const after = document.createTextNode(text.slice(index + query.length));
    node.replaceWith(before, mark, after);
  }

  function walkAndHighlight(root, query) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, mark, button, input, select, textarea")) return NodeFilter.FILTER_REJECT;
        return normalizeText(node.nodeValue).includes(normalizeText(query)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => highlightTextNode(node, query));
  }

  function updateSearchHighlight() {
    const table = document.querySelector("#projectTable");
    if (!table) return;
    clearMarks(table);
    const query = cleanText(document.querySelector("#searchInput")?.value || "");
    if (query.length < 2) return;
    getVisibleRows().forEach((row) => {
      walkAndHighlight(row, query);
      const detail = document.querySelector(`[data-detail="${window.CSS && CSS.escape ? CSS.escape(row.dataset.project) : row.dataset.project}"]`);
      if (detail && detail.style.display !== "none") walkAndHighlight(detail, query);
    });
  }

  function updateAll() {
    updateDeadlineInsights();
    updateActiveFilterPanel();
    updateSearchHighlight();
  }

  function attachEvents() {
    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(updateAll, 320);
        }
      });
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fast-filter], #resetFilters, #expandAllProjects, #collapseAllProjects, .project-row")) {
        setTimeout(updateAll, 340);
      }
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__portfolioInsightsObserver) return;
    window.__portfolioInsightsObserver = new MutationObserver(() => setTimeout(updateAll, 180));
    window.__portfolioInsightsObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureDeadlineInsights();
    ensureActiveFilterPanel();
    attachEvents();
    observeTable();
    setTimeout(updateAll, 1600);
    setTimeout(updateAll, 3600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
