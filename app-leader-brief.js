/*
  Сводка для руководителя.
  Формирует короткий управленческий дайджест по текущему состоянию панели:
  проекты, решения, риски, план на 7 дней и готовность к НТС.
  Google Sheets не изменяет.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function numberFrom(selector) {
    const text = cleanText(document.querySelector(selector)?.textContent || "0");
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function rows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function getTopText(selector, limit = 3) {
    return Array.from(document.querySelectorAll(selector))
      .map((node) => cleanText(node.textContent))
      .filter(Boolean)
      .slice(0, limit);
  }

  function ensureBrief() {
    const overview = document.querySelector("#overview");
    if (!overview || document.querySelector("#leaderBrief")) return;

    const section = document.createElement("section");
    section.className = "leader-brief";
    section.id = "leaderBrief";
    section.innerHTML = `
      <div class="leader-brief-head">
        <div>
          <p class="eyebrow">Короткая сводка</p>
          <h2>Сводка для руководителя</h2>
        </div>
        <button type="button" id="copyLeaderBrief">Копировать сводку</button>
      </div>
      <div class="leader-brief-grid" id="leaderBriefGrid"></div>
    `;

    overview.insertAdjacentElement("afterend", section);
  }

  function collectBrief() {
    const total = numberFrom("#kpiTotal") || rows().length;
    const active = numberFrom("#kpiActive");
    const ready = numberFrom("#kpiReady");
    const risks = numberFrom("#kpiRisks");
    const ntsReady = numberFrom("#ntsReadinessValue");
    const decisions = numberFrom("#leaderDecisionsCount");
    const weekTasks = numberFrom("#weekPlanCount");

    const criticalRisk = getTopText(".risk-zone.critical .risk-zone-list button span", 3);
    const leaderDecisions = getTopText(".leader-decision h3", 3);
    const weekPlan = getTopText(".week-task h3", 3);

    let mainConclusion = "Данные еще загружаются. После синхронизации появится управленческая оценка.";
    if (total > 0) {
      if (risks > 0 || decisions > 0) {
        mainConclusion = `В портфеле ${total} проектов. Требуют внимания: ${risks}. Решений руководителя: ${decisions}.`;
      } else {
        mainConclusion = `В портфеле ${total} проектов. Критических управленческих решений по текущим данным нет.`;
      }
    }

    let firstAction = "Дождаться загрузки данных и проверить публикацию панели.";
    if (criticalRisk.length) firstAction = `Сначала разобрать критическую зону: ${criticalRisk[0]}.`;
    else if (leaderDecisions.length) firstAction = `Сначала принять решение по проекту: ${leaderDecisions[0]}.`;
    else if (weekPlan.length) firstAction = `Сначала выполнить задачу плана: ${weekPlan[0]}.`;

    return {
      total,
      active,
      ready,
      risks,
      ntsReady,
      decisions,
      weekTasks,
      criticalRisk,
      leaderDecisions,
      weekPlan,
      mainConclusion,
      firstAction,
    };
  }

  function renderBrief() {
    const grid = document.querySelector("#leaderBriefGrid");
    if (!grid) return;

    const brief = collectBrief();
    grid.innerHTML = `
      <article class="brief-main">
        <strong>${brief.mainConclusion}</strong>
        <p>${brief.firstAction}</p>
      </article>
      <article><span>Готовность к НТС</span><strong>${brief.ntsReady}%</strong><small>${brief.ntsReady >= 85 ? "можно показывать" : brief.ntsReady >= 65 ? "нужна доработка" : "есть пробелы"}</small></article>
      <article><span>Решения</span><strong>${brief.decisions}</strong><small>для руководителя</small></article>
      <article><span>План 7 дней</span><strong>${brief.weekTasks}</strong><small>задач</small></article>
      <article><span>Готовы к грантам</span><strong>${brief.ready}</strong><small>из ${brief.total || 0}</small></article>
      <article class="brief-list">
        <span>Критические риски</span>
        ${brief.criticalRisk.length ? brief.criticalRisk.map((item) => `<small>${item}</small>`).join("") : "<small>Нет явных критических рисков</small>"}
      </article>
    `;
  }

  function buildText() {
    const brief = collectBrief();
    return [
      "Сводка для руководителя - Технопарк РГСУ",
      `Дата: ${new Date().toLocaleString("ru-RU")}`,
      "",
      brief.mainConclusion,
      brief.firstAction,
      "",
      `Проектов всего: ${brief.total}`,
      `Активных: ${brief.active}`,
      `Готовы к грантам: ${brief.ready}`,
      `Требуют внимания: ${brief.risks}`,
      `Решения руководителя: ${brief.decisions}`,
      `Задачи на 7 дней: ${brief.weekTasks}`,
      `Готовность к НТС: ${brief.ntsReady}%`,
      "",
      "Критические риски:",
      ...(brief.criticalRisk.length ? brief.criticalRisk.map((item, index) => `${index + 1}. ${item}`) : ["нет явных критических рисков"]),
    ].join("\n");
  }

  async function copyBrief() {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Сводка для руководителя скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Сводка для руководителя скопирована");
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
      if (event.target.closest("#copyLeaderBrief")) copyBrief();
      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData")) setTimeout(renderBrief, 600);
    });

    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(renderBrief, 420);
        }
      });
    });
  }

  function observeMain() {
    const main = document.querySelector("main");
    if (!main || window.__leaderBriefObserver) return;
    window.__leaderBriefObserver = new MutationObserver(() => setTimeout(renderBrief, 220));
    window.__leaderBriefObserver.observe(main, { childList: true, subtree: true });
  }

  function init() {
    ensureBrief();
    attachEvents();
    observeMain();
    setTimeout(renderBrief, 2200);
    setTimeout(renderBrief, 4800);
    setTimeout(renderBrief, 7600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
