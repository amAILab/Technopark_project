/*
  Компактная управленческая панель Технопарка РГСУ.
  Структура Google Sheets не меняется: сайт только читает существующие листы
  и отправляет пожелания НТС в существующий Apps Script.
*/

const CONFIG = {
  sheetId: "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60",
  sheets: { projects: "150570752", grants: "1500721586", nts: "202604270" },
  sheetUrl: "https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit",
  scriptUrl: "https://script.google.com/macros/s/AKfycbwzbWEjEpb1ySylb--7VhqEHvaC05WB5jhcw-8xpAj811bIJurVB3CW-ElDsoeKnWOA/exec",
  fallbackUrl: "data/fallback-dashboard.json",
  formKey: "NTS_TECHNOPARK_2026",
  juneStart: "2026-06-01",
};

const FUNNEL_STAGES = [
  { name: "Идея", hint: "Зафиксировать проблему, эффект и адресата." },
  { name: "Проработка", hint: "Проверить аналоги, ограничения и реализуемость." },
  { name: "ТЗ", hint: "Подготовить паспорт проекта и критерии результата." },
  { name: "Команда", hint: "Назначить ответственного, исполнителей и экспертов." },
  { name: "Партнер", hint: "Получить заказчика, письмо или пилотную площадку." },
  { name: "Финмодель", hint: "Собрать бюджет, смету и календарный план." },
  { name: "Грант", hint: "Выбрать окно, оператора и комплект документов." },
  { name: "Подача", hint: "Собрать пакет и отправить заявку." },
  { name: "Реализация", hint: "Вести сроки, бюджет и отчетные материалы." },
  { name: "Результат", hint: "Оформить внедрение, акты, публикации и отчет." },
];

const state = {
  projects: [],
  grants: [],
  feedback: [],
  activeFunnelStage: 0,
  filters: { query: "", status: "all", owner: "all", readiness: "all", risk: "all" },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const els = {
  syncDot: $("#syncDot"), syncStatus: $("#syncStatus"), lastUpdated: $("#lastUpdated"), refreshData: $("#refreshData"),
  menuToggle: $("#menuToggle"), mainNav: $("#mainNav"), navLinks: $$(".main-nav a"),
  kpiTotal: $("#kpiTotal"), kpiActive: $("#kpiActive"), kpiReady: $("#kpiReady"), kpiRisks: $("#kpiRisks"), kpiFeedback: $("#kpiFeedback"),
  actionBoard: $("#actionBoard"), qualityGrid: $("#qualityGrid"), gapList: $("#gapList"),
  searchInput: $("#searchInput"), statusFilter: $("#statusFilter"), ownerFilter: $("#ownerFilter"), readinessFilter: $("#readinessFilter"), riskFilter: $("#riskFilter"),
  projectTable: $("#projectTable"), grantGrid: $("#grantGrid"), funnelBoard: $("#funnelBoard"), funnelDetails: $("#funnelDetails"),
  ntsAgenda: $("#ntsAgenda"), decisionList: $("#decisionList"), ntsForm: $("#ntsForm"), formNote: $("#formNote"), feedbackProject: $("#feedbackProject"), feedbackFeed: $("#feedbackFeed"),
  toast: $("#toast"),
};

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

function debounce(fn, delay = 180) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function getValue(row, names) {
  const map = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalize(key), value]));
  for (const name of names) {
    const value = map[normalize(name)];
    if (value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
}

function clampPercent(value) {
  const match = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  if (!match) return null;
  return Math.max(0, Math.min(100, Math.round(Number(match[0]))));
}

function toIsoDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const gviz = raw.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (gviz) return `${gviz[1]}-${String(Number(gviz[2]) + 1).padStart(2, "0")}-${String(gviz[3]).padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "нет срока";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`));
}

function daysUntil(iso) {
  if (!iso) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

function setSync(message, type = "loading") {
  if (!els.syncStatus || !els.syncDot) return;
  els.syncStatus.textContent = message;
  els.syncDot.classList.toggle("ok", type === "ok");
  els.syncDot.classList.toggle("error", type === "error");
}

function setUpdatedNow() {
  if (!els.lastUpdated) return;
  els.lastUpdated.textContent = `Обновлено: ${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
}

function showToast(message, type = "") {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.toggle("error", type === "error");
  els.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("is-visible"), 3500);
}

function gvizCell(cell) { return cell ? cell.f || cell.v || "" : ""; }

function findHeaderIndex(rows, requiredWords) {
  let bestIndex = 0;
  let bestScore = -1;
  rows.forEach((row, index) => {
    const text = normalize(row.join(" "));
    const score = requiredWords.reduce((sum, word) => sum + (text.includes(normalize(word)) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestIndex;
}

function loadSheet(gid, requiredWords = ["проект"]) {
  return new Promise((resolve, reject) => {
    const callback = `callback_${gid}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    window[callback] = (payload) => {
      delete window[callback];
      script.remove();
      if (!payload || payload.status === "error") { reject(new Error("Google Таблица временно недоступна")); return; }
      const rawRows = (payload.table.rows || []).map((row) => (row.c || []).map(gvizCell));
      const headerIndex = findHeaderIndex(rawRows, requiredWords);
      const headers = (rawRows[headerIndex] || []).map((h, i) => String(h || `col${i}`).trim());
      const data = rawRows.slice(headerIndex + 1).filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i] || ""])));
      resolve(data);
    };
    script.onerror = () => { delete window[callback]; script.remove(); reject(new Error("Не удалось загрузить данные Google Таблицы")); };
    script.src = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?gid=${gid}&headers=0&tqx=responseHandler:${callback}&cacheBust=${Date.now()}`;
    document.head.append(script);
  });
}

async function loadFallbackData() {
  const response = await fetch(`${CONFIG.fallbackUrl}?cacheBust=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Локальная демо-копия данных недоступна");
  const data = await response.json();
  return {
    projects: (data.projects || []).map(normalizeProject).filter((project) => project.name && project.name !== "без названия"),
    grants: (data.grants || []).map(normalizeGrant).filter((grant) => grant.route),
    feedback: (data.feedback || []).map(normalizeFeedback).filter((item) => item.message || item.author || item.project).reverse(),
    generatedAt: data.generatedAt || "",
  };
}

const cache = {
  save(key, data) { try { localStorage.setItem(`technopark_${key}`, JSON.stringify({ data, timestamp: Date.now() })); } catch (error) { console.warn("Не удалось сохранить кеш", error); } },
  load(key, maxAge = 3600000) {
    try {
      const item = localStorage.getItem(`technopark_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > maxAge) { localStorage.removeItem(`technopark_${key}`); return null; }
      return parsed.data;
    } catch (error) { console.warn("Не удалось прочитать кеш", error); return null; }
  },
  clear() { try { Object.keys(localStorage).filter((key) => key.startsWith("technopark_")).forEach((key) => localStorage.removeItem(key)); } catch (error) { console.warn("Не удалось очистить кеш", error); } },
};

function normalizeStatus(value) {
  const key = normalize(value);
  if (!key) return "требует уточнения";
  if (key.includes("готов") || key.includes("упаков")) return "готов к гранту";
  if (key.includes("подан")) return "подан на грант";
  if (key.includes("реализ")) return "в реализации";
  if (key.includes("приостан")) return "приостановлен";
  if (key.includes("нтс") || key.includes("решен")) return "требует решения НТС";
  if (key.includes("заверш")) return "завершен";
  if (key.includes("тз")) return "есть ТЗ";
  if (key.includes("проработ") || key.includes("работ")) return "на проработке";
  if (key.includes("иде")) return "идея";
  return String(value || "требует уточнения").trim().toLowerCase();
}

function hasText(value) { return normalize(value).length > 0; }
function hasAnyText(...values) { return values.some((value) => hasText(value)); }

function estimateReadiness(project) {
  let score = 0;
  if (hasAnyText(project.description, project.name) && project.name !== "без названия") score += 10;
  if (normalize([project.stage, project.status, project.note].join(" ")).includes("тз")) score += 20;
  if (project.owner) score += 10;
  if (project.grant) score += 15;
  if (project.budget) score += 15;
  if (project.deadline) score += 10;
  if (hasAnyText(project.partner, project.customer)) score += 10;
  if (project.nextStep) score += 10;
  return Math.max(0, Math.min(100, score));
}

function normalizeProject(row, index) {
  const explicitReadiness = clampPercent(getValue(row, ["Готовность пакета", "Готовность", "Готовность %", "readiness", "Процент готовности"]));
  const project = {
    uid: `project-${index}`,
    raw: row,
    id: getValue(row, ["ID", "id", "№", "Номер"]) || String(index + 1),
    name: getValue(row, ["Проект", "Название", "Наименование", "Наименование проекта", "project"]) || "без названия",
    description: getValue(row, ["Описание", "Краткое описание", "Суть проекта", "Аннотация", "description"]),
    direction: getValue(row, ["Направление", "direction", "Тип", "Сфера"]),
    contour: getValue(row, ["Контур", "contour"]),
    priority: getValue(row, ["Приоритет", "priority"]),
    trl: getValue(row, ["УТГ", "TRL", "trl"]),
    stage: getValue(row, ["Стадия", "Этап", "stage"]),
    owner: getValue(row, ["Ответственный", "Команда", "Руководитель", "Инициатор", "owner"]),
    team: getValue(row, ["Команда", "Исполнители", "team"]),
    partner: getValue(row, ["Партнер", "Партнеры", "partner"]),
    customer: getValue(row, ["Заказчик", "Площадка", "customer"]),
    grant: getValue(row, ["Маршрут финансирования", "Ближайшее окно", "Грант", "Конкурс", "grant"]),
    window: getValue(row, ["Ближайшее окно", "Окно", "window"]),
    budget: getValue(row, ["Лимит / ориентир", "Бюджет", "Сумма", "Смета", "budget"]),
    nextStep: getValue(row, ["Следующее действие", "Следующий шаг", "Действие", "Задача", "nextStep"]),
    deadline: toIsoDate(getValue(row, ["Срок", "Дедлайн", "Дата подачи", "Срок подачи", "deadline"])),
    explicitReadiness,
    readiness: explicitReadiness,
    status: normalizeStatus(getValue(row, ["Статус", "status", "Состояние"])),
    note: getValue(row, ["Блокер / примечание", "Примечание", "Комментарий", "Риск", "note"]),
    nts: getValue(row, ["Решение НТС", "НТС", "Комментарий НТС"]),
  };
  project.readiness = project.explicitReadiness ?? estimateReadiness(project);
  project.readinessIsCalculated = project.explicitReadiness === null;
  return project;
}

function normalizeGrant(row, index) {
  const windowText = getValue(row, ["Окно / статус на 27.04.2026", "Окно / статус", "Окно", "window", "Срок", "Дедлайн"]);
  return {
    uid: `grant-${index}`,
    route: getValue(row, ["Маршрут", "Грант", "Конкурс", "route"]),
    operator: getValue(row, ["Оператор", "operator"]),
    purpose: getValue(row, ["Для чего подходит", "purpose"]),
    applicant: getValue(row, ["Кто подает", "applicant"]),
    funding: getValue(row, ["Финансирование", "Сумма", "funding"]),
    window: windowText,
    deadline: toIsoDate(windowText),
    projects: getValue(row, ["Проекты из реестра", "projects"]),
    firstStep: getValue(row, ["Что подготовить первым", "Первый шаг", "firstStep"]),
    source: getValue(row, ["Источник", "Ссылка", "source"]),
  };
}

function normalizeFeedback(row, index) {
  return {
    uid: `feedback-${index}`,
    id: getValue(row, ["ID"]),
    date: getValue(row, ["Дата и время", "Дата"]),
    author: getValue(row, ["ФИО / автор", "Автор", "ФИО"]),
    role: getValue(row, ["Роль / организация", "Роль"]),
    type: getValue(row, ["Тип обращения", "Тип сообщения", "Категория"]),
    project: getValue(row, ["Связанный проект", "Проект"]),
    priority: getValue(row, ["Приоритет"]),
    message: getValue(row, ["Текст пожелания", "Текст сообщения", "Сообщение"]),
    status: getValue(row, ["Статус", "Статус обработки", "Статус рассмотрения"]),
  };
}

function isActiveProject(project) { return !["завершен", "приостановлен"].includes(project.status); }

function projectIssues(project) {
  const issues = [];
  if (!project.owner) issues.push({ label: "нет ответственного", severity: "high", action: "назначить ответственного" });
  if (project.explicitReadiness === null) issues.push({ label: "нет процента готовности", severity: "medium", action: "заполнить готовность пакета" });
  if (!project.grant) issues.push({ label: "нет грантового маршрута", severity: "high", action: "подобрать грант или конкурс" });
  if (!project.deadline) issues.push({ label: "нет срока", severity: "medium", action: "указать ближайший срок" });
  if (!project.nextStep) issues.push({ label: "нет следующего действия", severity: "medium", action: "задать следующий шаг" });
  const days = daysUntil(project.deadline);
  if (project.deadline && days < 0) issues.push({ label: "срок прошел", severity: "critical", action: "обновить дедлайн и статус" });
  if (project.deadline && days >= 0 && days <= 14) issues.push({ label: `дедлайн через ${days} дн.`, severity: "critical", action: "срочно собрать пакет" });
  if (normalize(project.status).includes("нтс")) issues.push({ label: "требует решения НТС", severity: "critical", action: "вынести на заседание НТС" });
  if (normalize(project.note).includes("риск") || normalize(project.note).includes("блок")) issues.push({ label: "есть риск / блокер", severity: "high", action: "разобрать блокер" });
  return issues;
}

function hasRisk(project) { return projectIssues(project).length > 0; }
function hasUnknown(project) { return !project.owner || project.explicitReadiness === null || !project.grant || !project.deadline || !project.nextStep; }
function topSeverity(issues) {
  if (issues.some((issue) => issue.severity === "critical")) return "critical";
  if (issues.some((issue) => issue.severity === "high")) return "high";
  if (issues.some((issue) => issue.severity === "medium")) return "medium";
  return "low";
}

function statusClass(status) {
  const key = normalize(status);
  if (key.includes("готов") || key.includes("реализ") || key.includes("подан")) return "good";
  if (key.includes("работ") || key.includes("тз") || key.includes("проработ")) return "info";
  if (key.includes("уточ") || key.includes("нтс") || key.includes("иде")) return "warn";
  if (key.includes("риск") || key.includes("приостан")) return "danger";
  return "neutral";
}

function readinessClass(project) {
  if (project.explicitReadiness === null) return "warn";
  if (project.readiness >= 70) return "good";
  if (project.readiness >= 40) return "info";
  return "danger";
}

function filteredProjects() {
  return state.projects.filter((project) => {
    const q = normalize(state.filters.query);
    const haystack = normalize([project.name, project.description, project.owner, project.status, project.grant, project.nextStep, project.note, project.direction].join(" "));
    if (q && !haystack.includes(q)) return false;
    if (state.filters.status !== "all" && project.status !== state.filters.status) return false;
    if (state.filters.owner !== "all" && (project.owner || "требует уточнения") !== state.filters.owner) return false;
    if (state.filters.readiness === "ready" && project.readiness < 70) return false;
    if (state.filters.readiness === "middle" && !(project.readiness >= 40 && project.readiness < 70)) return false;
    if (state.filters.readiness === "low" && !(project.readiness < 40)) return false;
    if (state.filters.readiness === "unknown" && project.explicitReadiness !== null) return false;
    if (state.filters.risk === "risk" && !hasRisk(project)) return false;
    if (state.filters.risk === "unknown" && !hasUnknown(project)) return false;
    return true;
  });
}

function renderKpi() {
  els.kpiTotal.textContent = state.projects.length;
  els.kpiActive.textContent = state.projects.filter(isActiveProject).length;
  els.kpiReady.textContent = state.projects.filter((project) => project.readiness >= 70 || project.status.includes("готов")).length;
  els.kpiRisks.textContent = state.projects.filter(hasRisk).length;
  if (els.kpiFeedback) els.kpiFeedback.textContent = state.feedback.length;
}

function renderFilters() {
  const statuses = Array.from(new Set(state.projects.map((project) => project.status).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const owners = Array.from(new Set(state.projects.map((project) => project.owner || "требует уточнения"))).sort((a, b) => a.localeCompare(b, "ru"));
  els.statusFilter.innerHTML = `<option value="all">Все статусы</option>${statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("")}`;
  els.ownerFilter.innerHTML = `<option value="all">Все ответственные</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`;
  els.feedbackProject.innerHTML = `<option value="">Ко всему портфелю</option>${state.projects.map((project) => `<option value="${escapeHtml(project.name)}">${escapeHtml(project.name)}</option>`).join("")}`;
}

function buildActionItems() {
  return state.projects.map((project) => {
    const issues = projectIssues(project);
    if (!issues.length) return null;
    const severity = topSeverity(issues);
    return { project, issues, severity, priority: severity === "critical" ? 0 : severity === "high" ? 1 : severity === "medium" ? 2 : 3, label: issues.map((issue) => issue.label).join(", "), action: issues[0].action };
  }).filter(Boolean).sort((a, b) => a.priority - b.priority || daysUntil(a.project.deadline) - daysUntil(b.project.deadline));
}

function renderActions() {
  const items = buildActionItems();
  if (!items.length) {
    els.actionBoard.innerHTML = `<div class="empty-state"><strong>Критических действий нет</strong><span>По текущим данным все обязательные поля заполнены.</span></div>`;
    return;
  }
  const grouped = ["critical", "high", "medium"].map((severity) => ({ severity, rows: items.filter((item) => item.severity === severity) })).filter((group) => group.rows.length);
  const severityLabel = { critical: "Критично", high: "Важно", medium: "Планово" };
  els.actionBoard.innerHTML = `<div class="action-table">
    <div class="action-row action-head"><span>Приоритет</span><span>Проект</span><span>Проблема</span><span>Что сделать</span><span>Срок</span></div>
    ${grouped.map((group) => `<div class="action-group-title ${group.severity}">${severityLabel[group.severity]} · ${group.rows.length}</div>${group.rows.slice(0, 12).map((item) => `<div class="action-row ${item.severity}">
      <span><b class="dot ${item.severity}"></b>${item.severity === "critical" ? "срочно" : item.severity === "high" ? "важно" : "планово"}</span>
      <span><strong>${escapeHtml(item.project.name)}</strong><small>${escapeHtml(item.project.owner || "ответственный не указан")}</small></span>
      <span>${escapeHtml(item.label)}</span>
      <span>${escapeHtml(item.action)}</span>
      <span>${escapeHtml(formatDate(item.project.deadline))}</span>
    </div>`).join("")}`).join("")}
  </div>`;
}

function renderProjects() {
  const list = filteredProjects().sort((a, b) => Number(hasRisk(b)) - Number(hasRisk(a)) || daysUntil(a.deadline) - daysUntil(b.deadline));
  if (!list.length) {
    els.projectTable.innerHTML = `<tr><td colspan="8"><div class="empty-state"><strong>Нет проектов под выбранные фильтры</strong><span>Измените поиск или фильтры.</span></div></td></tr>`;
    return;
  }
  els.projectTable.innerHTML = list.map((project) => {
    const issues = projectIssues(project);
    const issueText = issues.length ? issues.map((issue) => issue.label).join(", ") : "рисков нет";
    const riskClass = issues.length ? topSeverity(issues) : "low";
    const readinessLabel = project.explicitReadiness === null ? `${project.readiness}% расчет` : `${project.readiness}%`;
    return `<tr class="project-row" data-project="${escapeHtml(project.uid)}">
      <td><button class="row-toggle" type="button" aria-label="Раскрыть паспорт проекта">+</button></td>
      <td><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.direction || project.stage || "направление не указано")}</small></td>
      <td>${escapeHtml(project.owner || "не указан")}</td>
      <td><span class="badge ${statusClass(project.status)}">${escapeHtml(project.status)}</span></td>
      <td>${escapeHtml(project.grant || "не выбран")}</td>
      <td>${escapeHtml(formatDate(project.deadline))}</td>
      <td><span class="readiness-mini"><span style="width:${project.readiness}%"></span></span><span class="badge ${readinessClass(project)}">${escapeHtml(readinessLabel)}</span></td>
      <td><span class="badge ${riskClass === "low" ? "good" : riskClass === "medium" ? "warn" : "danger"}">${escapeHtml(issueText)}</span></td>
    </tr>
    <tr class="project-detail-row" data-detail="${escapeHtml(project.uid)}"><td colspan="8"><div class="project-detail">
      <div><b>Описание</b><p>${escapeHtml(project.description || "Описание не заполнено.")}</p></div>
      <div><b>Следующее действие</b><p>${escapeHtml(project.nextStep || "Следующее действие не указано.")}</p></div>
      <div><b>Грантовый маршрут</b><p>${escapeHtml(project.grant || "Грантовый маршрут не выбран.")}</p></div>
      <div><b>Комментарий / риск</b><p>${escapeHtml(project.note || project.nts || "Комментарий не заполнен.")}</p></div>
    </div></td></tr>`;
  }).join("");
}

function renderQuality() {
  const total = Math.max(state.projects.length, 1);
  const checks = [
    { label: "Ответственные", count: state.projects.filter((p) => p.owner).length },
    { label: "Готовность", count: state.projects.filter((p) => p.explicitReadiness !== null).length },
    { label: "Грантовый маршрут", count: state.projects.filter((p) => p.grant).length },
    { label: "Срок", count: state.projects.filter((p) => p.deadline).length },
    { label: "Следующее действие", count: state.projects.filter((p) => p.nextStep).length },
  ];
  els.qualityGrid.innerHTML = checks.map((check) => {
    const percent = Math.round((check.count / total) * 100);
    return `<article class="quality-card"><div><span>${escapeHtml(check.label)}</span><strong>${check.count}/${state.projects.length}</strong></div><div class="quality-bar"><span style="width:${percent}%"></span></div><small>${percent}% заполнено</small></article>`;
  }).join("");
  const gaps = state.projects.flatMap((p) => {
    const missed = [];
    if (!p.owner) missed.push("ответственный");
    if (p.explicitReadiness === null) missed.push("готовность");
    if (!p.grant) missed.push("грант");
    if (!p.deadline) missed.push("срок");
    if (!p.nextStep) missed.push("следующее действие");
    return missed.length ? [{ project: p, missed }] : [];
  });
  els.gapList.innerHTML = gaps.length ? gaps.slice(0, 16).map((gap) => `<div class="gap-item"><strong>${escapeHtml(gap.project.name)}</strong><small>Заполнить: ${escapeHtml(gap.missed.join(", "))}</small></div>`).join("") : `<div class="empty-state compact-empty"><strong>Пробелов нет</strong><span>Основные поля заполнены.</span></div>`;
}

function resolveFunnelStage(project) {
  const text = normalize([project.stage, project.status, project.grant, project.owner, project.nextStep, project.note].join(" "));
  if (text.includes("отчет") || text.includes("результ") || text.includes("заверш")) return 9;
  if (text.includes("реализ")) return 8;
  if (text.includes("подан")) return 7;
  if (project.grant) return 6;
  if (project.budget || text.includes("смет") || text.includes("финанс")) return 5;
  if (project.partner || project.customer || text.includes("партнер") || text.includes("пилот")) return 4;
  if (project.owner || project.team) return 3;
  if (text.includes("тз") || text.includes("паспорт")) return 2;
  if (text.includes("проработ") || text.includes("прототип")) return 1;
  return 0;
}

function renderFunnel() {
  const groups = FUNNEL_STAGES.map((stage, index) => ({ ...stage, index, projects: state.projects.filter((project) => resolveFunnelStage(project) === index) }));
  els.funnelBoard.innerHTML = groups.map((stage) => {
    const riskCount = stage.projects.filter(hasRisk).length;
    const active = stage.index === state.activeFunnelStage;
    return `<button class="funnel-step ${active ? "is-active" : ""} ${riskCount ? "has-risk" : ""}" type="button" data-stage="${stage.index}"><span>${String(stage.index + 1).padStart(2, "0")}</span><strong>${escapeHtml(stage.name)}</strong><small>${stage.projects.length} проектов</small><em>${riskCount ? `${riskCount} с риском` : "без риска"}</em></button>`;
  }).join("");
  const selected = groups[state.activeFunnelStage] || groups[0];
  if (!selected.projects.length) {
    els.funnelDetails.innerHTML = `<div class="empty-state"><strong>${escapeHtml(selected.name)}</strong><span>На этом этапе проектов нет.</span></div>`;
    return;
  }
  els.funnelDetails.innerHTML = `<div class="panel-head inline"><div><p class="eyebrow">Этап: ${escapeHtml(selected.name)}</p><h3>${escapeHtml(selected.hint)}</h3></div></div><div class="stage-projects">${selected.projects.map((project) => {
    const issues = projectIssues(project);
    return `<article class="stage-project"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.nextStep || "следующее действие не указано")}</small><span class="badge ${issues.length ? "warn" : "good"}">${issues.length ? `${issues.length} замеч.` : "ок"}</span></article>`;
  }).join("")}</div>`;
}

function grantStatus(grant) {
  const text = normalize(grant.window);
  const d = daysUntil(grant.deadline);
  if (!grant.deadline && (text.includes("монитор") || text.includes("провер") || text.includes("уточ"))) return { label: "требует проверки", className: "warn", order: 2 };
  if (!grant.deadline) return { label: "нет даты", className: "warn", order: 3 };
  if (d < 0) return { label: "окно прошло", className: "neutral", order: 4 };
  if (grant.deadline < CONFIG.juneStart) return { label: "раннее окно", className: "warn", order: 2 };
  if (d <= 21) return { label: "срочно", className: "danger", order: 0 };
  return { label: "актуально", className: "good", order: 1 };
}

function relatedProjectsForGrant(grant) {
  const text = normalize([grant.route, grant.projects, grant.purpose].join(" "));
  return state.projects.filter((project) => {
    const projectText = normalize([project.name, project.grant, project.direction].join(" "));
    return project.grant && (text.includes(normalize(project.grant)) || projectText.includes(normalize(grant.route)));
  });
}

function renderGrants() {
  const grants = state.grants.filter((grant) => grant.route).sort((a, b) => grantStatus(a).order - grantStatus(b).order || daysUntil(a.deadline) - daysUntil(b.deadline));
  if (!grants.length) {
    els.grantGrid.innerHTML = `<div class="empty-state"><strong>Нет данных по грантам</strong><span>Проверьте лист с грантовыми окнами.</span></div>`;
    return;
  }
  els.grantGrid.innerHTML = grants.map((grant) => {
    const status = grantStatus(grant);
    const related = relatedProjectsForGrant(grant);
    const source = normalize(grant.source).startsWith("http") ? `<a href="${escapeHtml(grant.source)}" target="_blank" rel="noreferrer">Источник</a>` : `<span>Источник не указан</span>`;
    return `<article class="grant-line ${status.className}"><div class="grant-date"><strong>${escapeHtml(formatDate(grant.deadline))}</strong><span class="badge ${status.className}">${escapeHtml(status.label)}</span></div><div class="grant-main"><h3>${escapeHtml(grant.route)}</h3><p>${escapeHtml(grant.purpose || "Назначение не заполнено.")}</p><small>${escapeHtml(grant.operator || "оператор не указан")} · ${escapeHtml(grant.funding || "сумма не указана")}</small></div><div class="grant-projects"><strong>Проекты</strong><span>${escapeHtml(grant.projects || related.map((project) => project.name).join(", ") || "требует сопоставления")}</span></div><div class="grant-action"><strong>Первый шаг</strong><span>${escapeHtml(grant.firstStep || "уточнить комплект документов")}</span>${source}</div></article>`;
  }).join("");
}

function renderNtsAgenda() {
  const risky = state.projects.filter((project) => normalize(project.status).includes("нтс") || hasRisk(project)).slice(0, 12);
  const decisions = [
    ...state.projects.filter((p) => !p.owner).slice(0, 4).map((p) => ({ title: p.name, text: "Назначить ответственного" })),
    ...state.projects.filter((p) => !p.grant).slice(0, 4).map((p) => ({ title: p.name, text: "Определить грантовый маршрут" })),
    ...state.feedback.filter((i) => normalize(i.type).includes("решение")).slice(0, 4).map((i) => ({ title: i.project || "Портфель проектов", text: i.message || "Решение НТС" })),
  ];
  els.ntsAgenda.innerHTML = risky.length ? risky.map((project) => `<div class="agenda-item"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(projectIssues(project).map((issue) => issue.label).join(", ") || "требует обсуждения")}</small></div>`).join("") : `<div class="empty-state compact-empty"><strong>Нет вопросов</strong><span>Проекты не требуют вынесения на НТС.</span></div>`;
  els.decisionList.innerHTML = decisions.length ? decisions.map((item) => `<div class="agenda-item"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></div>`).join("") : `<div class="empty-state compact-empty"><strong>Нет решений</strong><span>Критические решения не выявлены.</span></div>`;
}

function renderFeedbackFeed() {
  if (!state.feedback.length) {
    els.feedbackFeed.innerHTML = `<div class="empty-state compact-empty"><strong>Пожеланий пока нет</strong><span>Новые сообщения появятся здесь.</span></div>`;
    return;
  }
  els.feedbackFeed.innerHTML = state.feedback.slice(0, 12).map((item) => `<div class="feedback-item"><strong>${escapeHtml(item.author || "Автор не указан")} <span>${escapeHtml(item.type || "сообщение")}</span></strong><small>${escapeHtml(item.project || "ко всему портфелю")} · ${escapeHtml(item.priority || "средний приоритет")}</small><p>${escapeHtml(item.message || "Текст не заполнен.")}</p></div>`).join("");
}

function renderAll() {
  renderKpi();
  renderFilters();
  renderActions();
  renderProjects();
  renderQuality();
  renderFunnel();
  renderGrants();
  renderNtsAgenda();
  renderFeedbackFeed();
}

async function loadData(force = false) {
  setSync("Загрузка данных из Google Таблицы...", "loading");
  if (force) cache.clear();
  const cached = !force ? cache.load("dashboard") : null;
  if (cached) {
    state.projects = cached.projects;
    state.grants = cached.grants;
    state.feedback = cached.feedback;
    renderAll();
    setSync("Данные загружены из кеша. Нажмите «Обновить» для синхронизации.", "ok");
  }
  try {
    const [projectsResult, grantsResult, feedbackResult] = await Promise.allSettled([
      loadSheet(CONFIG.sheets.projects, ["проект", "статус"]),
      loadSheet(CONFIG.sheets.grants, ["маршрут", "оператор"]),
      loadSheet(CONFIG.sheets.nts, ["фио", "сообщение"]),
    ]);
    const googleErrors = [projectsResult, grantsResult, feedbackResult]
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message || "ошибка загрузки");

    if (projectsResult.status === "fulfilled") state.projects = projectsResult.value.map(normalizeProject).filter((project) => project.name && project.name !== "без названия");
    if (grantsResult.status === "fulfilled") state.grants = grantsResult.value.map(normalizeGrant).filter((grant) => grant.route);
    if (feedbackResult.status === "fulfilled") state.feedback = feedbackResult.value.map(normalizeFeedback).filter((item) => item.message || item.author || item.project).reverse();

    if (!state.projects.length) {
      const fallback = await loadFallbackData();
      state.projects = fallback.projects;
      if (!state.grants.length) state.grants = fallback.grants;
      if (!state.feedback.length) state.feedback = fallback.feedback;
      cache.save("dashboard", { projects: state.projects, grants: state.grants, feedback: state.feedback });
      renderAll();
      setUpdatedNow();
      setSync(`Демо-режим: показана локальная копия данных${fallback.generatedAt ? ` от ${fallback.generatedAt}` : ""}. Google Sheets можно подключить позже.`, "ok");
      if (googleErrors.length) console.warn("Google Sheets недоступен, включен fallback", googleErrors);
      return;
    }

    cache.save("dashboard", { projects: state.projects, grants: state.grants, feedback: state.feedback });
    renderAll();
    setUpdatedNow();
    setSync(googleErrors.length ? "Данные частично синхронизированы; недоступные листы заменены кешем/пустым состоянием." : "Данные синхронизированы с Google Таблицей.", "ok");
  } catch (error) {
    console.error(error);
    try {
      const fallback = await loadFallbackData();
      state.projects = fallback.projects;
      state.grants = fallback.grants;
      state.feedback = fallback.feedback;
      cache.save("dashboard", { projects: state.projects, grants: state.grants, feedback: state.feedback });
      renderAll();
      setUpdatedNow();
      setSync("Демо-режим: Google Sheets недоступен, показана локальная копия данных.", "ok");
      showToast("Включен демо-режим с локальной копией данных");
    } catch (fallbackError) {
      console.error(fallbackError);
      setSync("Не удалось загрузить данные. Проверьте доступ к Google Таблице.", "error");
      showToast("Не удалось загрузить данные", "error");
    }
  }
}

function setupEvents() {
  els.refreshData?.addEventListener("click", () => loadData(true));
  els.menuToggle?.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    els.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
  els.navLinks?.forEach((link) => link.addEventListener("click", () => { document.body.classList.remove("menu-open"); els.menuToggle?.setAttribute("aria-expanded", "false"); }));
  const handleFilterChange = debounce(() => {
    state.filters.query = els.searchInput.value;
    state.filters.status = els.statusFilter.value;
    state.filters.owner = els.ownerFilter.value;
    state.filters.readiness = els.readinessFilter.value;
    state.filters.risk = els.riskFilter.value;
    renderProjects();
  });
  [els.searchInput, els.statusFilter, els.ownerFilter, els.readinessFilter, els.riskFilter].forEach((el) => { el?.addEventListener("input", handleFilterChange); el?.addEventListener("change", handleFilterChange); });
  els.projectTable?.addEventListener("click", (event) => {
    const row = event.target.closest(".project-row");
    if (!row) return;
    const uid = row.dataset.project;
    const detail = document.querySelector(`[data-detail="${CSS.escape(uid)}"]`);
    if (!detail) return;
    const isOpen = detail.classList.toggle("is-open");
    const button = row.querySelector(".row-toggle");
    if (button) button.textContent = isOpen ? "−" : "+";
  });
  els.funnelBoard?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stage]");
    if (!button) return;
    state.activeFunnelStage = Number(button.dataset.stage);
    renderFunnel();
  });
  els.ntsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.author || !data.message) { showToast("Заполните ФИО и текст сообщения", "error"); return; }
    const payload = {
      formKey: CONFIG.formKey,
      author: data.author,
      role: data.role || "",
      project: data.project || "Ко всему портфелю",
      type: data.type || "пожелание",
      priority: data.priority || "средний",
      message: data.message,
      status: "новое",
      createdAt: new Date().toISOString(),
      source: "compact-dashboard",
    };
    try {
      submitButton.disabled = true;
      submitButton.textContent = "Отправка...";
      await fetch(CONFIG.scriptUrl, { method: "POST", mode: "no-cors", body: new URLSearchParams(payload) });
      form.reset();
      showToast("Пожелание отправлено в лист НТС");
      setTimeout(() => loadData(true), 900);
    } catch (error) {
      console.error(error);
      showToast("Не удалось отправить пожелание", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Отправить пожелание";
    }
  });
}

setupEvents();
loadData();
