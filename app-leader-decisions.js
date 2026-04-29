/*
  Блок «Решения руководителя».
  Формирует список управленческих решений по данным уже отрисованной таблицы проектов.
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

  function owner(row) {
    return cleanText(row.children[2]?.textContent || "не указан");
  }

  function grant(row) {
    return cleanText(row.children[4]?.textContent || "");
  }

  function deadline(row) {
    return cleanText(row.children[5]?.textContent || "");
  }

  function readiness(row) {
    return cleanText(row.children[6]?.textContent || "");
  }

  function risk(row) {
    return cleanText(row.children[7]?.textContent || "");
  }

  function makeDecision(type, row, reason, action, priority = "medium") {
    return {
      type,
      project: projectName(row),
      owner: owner(row),
      reason,
      action,
      priority,
    };
  }

  function collectDecisions() {
    const decisions = [];

    rows().forEach((row) => {
      const text = normalizeText(`${row.textContent} ${risk(row)}`);
      const projectRisk = normalizeText(risk(row));
      const projectOwner = normalizeText(owner(row));
      const projectGrant = normalizeText(grant(row));
      const projectDeadline = normalizeText(deadline(row));
      const projectReadiness = normalizeText(readiness(row));

      if (!projectOwner || projectOwner.includes("не указан") || projectOwner.includes("требует уточнения")) {
        decisions.push(makeDecision(
          "Назначить ответственного",
          row,
          "У проекта нет закрепленного ответственного.",
          "Назначить владельца проекта и зафиксировать его в реестре.",
          "high"
        ));
      }

      if (!projectGrant || projectGrant.includes("не выбран") || projectGrant.includes("нет")) {
        decisions.push(makeDecision(
          "Утвердить грантовый маршрут",
          row,
          "Для проекта не выбран маршрут финансирования.",
          "Определить ближайший конкурс, грант или иной источник финансирования.",
          "high"
        ));
      }

      if (!projectDeadline || projectDeadline.includes("нет срока")) {
        decisions.push(makeDecision(
          "Назначить срок",
          row,
          "В реестре нет управленческого срока.",
          "Установить ближайший дедлайн: подача, упаковка, защита или проверка.",
          "medium"
        ));
      }

      if (projectReadiness.includes("расчет") || projectReadiness.includes("нет")) {
        decisions.push(makeDecision(
          "Подтвердить готовность",
          row,
          "Готовность рассчитана автоматически или не заполнена вручную.",
          "Проверить пакет проекта и указать фактический процент готовности.",
          "medium"
        ));
      }

      if (projectRisk.includes("срок прошел") || projectRisk.includes("дедлайн через")) {
        decisions.push(makeDecision(
          "Срочно обновить план",
          row,
          "Есть просрочка или близкий дедлайн.",
          "Принять решение: ускорить подготовку, перенести срок или снять проект с ближайшей подачи.",
          "critical"
        ));
      }

      if (text.includes("нтс")) {
        decisions.push(makeDecision(
          "Вынести на НТС",
          row,
          "Проект требует решения или обсуждения на НТС.",
          "Добавить проект в повестку и сформулировать вопрос для решения.",
          "critical"
        ));
      }
    });

    const priorityWeight = { critical: 0, high: 1, medium: 2, low: 3 };
    return decisions.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || a.project.localeCompare(b.project, "ru"));
  }

  function ensureSection() {
    const actions = document.querySelector("#actions");
    if (!actions || document.querySelector("#leaderDecisions")) return;

    const section = document.createElement("section");
    section.className = "section leader-decisions-section";
    section.id = "leaderDecisions";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Руководитель</p>
          <h2>Решения руководителя</h2>
        </div>
        <p>Автоматически формируется из рисков, пустых полей и статусов проектов.</p>
      </div>
      <div class="leader-decisions-toolbar">
        <button type="button" id="copyLeaderDecisions">Копировать решения</button>
        <span id="leaderDecisionsCount">0 решений</span>
      </div>
      <div class="leader-decisions-board" id="leaderDecisionsBoard"></div>
    `;

    actions.insertAdjacentElement("afterend", section);
  }

  function render() {
    const board = document.querySelector("#leaderDecisionsBoard");
    const count = document.querySelector("#leaderDecisionsCount");
    if (!board) return;

    const decisions = collectDecisions();
    if (count) count.textContent = `${decisions.length} решений`;

    if (!decisions.length) {
      board.innerHTML = `<div class="empty-state"><strong>Критических решений нет</strong><span>По текущим данным проекты не требуют отдельного решения руководителя.</span></div>`;
      return;
    }

    board.innerHTML = decisions.slice(0, 24).map((item) => `
      <article class="leader-decision ${item.priority}">
        <div>
          <span>${item.priority === "critical" ? "срочно" : item.priority === "high" ? "важно" : "планово"}</span>
          <strong>${item.type}</strong>
        </div>
        <h3>${item.project}</h3>
        <p>${item.reason}</p>
        <small><b>Ответственный:</b> ${item.owner || "не указан"}</small>
        <small><b>Решение:</b> ${item.action}</small>
      </article>
    `).join("");
  }

  function buildText() {
    const decisions = collectDecisions();
    if (!decisions.length) return "Решения руководителя: критических решений нет.";
    return [
      "Решения руководителя - Технопарк РГСУ",
      `Дата: ${new Date().toLocaleString("ru-RU")}`,
      "",
      ...decisions.map((item, index) => [
        `${index + 1}. ${item.type}: ${item.project}`,
        `   Приоритет: ${item.priority}`,
        `   Ответственный: ${item.owner || "не указан"}`,
        `   Основание: ${item.reason}`,
        `   Решение: ${item.action}`,
      ].join("\n")),
    ].join("\n");
  }

  async function copyDecisions() {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Решения руководителя скопированы");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Решения руководителя скопированы");
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
      if (event.target.closest("#copyLeaderDecisions")) copyDecisions();
      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData")) setTimeout(render, 500);
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
    if (!table || window.__leaderDecisionsObserver) return;
    window.__leaderDecisionsObserver = new MutationObserver(() => setTimeout(render, 180));
    window.__leaderDecisionsObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    ensureSection();
    attachEvents();
    observeTable();
    setTimeout(render, 1800);
    setTimeout(render, 4200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
