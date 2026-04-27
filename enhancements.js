// Дополнительный слой UX/UI: панель руководителя, радар грантов и усиленный журнал НТС.
(function () {
  const BASELINE = {
    total: 28,
    highPriority: 13,
    ready: 13,
    readiness: 42,
    nearestDeadline: "05.05.2026",
  };

  const DEFAULT_WINDOWS = [
    {
      name: "Новатор Москвы",
      date: "2026-05-05",
      projects: "004, 005, 012, 032, 052",
      action: "Выбрать 5 проектов и собрать короткие паспорта",
    },
    {
      name: "ФСИ Старт-Пром",
      date: "2026-05-12",
      projects: "Проекты с MVP и промышленным эффектом",
      action: "Проверить УТГ, смету и юридический контур",
    },
    {
      name: "РНФ / научный контур",
      date: "2026-05-22",
      projects: "Исследовательские проекты и цифровые методики",
      action: "Собрать научную группу и публикационный задел",
    },
    {
      name: "ФСИ Старт-1",
      date: "2026-06-01",
      projects: "Ранние технологические проекты",
      action: "Упаковать проблему, рынок, MVP и команду",
    },
    {
      name: "ПФКИ / социальный контур",
      date: "2026-06-30",
      projects: "Культурные, просветительские и социальные проекты",
      action: "Подготовить визуалы, партнеров и календарный план",
    },
  ];

  const WEEK_PLAN = [
    ["Отбор", "Зафиксировать 5 проектов класса A", "Руководитель + проектный офис"],
    ["Паспорт", "Собрать по 1 странице на каждый проект", "Ответственные проектов"],
    ["Пилоты", "Запросить письма поддержки", "Партнерский контур"],
    ["Смета", "Проверить бюджет и закупочные позиции", "Административный блок"],
    ["Презентация", "Собрать 7-10 слайдов для защиты", "Проектный офис"],
    ["Юрконтур", "Разделить публичные и закрытые сведения", "Руководство"],
    ["Решение", "Вынести проекты на утверждение НТС", "Секретарь НТС"],
  ];

  function $(selector) {
    return document.querySelector(selector);
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replaceAll("ё", "е");
  }

  function toDate(value) {
    if (!value) return null;
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? null : date;
  }

  function daysUntil(value) {
    const date = toDate(value);
    if (!date) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((date - today) / 86400000);
  }

  function formatDate(value) {
    const date = toDate(value);
    if (!date) return "без даты";
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function getAppState() {
    return window.state || (typeof state !== "undefined" ? state : null);
  }

  function getProjects() {
    const appState = getAppState();
    return Array.isArray(appState?.projects) ? appState.projects : [];
  }

  function getPackages() {
    const appState = getAppState();
    return Array.isArray(appState?.packages) ? appState.packages : [];
  }

  function getGrantWindows() {
    const appState = getAppState();
    const windows = Array.isArray(appState?.grantWindows) ? appState.grantWindows : [];
    if (windows.length) return windows;
    const grants = Array.isArray(appState?.grants) ? appState.grants : [];
    if (grants.length) {
      return grants.map((grant) => ({
        name: grant.route || grant.name || "Грантовое окно",
        deadline: grant.deadline || grant.window || "",
        appliesTo: grant.projects || grant.purpose || "",
        nextStep: grant.firstStep || grant.nextStep || "",
      }));
    }
    return DEFAULT_WINDOWS.map((item) => ({
      name: item.name,
      deadline: item.date,
      appliesTo: item.projects,
      nextStep: item.action,
    }));
  }

  function projectReadiness(project) {
    const number = Number(String(project?.readiness || "").replace("%", "").replace(",", "."));
    if (Number.isFinite(number) && number > 0) return Math.max(0, Math.min(100, Math.round(number)));
    const status = normalize(project?.status || project?.stage);
    if (status.includes("готов") || status.includes("упаков")) return 70;
    if (status.includes("пилот")) return 55;
    if (status.includes("прототип") || status.includes("mvp")) return 45;
    return 25;
  }

  function hasNeed(project, words) {
    const text = normalize([
      project?.note,
      project?.nextStep,
      project?.grant,
      project?.status,
      project?.stage,
      project?.direction,
      project?.contour,
    ].join(" "));
    return words.some((word) => text.includes(word));
  }

  function isReady(project) {
    const status = normalize(project?.status || project?.stage);
    return projectReadiness(project) >= 70 || status.includes("готов") || status.includes("упаков");
  }

  function isHighPriority(project) {
    return normalize(project?.priority).includes("выс") || projectReadiness(project) >= 70;
  }

  function isSensitive(project) {
    const text = normalize([project?.contour, project?.direction, project?.note, project?.nextStep, project?.grant].join(" "));
    return ["закрыт", "спец", "контракт", "дрон", "бпла", "служеб", "чувств"].some((word) => text.includes(word));
  }

  function getStats() {
    const projects = getProjects();
    if (!projects.length) {
      return {
        total: BASELINE.total,
        urgent: 1,
        ready: BASELINE.ready,
        highPriority: BASELINE.highPriority,
        averageReadiness: BASELINE.readiness,
        needsLetters: 0,
        needsEstimate: 0,
        needsDecision: 5,
        sensitive: 0,
        projects: [],
        fallback: true,
      };
    }

    const urgent = projects.filter((project) => daysUntil(project.deadline) <= 30).length;
    const ready = projects.filter(isReady).length;
    const highPriority = projects.filter(isHighPriority).length;
    const averageReadiness = Math.round(
      projects.reduce((sum, project) => sum + projectReadiness(project), 0) / Math.max(projects.length, 1)
    );
    const needsLetters = projects.filter((project) => hasNeed(project, ["пись", "партнер", "пилот"])).length;
    const needsEstimate = projects.filter((project) => hasNeed(project, ["смет", "бюджет", "финанс"])).length;
    const needsDecision = projects.filter((project) => !project.nextStep || hasNeed(project, ["решен", "утверд", "нтс", "руковод"])).length;
    const sensitive = projects.filter(isSensitive).length;

    return {
      total: projects.length,
      urgent,
      ready,
      highPriority,
      averageReadiness,
      needsLetters,
      needsEstimate,
      needsDecision,
      sensitive,
      projects,
      fallback: false,
    };
  }

  function ensureManagerPanel() {
    const dashboard = $("#dashboard");
    if (!dashboard || $("#managerCommandCenter")) return;

    const panel = document.createElement("section");
    panel.id = "managerCommandCenter";
    panel.className = "manager-command-center";
    panel.innerHTML = `
      <div class="manager-command-head">
        <div>
          <h2>Панель руководителя</h2>
          <p>Короткая картина для принятия решений: что срочно подать, что заблокировано, где нужен ответственный и что вынести на НТС.</p>
        </div>
        <div class="manager-command-actions">
          <button class="manager-mode-toggle" id="managerPublicMode" type="button">Публичный режим</button>
          <button class="ghost-action" id="managerPrintBrief" type="button">Печать сводки</button>
        </div>
      </div>
      <div class="manager-decision-grid" id="managerDecisionGrid"></div>
      <div class="manager-empty-note" id="managerDataNote"></div>
    `;

    const firstChild = dashboard.firstElementChild;
    dashboard.insertBefore(panel, firstChild);

    const plan = document.createElement("section");
    plan.id = "managerWeekPlan";
    plan.className = "manager-week-plan";
    plan.innerHTML = `
      <div class="manager-plan-head">
        <div>
          <h2>Что сделать за 7 дней</h2>
          <p>Практический план для подготовки ближайших заявок и управленческого решения.</p>
        </div>
      </div>
      <div class="manager-plan-grid" id="managerPlanGrid"></div>
    `;
    const health = dashboard.querySelector(".health-panel");
    if (health) dashboard.insertBefore(plan, health.nextSibling);
    else dashboard.append(plan);

    const radar = document.createElement("section");
    radar.id = "managerGrantRadar";
    radar.className = "manager-grant-radar";
    radar.innerHTML = `
      <div class="manager-radar-head">
        <div>
          <h2>Грантовый радар</h2>
          <p>Ближайшие окна, риск по сроку и первое действие для команды.</p>
        </div>
      </div>
      <div class="manager-radar-wrap">
        <table class="manager-radar-table">
          <thead>
            <tr>
              <th>Окно</th>
              <th>Дата</th>
              <th>Подходит для</th>
              <th>Первое действие</th>
              <th>Риск</th>
            </tr>
          </thead>
          <tbody id="managerRadarRows"></tbody>
        </table>
      </div>
    `;
    const executive = dashboard.querySelector(".executive-panel");
    if (executive) dashboard.insertBefore(radar, executive.nextSibling);
    else dashboard.append(radar);

    $("#managerPublicMode")?.addEventListener("click", () => {
      document.body.classList.toggle("public-view");
      const enabled = document.body.classList.contains("public-view");
      localStorage.setItem("rgsu-technopark-public-view", enabled ? "1" : "0");
      renderManagerPanel();
    });

    $("#managerPrintBrief")?.addEventListener("click", () => window.print());
  }

  function renderManagerPanel() {
    ensureManagerPanel();
    const stats = getStats();
    const grid = $("#managerDecisionGrid");
    const note = $("#managerDataNote");
    if (!grid) return;

    const cards = [
      ["Срочно на подачу", stats.urgent, "Дедлайн в ближайшие 30 дней. Сначала закрыть паспорта, сметы и письма.", "is-danger", "urgent"],
      ["Нужны письма партнеров", stats.needsLetters || "—", "Пилотные площадки и письма поддержки повышают шансы на грант.", "is-warning", "risks"],
      ["Нужна смета", stats.needsEstimate || "—", "Без бюджета проект нельзя быстро подать на конкурс.", "is-warning", "risks"],
      ["Решение руководства", stats.needsDecision || 5, "Нужно назначить ответственных, выбрать маршрут и подтвердить приоритет.", "", "high"],
      ["К подаче", stats.ready, "Проекты с высокой готовностью пакета или статусом к упаковке.", "is-success", "ready"],
    ];

    grid.innerHTML = cards
      .map(
        ([title, value, text, mod, preset]) => `
        <button class="manager-decision-card is-clickable ${mod}" type="button" data-manager-preset="${preset}">
          <span>${title}</span>
          <strong>${value}</strong>
          <p>${text}</p>
        </button>`
      )
      .join("");

    grid.querySelectorAll("[data-manager-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = button.getAttribute("data-manager-preset");
        const target = document.querySelector(`.quick-chip[data-preset="${preset}"]`);
        if (target) target.click();
        document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (note) {
      note.textContent = stats.fallback
        ? "Показана контрольная управленческая сводка по последнему реестру. После загрузки Google Таблицы значения обновятся автоматически."
        : `Данные загружены: ${stats.total} проектов, ${stats.highPriority} высокого приоритета, средняя готовность ${stats.averageReadiness}%.`;
    }

    const metricTotal = $("#totalProjects");
    const metricUrgent = $("#urgentGrants");
    const metricReady = $("#readyCount");
    const health = $("#portfolioHealth");
    const healthText = $("#portfolioHealthText");
    const healthBar = $("#portfolioHealthBar");
    if (stats.fallback) {
      if (metricTotal && metricTotal.textContent === "0") metricTotal.textContent = String(BASELINE.total);
      if (metricUrgent && metricUrgent.textContent === "0") metricUrgent.textContent = "1";
      if (metricReady && metricReady.textContent === "0") metricReady.textContent = String(BASELINE.ready);
      if (health && health.textContent === "0%") health.textContent = `${BASELINE.readiness}%`;
      if (healthBar && (!healthBar.style.width || healthBar.style.width === "0%")) healthBar.style.width = `${BASELINE.readiness}%`;
      if (healthText && /После загрузки|0/.test(healthText.textContent)) {
        healthText.textContent = `Контрольное значение по последнему реестру: ${BASELINE.readiness}%. Нужно довести паспорта, письма и сметы.`;
      }
    }

    renderPlan();
    renderRadar();
    renderExecutiveCopy(stats);
  }

  function renderPlan() {
    const grid = $("#managerPlanGrid");
    if (!grid) return;
    grid.innerHTML = WEEK_PLAN.map(
      ([title, text, owner], index) => `
        <article class="manager-plan-step">
          <span>${index + 1}</span>
          <strong>${title}</strong>
          <small>${text}<br>${owner}</small>
        </article>`
    ).join("");
  }

  function renderRadar() {
    const rows = $("#managerRadarRows");
    if (!rows) return;
    const windows = getGrantWindows()
      .filter((item) => item.name || item.deadline)
      .slice(0, 8);

    rows.innerHTML = windows
      .map((item) => {
        const due = daysUntil(item.deadline);
        const riskClass = due <= 14 ? "hot" : due <= 35 ? "soon" : "ok";
        const riskText = due === Infinity ? "уточнить" : due < 0 ? "прошло" : due <= 14 ? "срочно" : due <= 35 ? "близко" : "планово";
        return `
          <tr>
            <td><strong>${item.name || "Грантовое окно"}</strong></td>
            <td>${formatDate(item.deadline)}</td>
            <td>${item.appliesTo || item.projects || "Уточнить подходящие проекты"}</td>
            <td>${item.nextStep || item.action || "Назначить ответственного и проверить требования"}</td>
            <td><span class="manager-risk ${riskClass}">${riskText}</span></td>
          </tr>`;
      })
      .join("");
  }

  function renderExecutiveCopy(stats) {
    const executive = $("#executiveSummary");
    if (!executive || executive.dataset.managerPatched === "1") return;
    const fallbackCopy = [
      ["Решение на НТС", "Утвердить 5 проектов", "Сфокусировать команду на ближайшем грантовом окне."],
      ["Главный риск", "Письма и сметы", "Без подтверждений пилотов и бюджета заявки будут слабыми."],
      ["Контур доступа", "Разделить публичное и внутреннее", "Закрытые детали не должны отображаться в публичном режиме."],
      ["Следующий шаг", "Пакет за 7 дней", "Паспорта, сметы, письма, презентация и юрпроверка."],
    ];

    if (!executive.children.length || stats.fallback) {
      executive.innerHTML = fallbackCopy
        .map(
          ([label, title, text]) => `
          <article class="executive-item">
            <span>${label}</span>
            <strong>${title}</strong>
            <p>${text}</p>
          </article>`
        )
        .join("");
      executive.dataset.managerPatched = "1";
    }
  }

  function enhanceFeedback() {
    const form = $("#ntsFeedbackForm");
    if (!form || form.dataset.managerEnhanced === "1") return;
    form.dataset.managerEnhanced = "1";

    const projectLabel = $("#feedbackProjectSelect")?.closest("label");
    if (projectLabel) {
      const wrapper = document.createElement("div");
      wrapper.className = "manager-feedback-fields form-row";
      wrapper.innerHTML = `
        <label>
          <span>Статус обработки</span>
          <select name="processingStatus">
            <option>Новое</option>
            <option>Принято</option>
            <option>В работе</option>
            <option>Учтено в проекте</option>
            <option>Отклонено</option>
          </select>
        </label>
        <label>
          <span>Ответственный за реакцию</span>
          <input name="responseOwner" placeholder="Кто должен ответить или выполнить">
        </label>`;
      projectLabel.insertAdjacentElement("afterend", wrapper);
    }

    const listPanel = $("#ntsFeedbackList")?.closest(".panel");
    if (listPanel && !$("#feedbackToolbar")) {
      const toolbar = document.createElement("div");
      toolbar.id = "feedbackToolbar";
      toolbar.className = "feedback-toolbar";
      toolbar.innerHTML = `
        <span>Новое</span>
        <span>Принято</span>
        <span>В работе</span>
        <span>Учтено</span>
        <span>Риск</span>
        <span>Поручение</span>`;
      const head = listPanel.querySelector(".panel-head");
      if (head) head.insertAdjacentElement("afterend", toolbar);
    }
  }

  function renameInterface() {
    document.title = "Технопарк РГСУ - панель руководителя";
    const pageTitle = $("#pageTitle");
    if (pageTitle) pageTitle.textContent = "Панель руководителя: проекты, гранты и решения НТС";

    const lead = document.querySelector(".lead");
    if (lead) {
      lead.textContent = "Единая управленческая панель: проекты, готовность пакета, ближайшие гранты, блокеры, пожелания НТС и следующие решения руководителя.";
    }

    const topTitle = $("#currentSectionTitle");
    if (topTitle && normalize(topTitle.textContent) === "обзор") topTitle.textContent = "Панель руководителя";

    const overviewTab = document.querySelector('.tab[data-view="dashboard"]');
    if (overviewTab) overviewTab.textContent = "Панель";

    const executiveTitle = $("#executiveTitle");
    if (executiveTitle) executiveTitle.textContent = "Сводка для руководителя";

    document.querySelectorAll("h2, p, small, button, span, strong").forEach((node) => {
      if (node.childNodes.length === 1 && node.textContent.includes("проректора")) {
        node.textContent = node.textContent.replaceAll("проректора", "руководителя");
      }
    });
  }

  function restoreMode() {
    if (localStorage.getItem("rgsu-technopark-public-view") === "1") {
      document.body.classList.add("public-view");
    }
  }

  function tick() {
    renameInterface();
    enhanceFeedback();
    renderManagerPanel();
  }

  document.addEventListener("DOMContentLoaded", () => {
    restoreMode();
    tick();
    setTimeout(tick, 1200);
    setTimeout(tick, 3500);
    setInterval(tick, 7000);
  });
})();
