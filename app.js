const SHEET = {
  id: "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60",
  gid: "969711980",
};

const SHEETS = {
  dashboard: "969711980",
  projects: "150570752",
  grants: "1500721586",
  packages: "341683209",
};

const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzTl0x-ygpETmGhnwkK0CTt0SIbeOBgM0OjhAsbK05pKkIu9UO5EUUjiYFq0V_AWxk/exec";
const CONFIRM_CODE = "11111111";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET.id}/gviz/tq`;
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
  grants: [],
  packages: [],
  grantWindows: [],
  plan: [],
  directions: [],
  summary: {},
  query: "",
  direction: "all",
  status: "all",
  deadline: "all",
  preset: "all",
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  jumpButtons: document.querySelectorAll("[data-jump]"),
  search: document.querySelector("#searchInput"),
  direction: document.querySelector("#directionFilter"),
  status: document.querySelector("#statusFilter"),
  deadline: document.querySelector("#deadlineFilter"),
  refresh: document.querySelector("#refreshSheet"),
  copyBrief: document.querySelector("#copyBrief"),
  quickFilters: document.querySelectorAll(".quick-chip"),
  projectRows: document.querySelector("#projectRows"),
  projectList: document.querySelector("#projectList"),
  packageRows: document.querySelector("#packageRows"),
  packageList: document.querySelector("#packageList"),
  grantBoard: document.querySelector("#grantBoard"),
  grantWindows: document.querySelector("#grantWindows"),
  timeline: document.querySelector("#timeline"),
  actionList: document.querySelector("#actionList"),
  executiveSummary: document.querySelector("#executiveSummary"),
  portfolioMap: document.querySelector("#portfolioMap"),
  leadershipActions: document.querySelector("#leadershipActions"),
  filterSummary: document.querySelector("#filterSummary"),
  projectInsights: document.querySelector("#projectInsights"),
  grantInsights: document.querySelector("#grantInsights"),
  packageSummary: document.querySelector("#packageSummary"),
  portfolioHealth: document.querySelector("#portfolioHealth"),
  portfolioHealthBar: document.querySelector("#portfolioHealthBar"),
  portfolioHealthText: document.querySelector("#portfolioHealthText"),
  syncStatus: document.querySelector("#syncStatus"),
  syncDot: document.querySelector("#syncDot"),
  dialog: document.querySelector("#projectDialog"),
  form: document.querySelector("#projectForm"),
  openDialog: document.querySelector("#openAddProject"),
  presentationMode: document.querySelector("#presentationMode"),
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

function firstValue(row, keys) {
  return getValue(row, keys);
}

function normalizeStatus(value) {
  const raw = String(value || "").trim();
  const key = normalizeKey(raw);
  if (!key) return "Идея";
  if (key.includes("нов")) return "Идея";
  if (key.includes("работ")) return "Пилот";
  if (key.includes("упаков")) return "Готов к гранту";
  if (key.includes("подан") || key.includes("заявк")) return "Подан";
  if (key.includes("готов")) return "Готов к гранту";
  if (key.includes("пилот")) return "Пилот";
  if (key.includes("прототип") || key.includes("mvp")) return "Прототип";
  if (key.includes("иде")) return "Идея";
  return STATUSES.includes(raw) ? raw : "Идея";
}

function normalizeProject(row) {
  const name = firstValue(row, [
    "name",
    "название",
    "проект",
    "project",
    "наименование",
    "Наименование проекта",
  ]);
  const owner = getValue(row, [
    "owner",
    "ответственный",
    "команда",
    "руководитель",
    "фио",
    "автор",
    "инициатор",
  ]);
  const grant = getValue(row, [
    "grant",
    "грант",
    "конкурс",
    "фонд",
    "программа",
    "Маршрут финансирования",
    "Ближайшее окно",
  ]);
  const deadline = toIsoDate(
    getValue(row, ["deadline", "дедлайн", "срок", "дата подачи", "срок подачи"])
  );

  return {
    id: getValue(row, ["id", "ID"]) || "",
    name: name || "Без названия",
    owner: owner || "Не назначен",
    direction: getValue(row, ["direction", "направление", "тип"]) || "",
    contour: getValue(row, ["contour", "контур"]) || "",
    priority: getValue(row, ["priority", "приоритет"]) || "",
    trl: getValue(row, ["trl", "утг", "УТГ", "col5"]) || "",
    stage: getValue(row, ["stage", "стадия"]) || "",
    status: normalizeStatus(getValue(row, ["status", "статус", "этап", "стадия"])),
    readiness: clampPercent(
      getValue(row, [
        "readiness",
        "готовность",
        "готовность %",
        "%",
        "процент готовности",
        "Готовность пакета",
        "col13",
      ])
    ),
    grant,
    deadline,
    budget: getValue(row, ["budget", "бюджет", "сумма", "запрашиваемая сумма", "Лимит / ориентир"]),
    nextStep: getValue(row, [
      "nextStep",
      "следующее действие",
      "действие",
      "задача",
      "следующий шаг",
      "комментарий",
      "Блокер / примечание",
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

function normalizeRegistryProject(row) {
  return normalizeProject({
    ID: getValue(row, ["ID", "id"]),
    Проект: getValue(row, ["Проект", "project"]),
    Направление: getValue(row, ["Направление", "direction"]),
    Контур: getValue(row, ["Контур", "contour"]),
    Приоритет: getValue(row, ["Приоритет", "priority"]),
    УТГ: getValue(row, ["УТГ", "trl", "col5"]),
    Стадия: getValue(row, ["Стадия", "stage"]),
    Ответственный: getValue(row, ["Ответственный", "owner"]),
    "Маршрут финансирования": getValue(row, ["Маршрут финансирования", "funding", "grant"]),
    "Лимит / ориентир": getValue(row, ["Лимит / ориентир", "limit", "budget"]),
    "Следующее действие": getValue(row, ["Следующее действие", "nextAction", "nextStep"]),
    Срок: getValue(row, ["Срок", "deadline"]),
    "Готовность пакета": getValue(row, ["Готовность пакета", "readiness", "col13"]),
    Статус: getValue(row, ["Статус", "status"]),
    "Блокер / примечание": getValue(row, ["Блокер / примечание", "note"]),
  });
}

function normalizeGrant(row) {
  return {
    route: getValue(row, ["Маршрут", "route"]) || "",
    operator: getValue(row, ["Оператор", "operator"]) || "",
    purpose: getValue(row, ["Для чего подходит", "purpose"]) || "",
    applicant: getValue(row, ["Кто подает", "applicant"]) || "",
    funding: getValue(row, ["Финансирование", "funding"]) || "",
    window: getValue(row, ["Окно / статус на 27.04.2026", "Окно / статус", "window"]) || "",
    projects: getValue(row, ["Проекты из реестра", "projects"]) || "",
    firstStep: getValue(row, ["Что подготовить первым", "firstStep"]) || "",
    source: getValue(row, ["Источник", "source"]) || "",
    checked: getValue(row, ["Дата проверки", "checked"]) || "",
  };
}

function normalizePackage(row) {
  return {
    id: getValue(row, ["ID", "id"]) || "",
    project: getValue(row, ["Проект", "project"]) || "",
    route: getValue(row, ["Маршрут", "route"]) || "",
    owner: getValue(row, ["Ответственный", "owner"]) || "",
    passport: getValue(row, ["Паспорт", "passport"]) || "",
    problem: getValue(row, ["Проблема и эффект", "problem"]) || "",
    mvp: getValue(row, ["MVP / прототип", "MVP", "mvp"]) || "",
    pilot: getValue(row, ["Пилот / письма", "pilot"]) || "",
    estimate: getValue(row, ["Смета", "estimate"]) || "",
    presentation: getValue(row, ["Презентация", "presentation"]) || "",
    legal: getValue(row, ["Юрконтур", "legal"]) || "",
    readiness: getValue(row, ["Готовность", "readiness", "col11"]) || "",
    nextStep: getValue(row, ["Следующий шаг", "nextStep"]) || "",
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
    script.src = `${GVIZ_URL}?gid=${SHEET.gid}&headers=1&tqx=responseHandler:${callback}&cacheBust=${Date.now()}`;
    document.head.append(script);
  });
}

function loadGridRows(gid) {
  return new Promise((resolve, reject) => {
    const callback = `rgsuGridCallback_${gid}_${Date.now()}`;
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

      resolve((data.table.rows || []).map((row) => (row.c || []).map(gvizValue)));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("sheet unavailable"));
    };
    script.src = `${GVIZ_URL}?gid=${gid}&headers=0&tqx=responseHandler:${callback}&cacheBust=${Date.now()}`;
    document.head.append(script);
  });
}

function tableFromGrid(rows, headerIndex = 2) {
  const headers = (rows[headerIndex] || []).map((header, index) => String(header || `col${index}`).trim());
  return rows
    .slice(headerIndex + 1)
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
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

function showToast(message, type = "") {
  els.toast.textContent = message;
  els.toast.classList.toggle("is-error", type === "error");
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 3600);
}

function setConfirmError(message = "") {
  els.confirmError.textContent = message;
  els.confirmCode.setAttribute("aria-invalid", message ? "true" : "false");
}

function populateDirections() {
  const current = state.direction;
  const directions = Array.from(new Set(state.projects.map((project) => project.direction).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ru")
  );
  els.direction.innerHTML = '<option value="all">Все направления</option>';
  directions.forEach((direction) => {
    const option = document.createElement("option");
    option.value = direction;
    option.textContent = direction;
    els.direction.append(option);
  });
  els.direction.value = directions.includes(current) ? current : "all";
  state.direction = els.direction.value;
}

async function loadProjects() {
  setSyncState("Загружаю данные из Google Таблицы...");
  const localProjects = loadLocalProjects().map(normalizeProject);

  try {
    const [projectRows, grantRows, packageRows] = await Promise.all([
      loadGridRows(SHEETS.projects),
      loadGridRows(SHEETS.grants),
      loadGridRows(SHEETS.packages),
    ]);
    const projects = tableFromGrid(projectRows).map(normalizeRegistryProject).filter((project) => project.name && project.name !== "Без названия");
    state.grants = tableFromGrid(grantRows).map(normalizeGrant).filter((grant) => grant.route);
    state.packages = tableFromGrid(packageRows).map(normalizePackage).filter((item) => item.project || item.id);
    state.grantWindows = state.grants.map((grant) => ({
      name: grant.route,
      deadline: toIsoDate(grant.window),
      appliesTo: grant.purpose || grant.projects,
      nextStep: grant.firstStep,
      source: grant.source,
    }));
    state.plan = [];
    state.directions = [];
    state.summary = {};
    state.projects = mergeProjects(projects, localProjects);
    populateDirections();
    setSyncState(
      `Связано с Google Таблицей: ${projects.length} проектов, ${state.grants.length} грантов, ${state.packages.length} пакетов подачи. Локальный буфер: ${localProjects.length}.`,
      "ok"
    );
  } catch {
    try {
      const sheetData = parseSheetData(await loadSheetRows());
      state.grantWindows = sheetData.grantWindows;
      state.plan = sheetData.plan;
      state.directions = sheetData.directions;
      state.grants = sheetData.grantWindows.map((grant) => ({
        route: grant.name,
        purpose: grant.appliesTo,
        firstStep: grant.nextStep,
        source: grant.source,
      }));
      state.packages = [];
      state.summary = sheetData.summary;
      state.projects = mergeProjects(sheetData.projects, localProjects);
      populateDirections();
      setSyncState(
        `Связано с Google Таблицей: ${sheetData.projects.length} проектов, ${sheetData.grantWindows.length} грантовых окон. Локальный буфер: ${localProjects.length}.`,
        "ok"
      );
    } catch {
      state.grants = [];
      state.packages = [];
      state.grantWindows = [];
      state.plan = [];
      state.directions = [];
      state.summary = {};
      state.projects = mergeProjects(localProjects, fallbackProjects);
      populateDirections();
      setSyncState(
        "Таблица временно недоступна. Показаны локальные и демонстрационные проекты.",
        "error"
      );
    }
  }

  render();
}

function filteredProjects() {
  const query = normalizeKey(state.query);
  return state.projects
    .filter((project) => {
      const haystack = normalizeKey(
        `${project.name} ${project.owner} ${project.direction} ${project.priority} ${project.trl} ${project.grant} ${project.nextStep} ${project.status}`
      );
      const matchesQuery = !query || haystack.includes(query);
      const matchesDirection = state.direction === "all" || project.direction === state.direction;
      const matchesStatus = state.status === "all" || project.status === state.status;
      const due = daysUntil(project.deadline);
      const matchesDeadline =
        state.deadline === "all" ||
        (state.deadline === "missing" && !project.deadline) ||
        (state.deadline !== "missing" && due >= 0 && due <= Number(state.deadline));
      const matchesPreset =
        state.preset === "all" ||
        (state.preset === "urgent" && due >= 0 && due <= 30) ||
        (state.preset === "ready" && (packageReadiness(project) >= 70 || project.status === "Готов к гранту")) ||
        (state.preset === "risks" && Boolean(projectRisk(project))) ||
        (state.preset === "high" && project.priority === "Высокий");
      return matchesQuery && matchesDirection && matchesStatus && matchesDeadline && matchesPreset;
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

function projectScore(project) {
  let score = project.readiness;
  if (project.priority === "Высокий") score += 22;
  if (project.trl && Number(project.trl) >= 5) score += 12;
  if (project.owner && project.owner !== "Не назначен") score += 8;
  if (project.grant) score += 8;
  if (project.nextStep) score += 6;
  const due = daysUntil(project.deadline);
  if (due !== Infinity && due <= 30) score += 10;
  if (projectRisk(project)) score -= 12;
  return Math.max(0, Math.min(140, score));
}

function projectTier(project) {
  const due = daysUntil(project.deadline);
  if (due !== Infinity && due <= 30 && project.readiness >= 45) return "Подача сейчас";
  if (project.readiness >= 70 || project.status === "Готов к гранту") return "Готовить пакет";
  if (projectRisk(project)) return "Нужны решения";
  return "Развитие";
}

function packageByProject(project) {
  return state.packages.find((item) => item.id && project.id && item.id === project.id)
    || state.packages.find((item) => normalizeKey(item.project) === normalizeKey(project.name))
    || null;
}

function packageReadiness(project) {
  const pack = packageByProject(project);
  return pack ? clampPercent(pack.readiness) : project.readiness;
}

function leadershipDecision(project) {
  const pack = packageByProject(project);
  if (!project.owner || project.owner === "Не назначен") return "Назначить ответственного и владельца пакета";
  if (!project.grant) return "Выбрать грантовый маршрут";
  if (!project.deadline) return "Зафиксировать окно подачи";
  if (pack && packageReadiness(project) < 45) return "Дать поручение на паспорт, смету и письма пилотов";
  if (daysUntil(project.deadline) <= 14 && project.readiness < 70) return "Решить: срочная упаковка или перенос подачи";
  if (project.priority === "Высокий" && project.readiness >= 50) return "Подтвердить приоритет и ресурс на упаковку";
  return project.nextStep || "Назначить следующий шаг";
}

function renderTable(projects) {
  els.projectRows.replaceChildren();
  if (!projects.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty-state";
    cell.textContent = "Проектов по выбранным фильтрам нет.";
    row.append(cell);
    els.projectRows.append(row);
    return;
  }

  projects.forEach((project) => {
    const row = document.createElement("tr");
    const due = daysUntil(project.deadline);
    if (projectRisk(project)) row.classList.add("is-risk");
    if (due >= 0 && due <= 30) row.classList.add("is-urgent");
    if (packageReadiness(project) >= 70 || project.status === "Готов к гранту") row.classList.add("is-ready");

    const nameCell = document.createElement("td");
    const nameWrap = document.createElement("div");
    nameWrap.className = "project-name";
    nameWrap.append(createText("strong", "", project.name));
    nameWrap.append(createText("small", "muted", project.budget || "Бюджет не указан"));
    nameCell.append(nameWrap);

    const ownerCell = createText("td", "", project.owner);
    const directionCell = createText("td", "", project.direction || "Не указано");

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

    row.append(nameCell, directionCell, ownerCell, statusCell, grantCell, deadlineCell, readinessCell, nextCell);
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
  card.querySelector(".project-meta").textContent = [
    project.direction,
    project.priority ? `приоритет: ${project.priority}` : "",
    project.trl ? `УТГ ${project.trl}` : "",
    project.owner,
    project.budget,
  ].filter(Boolean).join(" · ");
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

function packageReady(value) {
  const text = normalizeKey(value);
  return Boolean(text && !["нет", "no", "-", "0", "не готово"].includes(text));
}

function renderPackages() {
  els.packageRows.replaceChildren();
  els.packageList.replaceChildren();

  if (!state.packages.length) {
    const row = document.createElement("tr");
    const cell = createText("td", "empty-state", "Пакет подачи пока не найден в Google Таблице.");
    cell.colSpan = 10;
    row.append(cell);
    els.packageRows.append(row);
    els.packageList.append(createText("div", "empty-state", "Пакет подачи пока не найден в Google Таблице."));
    return;
  }

  state.packages.forEach((item) => {
    const row = document.createElement("tr");
    [
      item.project,
      item.route,
      item.owner,
      item.passport,
      item.mvp,
      item.pilot,
      item.estimate,
      item.presentation,
      item.readiness,
      item.nextStep,
    ].forEach((value) => row.append(createText("td", value ? "" : "muted", value || "Не указано")));
    els.packageRows.append(row);

    const card = document.createElement("article");
    card.className = "package-card";
    card.append(createText("h3", "", item.project || "Без названия"));
    card.append(createText("p", "muted", [item.route, item.owner, item.readiness].filter(Boolean).join(" · ") || "Маршрут не указан"));
    const checks = document.createElement("div");
    checks.className = "package-checks";
    [
      ["Паспорт", item.passport],
      ["MVP", item.mvp],
      ["Пилот", item.pilot],
      ["Смета", item.estimate],
      ["Презентация", item.presentation],
    ].forEach(([label, value]) => checks.append(createText("span", `check-pill ${packageReady(value) ? "is-ready" : ""}`.trim(), label)));
    card.append(checks);
    card.append(createText("p", "muted", item.nextStep || "Следующий шаг не указан"));
    els.packageList.append(card);
  });
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
  const grants = state.grants.length
    ? state.grants.map((grant) => ({
        name: grant.route,
        deadline: toIsoDate(grant.window),
        appliesTo: grant.purpose || grant.projects,
        nextStep: grant.firstStep,
        source: grant.source,
        window: grant.window,
        operator: grant.operator,
        funding: grant.funding,
      }))
    : state.grantWindows;

  if (!grants.length) {
    els.grantWindows.append(createText("div", "empty-state", "Грантовые окна пока не найдены в таблице."));
    return;
  }

  grants
    .slice()
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
    .forEach((grant) => {
      const card = document.createElement("article");
      card.className = "grant-window";
      card.append(grant.deadline ? renderDeadlineBadge({ deadline: grant.deadline }) : createText("span", "deadline-badge is-missing", grant.window || "Окно уточнить"));
      card.append(createText("strong", "", grant.name));
      card.append(createText("p", "", [grant.operator, grant.funding].filter(Boolean).join(" · ") || grant.appliesTo || "Направление не указано"));
      if (grant.appliesTo) card.append(createText("p", "", grant.appliesTo));
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

function renderExecutiveSummary(projects) {
  els.executiveSummary.replaceChildren();
  const urgent = projects.filter((project) => {
    const due = daysUntil(project.deadline);
    return due !== Infinity && due <= 30;
  });
  const top = projects.slice().sort((a, b) => projectScore(b) - projectScore(a))[0];
  const weakPackages = projects.filter((project) => packageReadiness(project) > 0 && packageReadiness(project) < 45);
  const highPriority = projects.filter((project) => project.priority === "Высокий");
  const decisions = projects.filter((project) => leadershipDecision(project)).slice(0, 5);
  const items = [
    {
      label: "Фокус показа",
      title: top ? top.name : "Портфель загружен",
      text: top ? `${top.direction || "направление не указано"} · ${top.grant || "маршрут уточнить"}` : "Данные появятся после подключения таблицы.",
    },
    {
      label: "Срочные окна",
      title: `${urgent.length} проектов`,
      text: urgent[0] ? `Ближайший дедлайн: ${formatDate(urgent[0].deadline)}` : "Нет дедлайнов в ближайшие 30 дней.",
    },
    {
      label: "Нужна доупаковка",
      title: `${weakPackages.length} пакетов`,
      text: weakPackages.length ? "Слабые места: паспорт, смета, письма пилотов, презентация." : "Критичных пробелов по пакетам не видно.",
    },
    {
      label: "Приоритет руководства",
      title: `${highPriority.length} проектов`,
      text: decisions[0] ? leadershipDecision(decisions[0]) : "Можно перейти к плановому контролю.",
    },
  ];

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "executive-item";
    card.append(createText("span", "", item.label));
    card.append(createText("strong", "", item.title));
    card.append(createText("p", "", item.text));
    els.executiveSummary.append(card);
  });
}

function renderPortfolioMap(projects) {
  els.portfolioMap.replaceChildren();
  const groups = ["Подача сейчас", "Готовить пакет", "Нужны решения", "Развитие"];
  groups.forEach((group) => {
    const items = projects
      .filter((project) => projectTier(project) === group)
      .sort((a, b) => projectScore(b) - projectScore(a));
    const column = document.createElement("section");
    column.className = "portfolio-column";
    const heading = document.createElement("h3");
    heading.append(createText("strong", "", group));
    heading.append(createText("span", "", String(items.length)));
    column.append(heading);

    if (!items.length) {
      column.append(createText("div", "empty-state", "Нет проектов"));
    } else {
      items.slice(0, 5).forEach((project) => {
        const item = document.createElement("article");
        item.className = "portfolio-project";
        item.append(createText("strong", "", project.name));
        item.append(createText("small", "", [
          project.direction,
          project.deadline ? formatDate(project.deadline) : "",
          `${packageReadiness(project)}% пакет`,
        ].filter(Boolean).join(" · ")));
        column.append(item);
      });
    }

    els.portfolioMap.append(column);
  });
}

function renderLeadershipActions(projects) {
  els.leadershipActions.replaceChildren();
  const actions = projects
    .slice()
    .sort((a, b) => projectScore(b) - projectScore(a))
    .slice(0, 6);

  if (!actions.length) {
    els.leadershipActions.append(createText("div", "empty-state", "После загрузки данных появятся поручения."));
    return;
  }

  actions.forEach((project, index) => {
    const item = document.createElement("article");
    item.className = "leadership-item";
    item.append(createText("span", "leadership-number", String(index + 1)));
    const text = document.createElement("div");
    text.append(createText("strong", "", project.name));
    text.append(createText("small", "", leadershipDecision(project)));
    item.append(text);
    els.leadershipActions.append(item);
  });
}

function renderInsightCards(container, items) {
  container.replaceChildren();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "insight-card";
    card.append(createText("span", "", item.label));
    card.append(createText("strong", "", item.value));
    card.append(createText("small", "", item.text));
    container.append(card);
  });
}

function renderFilterSummary(projects) {
  els.filterSummary.replaceChildren();
  const presetLabels = {
    urgent: "Быстрый фильтр: срочно",
    ready: "Быстрый фильтр: к подаче",
    risks: "Быстрый фильтр: риски",
    high: "Быстрый фильтр: высокий приоритет",
  };
  const chips = [
    state.preset !== "all" ? { text: presetLabels[state.preset] || state.preset } : null,
    { text: `${projects.length} из ${state.projects.length || 0} проектов`, strong: true },
    state.direction !== "all" ? { text: `Направление: ${state.direction}` } : null,
    state.status !== "all" ? { text: `Статус: ${state.status}` } : null,
    state.deadline !== "all" ? { text: state.deadline === "missing" ? "Без дедлайна" : `Дедлайн: ${state.deadline} дней` } : null,
    state.query ? { text: `Поиск: ${state.query}` } : null,
  ].filter(Boolean);

  chips.forEach((chip) => {
    const node = createText("span", `summary-chip ${chip.strong ? "is-strong" : ""}`.trim(), chip.text);
    els.filterSummary.append(node);
  });
}

function renderProjectInsights(projects) {
  const high = projects.filter((project) => project.priority === "Высокий").length;
  const avgReadiness = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.readiness, 0) / projects.length)
    : 0;
  const topDirection = Object.entries(projects.reduce((acc, project) => {
    const key = project.direction || "Без направления";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];

  renderInsightCards(els.projectInsights, [
    { label: "Высокий приоритет", value: `${high}`, text: "Проекты, которые стоит держать в фокусе руководства." },
    { label: "Средняя готовность", value: `${avgReadiness}%`, text: "Оценка готовности пакета по отфильтрованной выборке." },
    { label: "Крупное направление", value: topDirection ? topDirection[0] : "-", text: topDirection ? `${topDirection[1]} проектов в выборке.` : "Появится после загрузки данных." },
  ]);
}

function renderGrantInsights() {
  const withSources = state.grants.filter((grant) => grant.source).length;
  const withProjects = state.grants.filter((grant) => grant.projects).length;
  const firstStep = state.grants.find((grant) => grant.firstStep)?.firstStep || "Подготовить паспорт, MVP, смету и письма пилотов";

  renderInsightCards(els.grantInsights, [
    { label: "Маршрутов", value: `${state.grants.length}`, text: "Актуальные грантовые и конкурсные направления." },
    { label: "Связаны с проектами", value: `${withProjects}`, text: "Маршруты, где уже указаны проекты из реестра." },
    { label: "Первый шаг", value: "Упаковка", text: firstStep },
  ]);
}

function renderPackageSummary() {
  const average = state.packages.length
    ? Math.round(state.packages.reduce((sum, item) => sum + clampPercent(item.readiness), 0) / state.packages.length)
    : 0;
  const weak = state.packages.filter((item) => clampPercent(item.readiness) < 45).length;
  const ready = state.packages.filter((item) => clampPercent(item.readiness) >= 70).length;

  renderInsightCards(els.packageSummary, [
    { label: "Средняя готовность", value: `${average}%`, text: "Средняя готовность пакетов подачи." },
    { label: "Слабые пакеты", value: `${weak}`, text: "Нужны паспорт, письма, смета или презентация." },
    { label: "Почти готовы", value: `${ready}`, text: "Можно быстро довести до подачи." },
  ]);
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
  const ready = projects.filter((project) => project.readiness >= 70 || project.status === "Готов к гранту");
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

function renderPortfolioHealth(projects) {
  if (!projects.length) {
    els.portfolioHealth.textContent = "0%";
    els.portfolioHealthBar.style.width = "0%";
    els.portfolioHealthText.textContent = "Нет проектов в выбранном срезе.";
    return;
  }

  const avgReadiness = projects.reduce((sum, project) => sum + packageReadiness(project), 0) / projects.length;
  const readyRate = projects.filter((project) => packageReadiness(project) >= 70 || project.status === "Готов к гранту").length / projects.length;
  const riskRate = projects.filter((project) => projectRisk(project)).length / projects.length;
  const urgentWithReadiness = projects.filter((project) => {
    const due = daysUntil(project.deadline);
    return due >= 0 && due <= 30 && packageReadiness(project) >= 60;
  }).length / projects.length;
  const score = Math.round((avgReadiness * 0.5) + (readyRate * 25) + ((1 - riskRate) * 15) + (urgentWithReadiness * 10));

  els.portfolioHealth.textContent = `${score}%`;
  els.portfolioHealthBar.style.width = `${Math.max(4, score)}%`;
  els.portfolioHealthText.textContent =
    score >= 70
      ? "Портфель выглядит убедительно для подачи и разговора с руководством."
      : score >= 45
        ? "Есть рабочая база: закройте риски, дедлайны и недостающие пакеты."
        : "Нужно быстро назначить владельцев, гранты и следующие действия.";
}

function setQuickPreset(preset) {
  state.preset = preset;
  els.quickFilters.forEach((button) => {
    const active = button.dataset.preset === preset;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function buildBrief(projects) {
  const list = projects.length ? projects : state.projects;
  const urgent = list.filter((project) => {
    const due = daysUntil(project.deadline);
    return due >= 0 && due <= 30;
  });
  const ready = list.filter((project) => packageReadiness(project) >= 70 || project.status === "Готов к гранту");
  const risks = list.filter((project) => projectRisk(project));
  const top = [...list].sort((a, b) => projectScore(b) - projectScore(a))[0];
  const decisions = [...list]
    .sort((a, b) => projectScore(b) - projectScore(a))
    .slice(0, 3)
    .map((project, index) => `${index + 1}. ${project.name}: ${leadershipDecision(project)}`)
    .join("\n");

  return [
    "Технопарк РГСУ: управленческая сводка",
    `Проектов в срезе: ${list.length}`,
    `Срочных дедлайнов до 30 дней: ${urgent.length}`,
    `Готовы к подаче: ${ready.length}`,
    `Требуют решения: ${risks.length}`,
    top ? `Главный приоритет: ${top.name} (${top.readiness}% готовности)` : "Главный приоритет: не определен",
    "",
    "Решения на ближайшую планерку:",
    decisions || "Нет проектов в выбранном срезе.",
  ].join("\n");
}

async function copyBriefToClipboard() {
  const brief = buildBrief(filteredProjects());
  try {
    await navigator.clipboard.writeText(brief);
    showToast("Сводка скопирована. Можно вставить в письмо или доклад.");
  } catch (error) {
    console.info(brief);
    showToast("Браузер не дал доступ к буферу. Сводка выведена в консоль.", "error");
  }
}

function render() {
  const projects = filteredProjects();
  renderFilterSummary(projects);
  renderMetrics(projects);
  renderPortfolioHealth(projects);
  renderExecutiveSummary(projects);
  renderTimeline(projects);
  renderActions(projects);
  renderPortfolioMap(projects);
  renderLeadershipActions(projects);
  renderProjectInsights(projects);
  renderGrantInsights();
  renderPackageSummary();
  renderTable(projects);
  renderMobileCards(projects);
  renderPackages();
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
    body: JSON.stringify({
      action: "add_project",
      ...project,
      project: project.name,
      funding: project.grant,
      nextAction: project.nextStep,
    }),
  });

  return true;
}

function switchView(viewId) {
  els.tabs.forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId));
  els.views.forEach((view) => view.classList.toggle("active-section", view.id === viewId));
}

function resetFilters() {
  state.query = "";
  state.direction = "all";
  state.status = "all";
  state.deadline = "all";
  setQuickPreset("all");
  els.search.value = "";
  els.direction.value = "all";
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
  els.direction.addEventListener("change", (event) => {
    state.direction = event.target.value;
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
  els.copyBrief.addEventListener("click", copyBriefToClipboard);
  els.quickFilters.forEach((button) => {
    button.addEventListener("click", () => {
      setQuickPreset(button.dataset.preset || "all");
      render();
    });
  });
  els.clearFilters.addEventListener("click", resetFilters);
  els.presentationMode.addEventListener("click", () => {
    document.body.classList.toggle("presentation");
    const enabled = document.body.classList.contains("presentation");
    els.presentationMode.textContent = enabled ? "Обычный режим" : "Режим доклада";
    showToast(enabled ? "Включен режим доклада." : "Включен обычный режим.");
  });

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
