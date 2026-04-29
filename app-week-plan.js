/*
  План на 7 дней.
  Автоматически формирует ближайшие управленческие задачи по проектам:
  сроки, ответственные, гранты, готовность и вопросы на НТС.
  Google Sheets не изменяет.
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

  function projectName(row) {
    return cleanText(row.children[1]?.querySelector("strong")?.textContent || row.children[1]?.textContent || "Проект без названия");
  }

  function cell(row, index) {
    return cleanText(row.children[index]?.textContent || "");
  }

  function risk(row) {
    return normalizeText(cell(row, 7));
  }

  function ownerMissing(row) {
    const owner = normalizeText(cell(row, 2));
    return !owner || owner.includes("не указан") || owner.includes("требует уточнения");
  }

  function grantMissing(row) {
    const grant = normalizeText(cell(row, 4));
    return !grant || grant.includes("не выбран") || grant.includes("нет");
  }

  function deadlineMissing(row) {
    const deadline = normalizeText(cell(row, 5));
    return !deadline || deadline.includes("нет срока");
  }

  function readinessNeedsCheck(row) {
    const readiness = normalizeText(cell(row, 6));
    return readiness.includes("расчет") || readiness.includes("нет данных") || readiness.includes("нет");
  }

  function deadlineDays(row) {
    const match = risk(row).match(/дедлайн через\s*(\d+)\s*дн/);
    return match ? Number(match[1]) : null;
  }

  function makeTask(row, type, action, priority, day) {
    return {
      project: projectName(row),
      owner: cell(row, 2) || "не указан",
      type,
      action,
      priority,
      day,
    };
  }

  function collectTasks() {
    const tasks = [];

    rows().forEach((row) => {
      const r = risk(row);
      const days = deadlineDays(row);
      const allText = normalizeText(row.textContent || "");

      if (r.includes("срок прошел")) {
        tasks.push(makeTask(row, "Просрочка", "Сегодня принять решение: ускорить, перенести срок или снять с ближайшей подачи.", "critical", "сегодня"));
      }

      if (days !== null && days <= 7) {
        tasks.push(makeTask(row, "Дедлайн до 7 дней", `Проверить пакет проекта и подтвердить готовность к дедлайну через ${days} дн.`, "critical", "1-2 день"));
      } else if (days !== null && days <= 14) {
        tasks.push(makeTask(row, "Дедлайн до 14 дней", `Назначить контрольную точку по дедлайну через ${days} дн.`, "high", "3-4 день"));
      }

      if (ownerMissing(row)) {
        tasks.push(makeTask(row, "Ответственный", "Назначить владельца проекта и внести его в реестр.", "high", "1 день"));
      }

      if (grantMissing(row)) {
        tasks.push(makeTask(row, "Грант", "Выбрать грантовый маршрут или альтернативный источник финансирования.", "high", "2-3 день"));
      }

      if (deadlineMissing(row)) {
        tasks.push(makeTask(row, "Срок", "Установить ближайший управленческий срок: упаковка, НТС, подача или проверка.", "medium", "3-5 день"));
      }

      if (readinessNeedsCheck(row)) {
        tasks.push(makeTask(row, "Готовность", "Проверить фактическую готовность и заменить автоматический расчет ручной оценкой.", "medium", "5-7 день"));
      }

      if (allText.includes("нтс")) {
        tasks.push(makeTask(row, "НТС", "Сформулировать вопрос для НТС и подготовить краткую справку по проекту.", "critical", "до заседания"));
      }
    });

    const weight = { critical: 0, high: 1, medium: 2, low: 3 };
    const unique = new Map();
    tasks.forEach((task) => {
      const key = `${task.project}|${task.type}|${task.action}`;
      if (!unique.has(key)) unique.set(key, task);
    });

    return Array.from(unique.values())
      .sort((a, b) => weight[a.priority] - weight[b.priority] || a.project.localeCompare(b.project, "ru"))
      .slice(0, 30);
  }

  function ensureSection() {
    const leader = document.querySelector("#leaderDecisions");
    const actions = document.querySelector("#actions");
    if ((!leader && !actions) || document.querySelector("#weekPlan")) return;

    const section = document.createElement("section");
    section.className = "section week-plan-section";
    section.id = "weekPlan";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Ближайшие действия</p>
          <h2>План на 7 дней</h2>
        </div>
        <p>Автоматический список задач для подготовки проектов, грантов и заседания НТС.</p>
      </div>
      <div class="week-plan-toolbar">
        <button type="button" id="copyWeekPlan">Копировать план</button>
        <span id="weekPlanCount">0 задач</span>
      </div>
      <div class="week-plan-board" id="weekPlanBoard"></div>
    `;

    (leader || actions).insertAdjacentElement("afterend", section);
  }

  function render() {
    const board = document.querySelector("#weekPlanBoard");
    const count = document.querySelector("#weekPlanCount");
    if (!board) return;

    const tasks = collectTasks();
    if (count) count.textContent = `${tasks.length} задач`;

    if (!tasks.length) {
      board.innerHTML = `<div class="empty-state"><strong>На ближайшие 7 дней задач не найдено</strong><span>По текущим данным нет срочных управленческих действий.</span></div>`;
      return;
    }

    board.innerHTML = tasks.map((task, index) => `
      <article class="week-task ${task.priority}">
        <div class="week-task-index">${index + 1}</div>
        <div class="week-task-body">
          <div class="week-task-top">
            <span>${task.day}</span>
            <b>${task.type}</b>
          </div>
          <h3>${task.project}</h3>
          <p>${task.action}</p>
          <small><b>Ответственный:</b> ${task.owner}</small>
        </div>
      </article>
    `).join("");
  }

  function buildText() {
    const tasks = collectTasks();
    if (!tasks.length) return "План на 7 дней: срочных задач не найдено.";
    return [
      "План на 7 дней - Технопарк РГСУ",
      `Дата формирования: ${new Date().toLocaleString("ru-RU")}`,
      "",
      ...tasks.map((task, index) => [
        `${index + 1}. ${task.project}`,
        `   Тип: ${task.type}`,
        `   Срок выполнения: ${task.day}`,
        `   Ответственный: ${task.owner}`,
        `   Действие: ${task.action}`,
      ].join("\n")),
    ].join("\n");
  }

  async function copyPlan() {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      toast("План на 7 дней скопирован");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("План на 7 дней скопирован");
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
      if (event.target.closest("#copyWeekPlan")) copyPlan();
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
    if (!table || window.__weekPlanObserver) return;
    window.__weekPlanObserver = new MutationObserver(() => setTimeout(render, 200));
    window.__weekPlanObserver.observe(table, { childList: true, subtree: true });
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
