/*
  Матрица рисков портфеля.
  Группирует проекты по управленческим зонам: срочно решить, доупаковать,
  готовить к гранту, держать на контроле. Google Sheets не изменяет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanText(value).toLowerCase().replaceAll("ё", "е");
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

  function readinessValue(row) {
    const text = cell(row, 6).replace(",", ".");
    const match = text.match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function hasCriticalRisk(row) {
    const text = normalizeText(`${cell(row, 7)} ${row.textContent || ""}`);
    return text.includes("срок прошел") || text.includes("дедлайн через") || text.includes("нтс");
  }

  function hasDataRisk(row) {
    const text = normalizeText(row.textContent || "");
    return text.includes("не указан") || text.includes("не выбран") || text.includes("нет срока") || text.includes("нет данных");
  }

  function zoneFor(row) {
    const ready = readinessValue(row);
    if (hasCriticalRisk(row)) return "critical";
    if (hasDataRisk(row) || ready === null || ready < 70) return "package";
    if (ready >= 70 && ready < 90) return "grant";
    return "control";
  }

  function collectZones() {
    const zones = {
      critical: { title: "Срочно решить", hint: "сроки, НТС, критические риски", items: [] },
      package: { title: "Доупаковать", hint: "нехватка данных, сроков, ответственных или готовности", items: [] },
      grant: { title: "Готовить к гранту", hint: "готовность 70-89%, нужен маршрут подачи", items: [] },
      control: { title: "На контроле", hint: "высокая готовность, без явных критических рисков", items: [] },
    };

    rows().forEach((row) => {
      const zone = zoneFor(row);
      zones[zone].items.push({
        name: projectName(row),
        owner: cell(row, 2) || "не указан",
        readiness: readinessValue(row),
        risk: cell(row, 7) || "рисков нет",
      });
    });

    Object.values(zones).forEach((zone) => {
      zone.items.sort((a, b) => (a.readiness || 0) - (b.readiness || 0) || a.name.localeCompare(b.name, "ru"));
    });

    return zones;
  }

  function ensureSection() {
    const weekPlan = document.querySelector("#weekPlan");
    const leader = document.querySelector("#leaderDecisions");
    const actions = document.querySelector("#actions");
    const anchor = weekPlan || leader || actions;
    if (!anchor || document.querySelector("#riskMatrix")) return;

    const section = document.createElement("section");
    section.className = "section risk-matrix-section";
    section.id = "riskMatrix";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Портфель</p>
          <h2>Матрица рисков</h2>
        </div>
        <p>Быстро показывает, какие проекты требуют срочного решения, доупаковки или подготовки к гранту.</p>
      </div>
      <div class="risk-matrix-toolbar">
        <button type="button" id="copyRiskMatrix">Копировать матрицу</button>
        <span id="riskMatrixCount">0 проектов</span>
      </div>
      <div class="risk-matrix-board" id="riskMatrixBoard"></div>
    `;

    anchor.insertAdjacentElement("afterend", section);
  }

  function render() {
    const board = document.querySelector("#riskMatrixBoard");
    const count = document.querySelector("#riskMatrixCount");
    if (!board) return;

    const zones = collectZones();
    const total = Object.values(zones).reduce((sum, zone) => sum + zone.items.length, 0);
    if (count) count.textContent = `${total} проектов`;

    if (!total) {
      board.innerHTML = `<div class="empty-state"><strong>Проекты еще не загружены</strong><span>После загрузки таблицы появится матрица рисков.</span></div>`;
      return;
    }

    board.innerHTML = Object.entries(zones).map(([key, zone]) => `
      <article class="risk-zone ${key}">
        <header><div><strong>${zone.title}</strong><small>${zone.hint}</small></div><b>${zone.items.length}</b></header>
        <div class="risk-zone-list">
          ${zone.items.slice(0, 8).map((item) => `
            <button type="button" data-risk-project="${item.name}">
              <span>${item.name}</span>
              <small>${item.readiness === null ? "нет данных" : `${item.readiness}%`} · ${item.owner}</small>
            </button>
          `).join("")}
          ${zone.items.length > 8 ? `<em>Еще ${zone.items.length - 8} проектов</em>` : ""}
        </div>
      </article>
    `).join("");
  }

  function buildText() {
    const zones = collectZones();
    return [
      "Матрица рисков портфеля - Технопарк РГСУ",
      `Дата формирования: ${new Date().toLocaleString("ru-RU")}`,
      "",
      ...Object.values(zones).flatMap((zone) => [
        `${zone.title} (${zone.items.length})`,
        ...(zone.items.length ? zone.items.map((item, index) => `  ${index + 1}. ${item.name} - ${item.readiness === null ? "нет данных" : `${item.readiness}%`} - ${item.owner}`) : ["  нет проектов"]),
        "",
      ]),
    ].join("\n");
  }

  async function copyMatrix() {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Матрица рисков скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Матрица рисков скопирована");
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
      if (event.target.closest("#copyRiskMatrix")) copyMatrix();
      const projectButton = event.target.closest("[data-risk-project]");
      if (projectButton) {
        const search = document.querySelector("#searchInput");
        if (search) {
          search.value = projectButton.dataset.riskProject;
          search.dispatchEvent(new Event("input", { bubbles: true }));
          document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData")) setTimeout(render, 520);
    });

    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(render, 320);
        }
      });
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__riskMatrixObserver) return;
    window.__riskMatrixObserver = new MutationObserver(() => setTimeout(render, 220));
    window.__riskMatrixObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureSection();
    attachEvents();
    observeTable();
    setTimeout(render, 1900);
    setTimeout(render, 4300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
