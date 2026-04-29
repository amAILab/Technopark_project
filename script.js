/*
  Fallback-скрипт для старой опубликованной сборки панели.
  Подключается, если страница ожидает script.js. Основная новая сборка использует app-compact.js.
*/
(function () {
  const CONFIG = {
    sheetId: "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60",
    sheets: { projects: "150570752", grants: "1500721586", nts: "202604270", package: "341683209" },
    scriptUrl: "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec",
    formKey: "NTS_TECHNOPARK_2026",
  };

  if (window.__technoparkFallbackLoaded) return;
  window.__technoparkFallbackLoaded = true;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const text = (value) => String(value ?? "").trim();
  const norm = (value) => text(value).toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
  const esc = (value) => text(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

  const state = { projects: [], grants: [], feedback: [], filters: { query: "", status: "all", direction: "all", deadline: "all", preset: "all" } };

  function setHtml(selector, html) { const node = $(selector); if (node) node.innerHTML = html; }
  function setText(selector, value) { const node = $(selector); if (node) node.textContent = value; }

  function toast(message, isError = false) {
    let stack = $("#toastStack") || $("#toast");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      document.body.appendChild(stack);
    }
    if (stack.id === "toast") {
      stack.textContent = message;
      stack.classList.toggle("error", isError);
      stack.classList.add("show", "is-visible");
      setTimeout(() => stack.classList.remove("show", "is-visible"), 3000);
      return;
    }
    const item = document.createElement("div");
    item.className = `toast ${isError ? "is-error" : ""}`;
    item.textContent = message;
    stack.appendChild(item);
    requestAnimationFrame(() => item.classList.add("is-visible"));
    setTimeout(() => item.remove(), 3500);
  }

  function gvizCell(cell) { return cell ? cell.f || cell.v || "" : ""; }
  function findHeaderIndex(rows, words) {
    let best = 0; let score = -1;
    rows.forEach((row, index) => {
      const line = norm(row.join(" "));
      const current = words.reduce((sum, word) => sum + (line.includes(norm(word)) ? 1 : 0), 0);
      if (current > score) { score = current; best = index; }
    });
    return best;
  }

  function loadSheet(gid, words) {
    return new Promise((resolve, reject) => {
      const callback = `tp_cb_${gid}_${Date.now()}_${Math.round(Math.random() * 100000)}`;
      const script = document.createElement("script");
      window[callback] = (payload) => {
        delete window[callback]; script.remove();
        if (!payload || payload.status === "error") { reject(new Error("sheet")); return; }
        const rows = (payload.table.rows || []).map((row) => (row.c || []).map(gvizCell));
        const headerIndex = findHeaderIndex(rows, words);
        const headers = (rows[headerIndex] || []).map((header, i) => text(header) || `col${i}`);
        resolve(rows.slice(headerIndex + 1).filter((row) => row.some((cell) => text(cell))).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]))));
      };
      script.onerror = () => { delete window[callback]; script.remove(); reject(new Error("sheet")); };
      script.src = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?gid=${gid}&headers=0&tqx=responseHandler:${callback}&cacheBust=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  function value(row, names) {
    const map = Object.fromEntries(Object.entries(row).map(([key, val]) => [norm(key), val]));
    for (const name of names) { const v = map[norm(name)]; if (text(v)) return v; }
    return "";
  }

  function percent(value) { const m = text(value).replace(",", ".").match(/\d+(\.\d+)?/); return m ? Math.max(0, Math.min(100, Math.round(Number(m[0])))) : 0; }
  function isoDate(value) {
    const raw = text(value); if (!raw) return "";
    const gviz = raw.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (gviz) return `${gviz[1]}-${String(Number(gviz[2]) + 1).padStart(2, "0")}-${String(gviz[3]).padStart(2, "0")}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!d) return "";
    return `${d[3].length === 2 ? `20${d[3]}` : d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  }
  function daysUntil(iso) { if (!iso) return Infinity; const today = new Date(); today.setHours(0,0,0,0); return Math.ceil((new Date(`${iso}T00:00:00`) - today) / 86400000); }
  function dateRu(iso) { return iso ? new Intl.DateTimeFormat("ru-RU").format(new Date(`${iso}T00:00:00`)) : "нет срока"; }

  function normalizeProject(row, index) {
    const project = {
      uid: `p-${index}`,
      id: value(row, ["ID", "№", "Номер"]) || String(index + 1),
      name: value(row, ["Проект", "Название", "Наименование проекта", "Наименование"]) || "Без названия",
      direction: value(row, ["Направление", "Сфера", "Тип"]),
      stage: value(row, ["Стадия", "Этап"]),
      owner: value(row, ["Ответственный", "Руководитель", "Команда", "Инициатор"]),
      status: value(row, ["Статус", "Состояние"]) || "требует уточнения",
      grant: value(row, ["Маршрут финансирования", "Ближайшее окно", "Грант", "Конкурс"]),
      deadline: isoDate(value(row, ["Срок", "Дедлайн", "Дата подачи", "Срок подачи"])),
      readiness: percent(value(row, ["Готовность пакета", "Готовность", "Готовность %", "Процент готовности"])),
      nextStep: value(row, ["Следующее действие", "Следующий шаг", "Действие", "Задача"]),
      note: value(row, ["Блокер / примечание", "Примечание", "Комментарий", "Риск"]),
      priority: value(row, ["Приоритет"]),
    };
    if (!project.readiness) project.readiness = estimateReadiness(project);
    return project;
  }

  function estimateReadiness(project) {
    let score = 10;
    if (project.owner) score += 15;
    if (project.grant) score += 20;
    if (project.deadline) score += 10;
    if (project.nextStep) score += 15;
    if (norm(project.status).includes("готов") || norm(project.status).includes("упаков")) score += 25;
    return Math.min(100, score);
  }

  function risk(project) {
    const issues = [];
    if (!project.owner) issues.push("нет ответственного");
    if (!project.grant) issues.push("нет гранта");
    if (!project.deadline) issues.push("нет срока");
    if (!project.nextStep) issues.push("нет действия");
    const days = daysUntil(project.deadline);
    if (project.deadline && days <= 14) issues.push(`дедлайн ${days} дн.`);
    if (project.note) issues.push(project.note);
    return issues;
  }

  function deadlineBadge(project) {
    const d = daysUntil(project.deadline);
    if (!project.deadline) return `<span class="deadline-badge is-missing badge yellow">нет срока</span>`;
    if (d <= 30) return `<span class="deadline-badge is-urgent badge red">${d < 0 ? "просрочено" : `${d} дн.`}</span>`;
    return `<span class="deadline-badge badge">${d} дн.</span>`;
  }

  function filteredProjects() {
    const q = norm(state.filters.query);
    return state.projects.filter((p) => {
      const haystack = norm([p.id,p.name,p.direction,p.owner,p.status,p.grant,p.nextStep,p.note].join(" "));
      if (q && !haystack.includes(q)) return false;
      if (state.filters.status !== "all" && norm(p.status) !== norm(state.filters.status)) return false;
      if (state.filters.direction !== "all" && norm(p.direction) !== norm(state.filters.direction)) return false;
      if (state.filters.deadline === "30" && daysUntil(p.deadline) > 30) return false;
      if (state.filters.deadline === "missing" && p.deadline) return false;
      return true;
    }).sort((a,b) => daysUntil(a.deadline) - daysUntil(b.deadline));
  }

  function render() {
    const projects = filteredProjects();
    const urgent = state.projects.filter((p) => daysUntil(p.deadline) <= 30).length;
    const ready = state.projects.filter((p) => p.readiness >= 70 || norm(p.status).includes("готов")).length;
    const risks = state.projects.filter((p) => risk(p).length).length;
    setText("#totalProjects", state.projects.length); setText("#kTotal", state.projects.length); setText("#filteredCount", `${projects.length} с учетом фильтров`);
    setText("#urgentGrants", urgent); setText("#kSoon", urgent); setText("#readyCount", ready); setText("#kReady", ready); setText("#riskCount", risks); setText("#kRisk", risks); setText("#kGrants", state.grants.length);

    const rowHtml = projects.map((p) => `<tr><td>${esc(p.id)}</td><td><strong>${esc(p.name)}</strong><br><small>${esc(p.owner || "не указан")}</small></td><td>${esc(p.stage || p.direction || "-")}</td><td><div class="progress"><span style="width:${p.readiness}%"></span><i style="width:${p.readiness}%"></i></div>${p.readiness}%</td><td>${esc(p.status)}</td><td>${esc(risk(p)[0] || "норма")}</td><td>${esc(p.nextStep || "не указано")}</td><td>${deadlineBadge(p)}</td></tr>`).join("");
    setHtml("#projectsTable", rowHtml); setHtml("#projectRows", rowHtml);

    const cardHtml = projects.map((p) => `<article class="project package-card card"><h3>${esc(p.name)}</h3><p class="muted">${esc(p.direction || p.stage || "направление не указано")} · ${esc(p.owner || "ответственный не указан")}</p><div class="progress"><span style="width:${p.readiness}%"></span><i style="width:${p.readiness}%"></i></div><p>${esc(p.nextStep || risk(p)[0] || "Следующее действие не указано")}</p>${deadlineBadge(p)}</article>`).join("");
    setHtml("#projectList", cardHtml); setHtml("#projectsMobile", cardHtml); setHtml("#projectCards", cardHtml);

    const timeline = projects.filter((p) => p.deadline).slice(0,8).map((p) => `<article class="timeline-item"><time>${dateRu(p.deadline)}</time><div><strong>${esc(p.name)}</strong><small>${esc(p.grant || "грант не выбран")}</small></div>${deadlineBadge(p)}</article>`).join("") || `<div class="empty-state empty">Нет дедлайнов</div>`;
    setHtml("#timeline", timeline); setHtml("#deadlineCalendar", timeline);

    const actions = projects.filter((p) => risk(p).length).slice(0,8).map((p) => `<article class="action-item"><div><strong>${esc(p.name)}</strong><small>${esc(risk(p).join(", "))}</small></div>${deadlineBadge(p)}</article>`).join("") || `<div class="empty-state empty">Критичных блокеров нет</div>`;
    setHtml("#actionList", actions); setHtml("#leadershipActions", actions); setHtml("#riskList", actions); setHtml("#decisions", actions);

    const grantHtml = state.grants.map((g) => `<article class="grant-window grant card"><strong>${esc(value(g,["Маршрут","Грант","Конкурс"]) || "Грант")}</strong><p>${esc(value(g,["Оператор"]) || "оператор не указан")}</p><p class="muted">${esc(value(g,["Для чего подходит"]) || "описание не заполнено")}</p><small>${esc(value(g,["Окно / статус на 27.04.2026", "Окно"]) || "окно уточнить")}</small></article>`).join("") || `<div class="empty-state empty">Гранты не загружены</div>`;
    setHtml("#grantCalendar", grantHtml); setHtml("#grantWindows", grantHtml); setHtml("#grantBoard", grantHtml); setHtml("#grantGrid", grantHtml);

    const feedbackHtml = state.feedback.map((f) => `<article class="feedback-item"><strong>${esc(value(f,["ФИО / автор", "ФИО", "Автор"]) || "Автор")}</strong><p>${esc(value(f,["Текст пожелания", "Пожелание", "Сообщение"]) || "Текст не указан")}</p></article>`).join("") || `<div class="empty-state empty">Пожелания пока не загружены</div>`;
    setHtml("#ntsFeedbackList", feedbackHtml); setHtml("#latestFeedback", feedbackHtml); setHtml("#wishLog", feedbackHtml);
  }

  function fillFilters() {
    const statuses = [...new Set(state.projects.map((p) => p.status).filter(Boolean))];
    const directions = [...new Set(state.projects.map((p) => p.direction).filter(Boolean))];
    const status = $("#statusFilter"); if (status) status.innerHTML = `<option value="all">Все</option>${statuses.map((s) => `<option>${esc(s)}</option>`).join("")}`;
    const direction = $("#directionFilter") || $("#direction"); if (direction) direction.innerHTML = `<option value="all">Все</option>${directions.map((d) => `<option>${esc(d)}</option>`).join("")}`;
    ["#ntsProjectSelect", "#feedbackProjectSelect", "#feedbackProject"].forEach((selector) => { const node = $(selector); if (node) node.innerHTML = `<option value="">Ко всему портфелю</option>${state.projects.map((p) => `<option>${esc(p.name)}</option>`).join("")}`; });
  }

  async function loadData() {
    setText("#syncStatus", "Загрузка данных из Google Таблицы..."); setText("#syncText", "Загрузка данных из Google Таблицы...");
    try {
      const [projects, grants, feedback] = await Promise.allSettled([
        loadSheet(CONFIG.sheets.projects, ["проект", "статус"]), loadSheet(CONFIG.sheets.grants, ["маршрут", "оператор"]), loadSheet(CONFIG.sheets.nts, ["фио", "пожелание"])
      ]);
      state.projects = projects.status === "fulfilled" ? projects.value.map(normalizeProject).filter((p) => p.name !== "Без названия") : [];
      state.grants = grants.status === "fulfilled" ? grants.value : [];
      state.feedback = feedback.status === "fulfilled" ? feedback.value : [];
      fillFilters(); render();
      const msg = `Данные загружены: ${state.projects.length} проектов, ${state.grants.length} грантов, ${state.feedback.length} пожеланий НТС`;
      setText("#syncStatus", msg); setText("#syncText", msg); setText("#feedbackStatus", msg);
      $$("#syncDot, .sync-dot, .dot").forEach((dot) => dot.classList.add("is-ok", "ok"));
    } catch (error) { console.error(error); toast("Не удалось загрузить данные из Google Таблицы", true); render(); }
  }

  function setView(view) {
    $$("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
    $$(".view").forEach((section) => { const active = section.id === view; section.classList.toggle("active-section", active); section.classList.toggle("active", active); });
  }

  async function submitFeedback(form) {
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]'); if (button) { button.disabled = true; button.textContent = "Отправляем..."; }
    const data = new FormData(form); data.set("formKey", CONFIG.formKey); data.set("status", "новое"); data.set("createdAt", new Date().toISOString());
    try { await fetch(CONFIG.scriptUrl, { method: "POST", body: data, mode: "no-cors" }); form.reset(); toast("Пожелание НТС отправлено"); setTimeout(loadData, 1200); }
    catch (error) { console.error(error); toast("Не удалось отправить пожелание", true); }
    finally { if (button) { button.disabled = false; button.textContent = "Отправить"; } }
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      const view = event.target.closest("[data-view]"); if (view) setView(view.dataset.view);
      if (event.target.closest("#refreshSheet, #refreshData, #refresh")) loadData();
      if (event.target.closest("#presentationMode")) document.body.classList.toggle("presentation");
      if (event.target.closest("#copyBrief")) { const brief = `Технопарк РГСУ: ${state.projects.length} проектов, ${state.grants.length} грантов, ${state.feedback.length} пожеланий НТС.`; navigator.clipboard?.writeText(brief); toast("Сводка скопирована"); }
      if (event.target.closest("#openAddProject, #openAdd")) toast("Добавление проекта лучше выполнить напрямую в Google Таблице перед показом");
      const jump = event.target.closest("[data-jump]"); if (jump) setView(jump.dataset.jump);
    });
    ["#searchInput", "#topSearchInput", "#q"].forEach((selector) => { const node = $(selector); if (node) node.addEventListener("input", () => { state.filters.query = node.value; render(); }); });
    const status = $("#statusFilter"); if (status) status.addEventListener("change", () => { state.filters.status = status.value; render(); });
    const direction = $("#directionFilter") || $("#direction"); if (direction) direction.addEventListener("change", () => { state.filters.direction = direction.value; render(); });
    const deadline = $("#deadlineFilter") || $("#term"); if (deadline) deadline.addEventListener("change", () => { state.filters.deadline = deadline.value; render(); });
    ["#ntsFeedbackForm", "#ntsForm"].forEach((selector) => { const form = $(selector); if (form) form.addEventListener("submit", (event) => { event.preventDefault(); submitFeedback(form); }); });
  }

  function init() { attachEvents(); loadData(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
