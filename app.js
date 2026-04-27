const SHEET = {
  id: "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60",
  gid: "969711980",
};

const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzTl0x-ygpETmGhnwkK0CTt0SIbeOBgM0OjhAsbK05pKkIu9UO5EUUjiYFq0V_AWxk/exec";
const CONFIRM_CODE = "11111111";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET.id}/gviz/tq?gid=${SHEET.gid}&headers=1`;
const STORAGE_KEY = "rgsu-technopark-projects";
const SCRIPT_URL_KEY = "rgsu-technopark-script-url";
const STATUSES = ["Идея", "Прототип", "Пилот", "Готов к гранту", "Подан"];

const fallbackProjects = [
  {
    name: "AI-наставник для студенческих команд",
    owner: "Лаборатория ИИ",
    status: "Прототип",
    readiness: 65,
    grant: "Старт-ИИ",
    deadline: "2026-05-22",
    budget: "4 000 000 ₽",
    nextStep: "Собрать метрики пилота и письмо индустриального партнера",
  },
  {
    name: "VR-тренажер социальной реабилитации",
    owner: "Центр иммерсивных технологий",
    status: "Готов к гранту",
    readiness: 88,
    grant: "Фонд содействия инновациям",
    deadline: "2026-05-10",
    budget: "3 500 000 ₽",
    nextStep: "Проверить смету и финальный пакет приложений",
  },
  {
    name: "Платформа мониторинга НКО-проектов",
    owner: "Проектный офис",
    status: "Пилот",
    readiness: 74,
    grant: "Президентские гранты",
    deadline: "2026-06-04",
    budget: "2 800 000 ₽",
    nextStep: "Дособрать календарный план и показатели результата",
  },
  {
    name: "Карта доступной городской среды",
    owner: "Студенческий акселератор",
    status: "Идея",
    readiness: 30,
    grant: "",
    deadline: "",
    budget: "900 000 ₽",
    nextStep: "Выбрать конкурс и описать пользовательские сценарии",
  },
];

let state = {
  projects: [],
  grantWindows: [],
  plan: [],
  directions: [],
  summary: {},
  query: "",
  status: "all",
  deadline: "all",
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  jumpButtons: document.querySelectorAll("[data-jump]"),
  search: document.querySelector("#searchInput"),
  status: document.querySelector("#statusFilter"),
  deadline: document.querySelector("#deadlineFilter"),
  refresh: document.querySelector("#refreshSheet"),
  projectRows: document.querySelector("#projectRows"),
  projectList: document.querySelector("#projectList"),
  grantBoard: document.querySelector("#grantBoard"),
  grantWindows: document.querySelector("#grantWindows"),
  timeline: document.querySelector("#timeline"),
  actionList: document.querySelector("#actionList"),
  syncStatus: document.querySelector("#syncStatus"),
  syncDot: document.querySelector("#syncDot"),
  dialog: document.querySelector("#projectDialog"),
  form: document.querySelector("#projectForm"),
  openDialog: document.querySelector("#openAddProject"),
  closeDialog: document.querySelector("#closeDialog"),
  cancelDialog: document.querySelector("#cancelDialog"),
  confirmCode: document.querySelector("#confirmCode"),
  confirmError: document.querySelector("#confirmError"),
  clearFilters: document.querySelector("#clearFilters"),
  saveSettings: document.querySelector("#saveSettings"),
  scriptUrl: document.querySelector("#scriptUrl"),
  sheetId: document.querySelector("#sheetId"),
  sheetGid: document.querySelector("#sheetGid"),
  toast: document.querySelector("#toast"),
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ");
}

function getValue(row, keys) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value])
  );

  for (const key of keys) {
    const value = normalized[normalizeKey(key)];
    if (value !== undefined && value !== "") return value;
  }

  return "";
}

function normalizeStatus(value) {
  const raw = String(value || "").trim();
  const key = normalizeKey(raw);
  if (!key) return "Идея";
  if (key.includes("подан") || key.includes("заявк")) return "Подан";
  if (key.includes("готов")) return "Готов к гранту";
  if (key.includes("пилот")) return "Пилот";
  if (key.includes("прототип") || key.includes("mvp")) return "Прототип";
  if (key.includes("иде")) return "Идея";
  return STATUSES.includes(raw) ? raw : "Идея";
}

function normalizeProject(row) {
  const name = getValue(row, ["name", "название", "проект", "project", "наименование"]);
  const owner = getValue(row, [
    "owner",
    "ответственный",
    "команда",
    "руководитель",
    "фио",
    "автор",
    "инициатор",
  ]);
  const grant = getValue(row, ["grant", "грант", "конкурс", "фонд", "программа"]);
  const deadline = toIsoDate(
    getValue(row, ["deadline", "дедлайн", "срок", "дата подачи", "срок подачи"])
  );

  return {
    name: name || "Без названия",
    owner: owner || "Не назначен",
    status: normalizeStatus(getValue(row, ["status", "статус", "этап", "стадия"])),
    readiness: clampPercent(
      getValue(row, ["readiness", "готовность", "готовность %", "%", "процент готовности"])
    ),
    grant,
    deadline,
    budget: getValue(row, ["budget", "бюджет", "сумма", "запрашиваемая сумма"]),
    nextStep: getValue(row, [
      "nextStep",
      "следующее действие",
      "действие",
      "задача",
      "следующий шаг",
      "комментарий",
    ]),
  };
}

function columnValue(row, column) {
  if (column === "A") {
    const firstKey = Object.keys(row)[0];
    return row[firstKey] || "";
  }
  return row[column] || "";
}

function buildPositionalProject(row) {
  const name = columnValue(row, "A");
  const owner = columnValue(row, "B");
  const status = normalizeStatus(columnValue(row, "C"));
  const rawStatus = columnValue(row, "C");

  if (!name || !rawStatus || !STATUSES.includes(status)) return null;

  return {
    name,
    owner: owner || "Не назначен",
    status,
    readiness: clampPercent(columnValue(row, "D")),
    grant: columnValue(row, "E"),
    deadline: toIsoDate(columnValue(row, "F")),
    budget: columnValue(row, "G"),
    nextStep: columnValue(row, "H"),
  };
}

function parseSheetData(rows) {
  const summary = {};
  const grantWindows = [];
  const plan = [];
  const directions = [];
  const projects = [];
  let readingDirections = false;

  rows.forEach((row) => {
    const a = String(columnValue(row, "A")).trim();
    const b = String(columnValue(row, "B")).trim();
    const d = String(columnValue(row, "D")).trim();
    const e = String(columnValue(row, "E")).trim();
    const f = String(columnValue(row, "F")).trim();
    const g = String(columnValue(row, "G")).trim();
    const h = String(columnValue(row, "H")).trim();

    const positionalProject = buildPositionalProject(row);
    if (positionalProject) {
      projects.push(positionalProject);
      return;
    }

    if (a === "Направление") {
      readingDirections = true;
      return;
    }

    if (readingDirections && a && b) {
      directions.push({ name: a, count: Number(b) || 0 });
      return;
    }

    if (a && b && Number.isFinite(Number(b))) {
      summary[a] = Number(b);
    }

    if (d && e && toIsoDate(e) && d !== "Ближайшие окна") {
      grantWindows.push({
        name: d,
        deadline: toIsoDate(e),
        appliesTo: f,
        nextStep: g,
        source: h,
      });
    }

    if (/^\d+$/.test(d) && e) {
      plan.push({ number: Number(d), text: e });
    }
  });

  return { projects, grantWindows, plan, directions, summary };
}

function clampPercent(value) {
  const number = Number(String(value || "").replace("%", "").replace(",", "."));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const gvizDate = raw.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (gvizDate) {
    const [, year, month, day] = gvizDate;
    return `${year}-${String(Number(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function gvizValue(cell) {
  if (!cell) return "";
  return cell.f || cell.v || "";
}

function loadSheetRows() {
  return new Promise((resolve, reject) => {
    const callback = `rgsuSheetCallback_${Date.now()}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callback];
      script.remove();
    };

    window[callback] = (data) => {
      cleanup();
      if (!data || data.status === "error") {
        reject(new Error("sheet unavailable"));
        return;
      }

      const headers = (data.table.cols || []).map(
        (column, index) => column.label || column.id || `col${index}`
      );
      const rows = (data.table.rows || []).map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, gvizValue(row.c[index])]))
      );
      resolve(rows);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("sheet unavailable"));
    };
    script.src = `${GVIZ_URL}&tqx=responseHandler:${callback}&cacheBust=${Date.now()}`;
    document.head.append(script);
  });
}

function daysUntil(dateValue) {
  if (!dateValue) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function formatDate(dateValue) {
  if (!dateValue) return "Без дедлайна";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function deadlineInfo(project) {
  const due = daysUntil(project.deadline);
  if (!project.deadline) {
    return { label: "Без дедлайна", className: "is-missing", due };
  }
  if (due < 0) {
    return { label: `Просрочено: ${Math.abs(due)} дн.`, className: "is-urgent", due };
  }
  if (due === 0) {
    return { label: "Сегодня", className: "is-urgent", due };
  }
  if (due <= 14) {
    return { label: `${due} дн.`, className: "is-urgent", due };
  }
  return { label: `${due} дн.`, className: due <= 30 ? "is-urgent" : "", due };
}

function loadLocalProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function projectKey(project) {
  return normalizeKey(`${project.name}|${project.owner}|${project.grant}|${project.deadline}`);
}

function mergeProjects(...groups) {
  const map = new Map();
  groups.flat().forEach((project) => {
    if (!project || !project.name) return;
    const key = projectKey(project);
    if (!map.has(key)) map.set(key, project);
  });
  return Array.from(map.values());
}

function setSyncState(message, type = "loading") {
  els.syncStatus.textContent = message;
  els.syncDot.classList.toggle("is-ok", type === "ok");
  els.syncDot.classList.toggle("is-error", type === "error");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 3600);
}

function setConfirmError(message = "") {
  els.confirmError.textContent = message;
  els.confirmCode.setAttribute("aria-invalid", message ? "true" : "false");
}

async function loadProjects() {
  setSyncState("Загружаю данные из Google Таблицы...");
  const localProjects = loadLocalProjects().map(normalizeProject);

  try {
    const sheetData = parseSheetData(await loadSheetRows());
    state.grantWindows = sheetData.grantWindows;
    state.plan = sheetData.plan;
    state.directions = sheetData.directions;
    state.summary = sheetData.summary;
    state.projects = mergeProjects(sheetData.projects, localProjects);
    setSyncState(
      `Связано с Google Таблицей: ${sheetData.projects.length} проектов, ${sheetData.grantWindows.length} грантовых окон. Локальный буфер: ${localProjects.length}.`,
      "ok"
    );
  } catch {
    state.grantWindows = [];
    state.plan = [];
    state.directions = [];
    state.summary = {};
    state.projects = mergeProjects(localProjects, fallbackProjects);
    setSyncState(
      "Таблица временно недоступна. Показаны локальные и демонстрационные проекты.",
      "error"
    );
  }

  render();
}

function filteredProjects() {
  const query = normalizeKey(state.query);
  return state.projects
    .filter((project) => {
      const haystack = normalizeKey(
        `${project.name} ${project.owner} ${project.grant} ${project.nextStep} ${project.status}`
      );
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus = state.status === "all" || project.status === state.status;
      const due = daysUntil(project.deadline);
      const matchesDeadline =
        state.deadline === "all" ||
        (state.deadline === "missing" && !project.deadline) ||
        (state.deadline !== "missing" && due >= 0 && due <= Number(state.deadline));
      return matchesQuery && matchesStatus && matchesDeadline;
    })
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
}

function statusClass(status) {
  const key = normalizeKey(status);
  if (key.includes("подан")) return "status-submitted";
  if (key.includes("готов")) return "status-ready";
  if (key.includes("иде")) return "status-idea";
  return "";
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderDeadlineBadge(project) {
  const info = deadlineInfo(project);
  const badge = createText("span", `deadline-badge ${info.className}`.trim(), info.label);
  badge.title = project.deadline ? formatDate(project.deadline) : "Дата подачи не указана";
  return badge;
}

function renderProgress(readiness) {
  const wrap = document.createElement("div");
  wrap.className = "progress";
  const bar = document.createElement("span");
  bar.style.width = `${readiness}%`;
  wrap.append(bar);
  return wrap;
}

function projectRisk(project) {
  if (!project.grant) return "Нужно выбрать грант";
  if (!project.deadline) return "Нужен дедлайн";
  if (!project.nextStep) return "Нужен следующий шаг";
  if (daysUntil(project.deadline) <= 14 && project.readiness < 75) return "Мало времени до подачи";
  return "";
}

function renderTable(projects) {
  els.projectRows.replaceChildren();
  if (!projects.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.className = "empty-state";
    cell.textContent = "Проектов по выбранным фильтрам нет.";
    row.append(cell);
    els.projectRows.append(row);
    return;
  }

  projects.forEach((project) => {
    const row = document.createElement("tr");
    if (projectRisk(project)) row.className = "is-risk";

    const nameCell = document.createElement("td");
    const nameWrap = document.createElement("div");
    nameWrap.className = "project-name";
    nameWrap.append(createText("strong", "", project.name));
    nameWrap.append(createText("small", "muted", project.budget || "Бюджет не указан"));
    nameCell.append(nameWrap);

    const ownerCell = createText("td", "", project.owner);

    const statusCell = document.createElement("td");
    statusCell.append(createText("span", `status-pill ${statusClass(project.status)}`.trim(), project.status));

    const grantCell = createText("td", "", project.grant || "Грант не выбран");

    const deadlineCell = document.createElement("td");
    deadlineCell.append(renderDeadlineBadge(project));

    const readinessCell = document.createElement("td");
    readinessCell.className = "readiness-cell";
    readinessCell.append(renderProgress(project.readiness));
    readinessCell.append(createText("small", "muted", `${project.readiness}%`));

    const nextCell = createText("td", "muted", project.nextStep || projectRisk(project) || "Не указано");

    row.append(nameCell, ownerCell, statusCell, grantCell, deadlineCell, readinessCell, nextCell);
    els.projectRows.append(row);
  });
}

function renderCard(project) {
  const template = document.querySelector("#projectCardTemplate");
  const card = template.content.firstElementChild.cloneNode(true);
  const deadline = deadlineInfo(project);

  card.querySelector(".status-pill").textContent = project.status;
  card.querySelector(".status-pill").className = `status-pill ${statusClass(project.status)}`.trim();
  card.querySelector("h3").textContent = project.name;
  card.querySelector(".project-meta").textContent = `${project.owner}${project.budget ? ` · ${project.budget}` : ""}`;
  card.querySelector(".next-step").textContent = project.nextStep || projectRisk(project) || "Следующее действие не указано";
  card.querySelector(".deadline").textContent = project.deadline ? `${formatDate(project.deadline)} · ${deadline.label}` : "Без дедлайна";
  card.querySelector(".grant-name").textContent = project.grant || "Грант не выбран";
  card.querySelector(".progress span").style.width = `${project.readiness}%`;
  card.querySelector(".readiness").textContent = `Готовность ${project.readiness}%`;
  if (deadline.className === "is-urgent") card.querySelector(".deadline").style.color = "var(--red)";
  return card;
}

function renderMobileCards(projects) {
  els.projectList.replaceChildren();
  if (!projects.length) {
    els.projectList.append(createText("div", "empty-state", "Проектов по выбранным фильтрам нет."));
    return;
  }
  projects.forEach((project) => els.projectList.append(renderCard(project)));
}

function renderBoard(projects) {
  els.grantBoard.replaceChildren();
  STATUSES.forEach((status) => {
    const column = document.createElement("section");
    column.className = "grant-column";
    column.append(createText("h3", "", `${status} · ${projects.filter((project) => project.status === status).length}`));

    const items = projects.filter((project) => project.status === status);
    if (!items.length) {
      column.append(createText("div", "empty-state", "Нет проектов"));
    } else {
      items.forEach((project) => column.append(renderCard(project)));
    }

    els.grantBoard.append(column);
  });
}

function renderGrantWindows() {
  els.grantWindows.replaceChildren();
  if (!state.grantWindows.length) {
    els.grantWindows.append(createText("div", "empty-state", "Грантовые окна пока не найдены в таблице."));
    return;
  }

  state.grantWindows
    .slice()
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
    .forEach((grant) => {
      const card = document.createElement("article");
      card.className = "grant-window";
      card.append(renderDeadlineBadge({ deadline: grant.deadline }));
      card.append(createText("strong", "", grant.name));
      card.append(createText("p", "", grant.appliesTo || "Направление не указано"));
      card.append(createText("p", "", grant.nextStep || "Следующее действие не указано"));
      if (grant.source) card.append(createText("small", "muted", grant.source));
      els.grantWindows.append(card);
    });
}

function renderTimeline(projects) {
  els.timeline.replaceChildren();
  const datedProjects = projects.filter((project) => project.deadline);
  const dated = datedProjects.length
    ? datedProjects.slice(0, 8)
    : state.grantWindows
        .map((grant) => ({
          name: grant.name,
          grant: grant.appliesTo,
          deadline: grant.deadline,
        }))
        .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
        .slice(0, 8);
  if (!dated.length) {
    els.timeline.append(
      createText("div", "empty-state", "Добавьте дедлайны, чтобы собрать грантовый календарь.")
    );
    return;
  }

  dated.forEach((project) => {
    const item = document.createElement("article");
    item.className = "timeline-item";

    const date = createText("strong", "timeline-date", formatDate(project.deadline));
    const title = document.createElement("div");
    title.className = "timeline-title";
    title.append(createText("strong", "", project.name));
    title.append(createText("small", "", project.grant || "Грант не выбран"));

    item.append(date, title, renderDeadlineBadge(project));
    els.timeline.append(item);
  });
}

function renderActions(projects) {
  els.actionList.replaceChildren();
  const actions = projects
    .map((project) => ({ project, reason: projectRisk(project) }))
    .filter((item) => item.reason)
    .sort((a, b) => daysUntil(a.project.deadline) - daysUntil(b.project.deadline))
    .slice(0, 7);

  if (!actions.length && state.plan.length) {
    state.plan.slice(0, 7).forEach((step) => {
      const item = document.createElement("article");
      item.className = "action-item";
      const text = document.createElement("div");
      text.append(createText("strong", "", `Шаг ${step.number}`));
      text.append(createText("small", "", step.text));
      item.append(text, createText("span", "deadline-badge", "7 дней"));
      els.actionList.append(item);
    });
    return;
  }

  if (!actions.length) {
    els.actionList.append(createText("div", "empty-state", "Критичных пробелов не найдено."));
    return;
  }

  actions.forEach(({ project, reason }) => {
    const item = document.createElement("article");
    item.className = "action-item";
    const text = document.createElement("div");
    text.append(createText("strong", "", project.name));
    text.append(createText("small", "", reason));
    item.append(text, renderDeadlineBadge(project));
    els.actionList.append(item);
  });
}

function renderMetrics(projects) {
  const urgent = projects.filter((project) => {
    const due = daysUntil(project.deadline);
    return due >= 0 && due <= 30;
  });
  const urgentWindows = state.grantWindows.filter((grant) => {
    const due = daysUntil(grant.deadline);
    return due >= 0 && due <= 30;
  });
  const ready = projects.filter((project) => project.readiness >= 75);
  const risks = projects.filter((project) => projectRisk(project));
  const nearest =
    projects.find((project) => project.deadline) ||
    state.grantWindows
      .slice()
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))[0];
  const total = state.projects.length || state.summary["Всего проектов"] || 0;
  const readyCount = ready.length || state.summary["К упаковке"] || 0;

  document.querySelector("#totalProjects").textContent = total;
  document.querySelector("#filteredCount").textContent = state.projects.length
    ? `${projects.length} показано`
    : "из сводки таблицы";
  document.querySelector("#urgentGrants").textContent = urgent.length || urgentWindows.length;
  document.querySelector("#readyCount").textContent = readyCount;
  document.querySelector("#riskCount").textContent = risks.length;
  document.querySelector("#weekFocus").textContent = nearest
    ? `Ближайший фокус: ${nearest.grant || nearest.name}`
    : "Нет срочных дедлайнов";
}

function render() {
  const projects = filteredProjects();
  renderMetrics(projects);
  renderTimeline(projects);
  renderActions(projects);
  renderTable(projects);
  renderMobileCards(projects);
  renderGrantWindows();
  renderBoard(projects);
}

async function submitToSheet(project) {
  const scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
  if (!scriptUrl) return false;

  await fetch(scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(project),
  });

  return true;
}

function switchView(viewId) {
  els.tabs.forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId));
  els.views.forEach((view) => view.classList.toggle("active-section", view.id === viewId));
}

function resetFilters() {
  state.query = "";
  state.status = "all";
  state.deadline = "all";
  els.search.value = "";
  els.status.value = "all";
  els.deadline.value = "all";
  render();
}

function setupEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  els.jumpButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.jump));
  });

  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  els.status.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });
  els.deadline.addEventListener("change", (event) => {
    state.deadline = event.target.value;
    render();
  });
  els.refresh.addEventListener("click", loadProjects);
  els.clearFilters.addEventListener("click", resetFilters);

  els.openDialog.addEventListener("click", () => {
    setConfirmError();
    els.dialog.showModal();
  });
  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.cancelDialog.addEventListener("click", () => els.dialog.close());
  els.confirmCode.addEventListener("input", () => setConfirmError());

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(els.form);
    const rawProject = Object.fromEntries(formData.entries());

    if (rawProject.confirmCode !== CONFIRM_CODE) {
      setConfirmError("Неверный код подтверждения. Изменения не внесены.");
      els.confirmCode.focus();
      showToast("Запись остановлена: нужен правильный код подтверждения.");
      return;
    }

    const project = normalizeProject(rawProject);
    project.createdAt = new Date().toISOString();
    const submission = { ...project, confirmCode: rawProject.confirmCode };

    const localProjects = loadLocalProjects();
    localProjects.unshift(project);
    saveLocalProjects(localProjects);
    state.projects = mergeProjects([project], state.projects);
    render();
    els.dialog.close();
    els.form.reset();
    setConfirmError();
    setSyncState("Проект добавлен. Отправляю запись в Google Таблицу...");

    try {
      await submitToSheet(submission);
      setSyncState("Проект отправлен в Google Таблицу через Apps Script.", "ok");
      showToast("Проект добавлен и отправлен в таблицу.");
    } catch {
      setSyncState("Проект сохранен локально, но запись в таблицу не удалась.", "error");
      showToast("Проект сохранен локально. Проверьте доступ к Apps Script.");
    }
  });

  els.saveSettings.addEventListener("click", () => {
    const value = els.scriptUrl.value.trim() || DEFAULT_SCRIPT_URL;
    localStorage.setItem(SCRIPT_URL_KEY, value);
    els.scriptUrl.value = value;
    setSyncState("Настройки связи сохранены.", "ok");
    showToast("Связь с Apps Script сохранена.");
  });
}

function initSettings() {
  els.sheetId.value = SHEET.id;
  els.sheetGid.value = SHEET.gid;
  els.scriptUrl.value = localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
}

initSettings();
setupEvents();
loadProjects();
