/*
  Паспорт проекта.
  Улучшает раскрытие строки проекта: добавляет компактный управленческий паспорт
  без изменения Google Sheets и основной структуры таблицы.
*/

(function () {
  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanText(value).toLowerCase().replaceAll("ё", "е");
  }

  function safeCss(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replaceAll('"', '\\"');
  }

  function rows() {
    return Array.from(document.querySelectorAll("#projectTable .project-row"));
  }

  function detailFor(row) {
    const uid = row?.dataset?.project;
    if (!uid) return null;
    return document.querySelector(`[data-detail="${safeCss(uid)}"]`);
  }

  function cell(row, index) {
    return cleanText(row.children[index]?.textContent || "");
  }

  function projectName(row) {
    return cleanText(row.children[1]?.querySelector("strong")?.textContent || row.children[1]?.textContent || "Проект без названия");
  }

  function projectDirection(row) {
    return cleanText(row.children[1]?.querySelector("small")?.textContent || "направление не указано");
  }

  function extractDetailBlocks(detail) {
    const blocks = Array.from(detail.querySelectorAll(".project-detail > div"));
    const get = (name) => {
      const block = blocks.find((item) => normalizeText(item.querySelector("b")?.textContent || "").includes(normalizeText(name)));
      return cleanText(block?.querySelector("p")?.textContent || "");
    };
    return {
      description: get("Описание"),
      nextAction: get("Следующее действие"),
      grantRoute: get("Грантовый маршрут"),
      comment: get("Комментарий"),
    };
  }

  function readinessValue(row) {
    const text = cell(row, 6).replace(",", ".");
    const match = text.match(/\d+(\.\d+)?/);
    return match ? Math.max(0, Math.min(100, Math.round(Number(match[0])))) : 0;
  }

  function statusClass(text) {
    const value = normalizeText(text);
    if (value.includes("срок прошел") || value.includes("дедлайн через") || value.includes("нтс")) return "danger";
    if (value.includes("не указан") || value.includes("не выбран") || value.includes("нет")) return "warn";
    if (value.includes("готов") || value.includes("рисков нет")) return "good";
    return "info";
  }

  function decisionText(row, details) {
    const owner = normalizeText(cell(row, 2));
    const grant = normalizeText(cell(row, 4));
    const deadline = normalizeText(cell(row, 5));
    const risk = normalizeText(cell(row, 7));
    const readiness = normalizeText(cell(row, 6));
    const all = normalizeText(`${row.textContent} ${details.comment}`);

    if (risk.includes("срок прошел") || risk.includes("дедлайн через")) return "Срочно решить: ускорить подготовку, перенести срок или снять с ближайшей подачи.";
    if (all.includes("нтс")) return "Вынести на НТС и сформулировать конкретный вопрос для решения.";
    if (!owner || owner.includes("не указан")) return "Назначить ответственного за проект.";
    if (!grant || grant.includes("не выбран") || grant.includes("нет")) return "Определить грантовый маршрут или иной источник финансирования.";
    if (!deadline || deadline.includes("нет срока")) return "Назначить ближайший управленческий срок.";
    if (readiness.includes("расчет")) return "Подтвердить фактическую готовность проекта вручную.";
    return "Контролировать следующее действие и обновлять статус в реестре.";
  }

  function blockerText(row, details) {
    const owner = normalizeText(cell(row, 2));
    const grant = normalizeText(cell(row, 4));
    const deadline = normalizeText(cell(row, 5));
    const risk = cell(row, 7) || "";
    const issues = [];

    if (!owner || owner.includes("не указан")) issues.push("не назначен ответственный");
    if (!grant || grant.includes("не выбран") || grant.includes("нет")) issues.push("не выбран грантовый маршрут");
    if (!deadline || deadline.includes("нет срока")) issues.push("нет управленческого срока");
    if (risk && normalizeText(risk) !== "рисков нет") issues.push(risk);
    if (details.comment) issues.push(details.comment);

    return issues.length ? issues.slice(0, 3).join("; ") : "Критических препятствий по текущим данным не выявлено.";
  }

  function passportHtml(row, details) {
    const name = projectName(row);
    const direction = projectDirection(row);
    const owner = cell(row, 2) || "не указан";
    const status = cell(row, 3) || "статус не указан";
    const grant = cell(row, 4) || details.grantRoute || "не выбран";
    const deadline = cell(row, 5) || "нет срока";
    const readiness = readinessValue(row);
    const risk = cell(row, 7) || "рисков нет";
    const decision = decisionText(row, details);
    const blocker = blockerText(row, details);

    return `
      <section class="project-passport compact-passport" data-passport="${row.dataset.project}">
        <div class="project-passport-head">
          <div>
            <span>Паспорт проекта</span>
            <h3>${name}</h3>
            <small>${direction}</small>
          </div>
          <div class="passport-readiness">
            <strong>${readiness}%</strong>
            <small>готовность</small>
          </div>
        </div>

        <div class="passport-decision-strip">
          <span class="passport-pill ${statusClass(risk)}">${risk}</span>
          <span><b>Срок:</b> ${deadline}</span>
          <span><b>Ответственный:</b> ${owner}</span>
          <span><b>Грант:</b> ${grant}</span>
        </div>

        <div class="passport-grid compact">
          <article><b>Суть проекта</b><p>${details.description || "Описание проекта не заполнено."}</p></article>
          <article><b>Что мешает</b><p>${blocker}</p></article>
          <article><b>Что решить</b><p>${decision}</p></article>
          <article><b>Следующее действие</b><p>${details.nextAction || "Следующее действие не указано."}</p></article>
        </div>

        <details class="passport-extra">
          <summary>Показать служебные поля</summary>
          <div>
            <span><b>Статус:</b> <em class="passport-pill ${statusClass(status)}">${status}</em></span>
            <span><b>Грантовый маршрут:</b> ${grant}</span>
            <span><b>Комментарий:</b> ${details.comment || "нет комментария"}</span>
          </div>
        </details>
      </section>
    `;
  }

  function enhancePassport(row) {
    const detail = detailFor(row);
    if (!detail || detail.querySelector(".project-passport")) return;
    const details = extractDetailBlocks(detail);
    const holder = detail.querySelector("td") || detail;
    holder.insertAdjacentHTML("afterbegin", passportHtml(row, details));
  }

  function enhanceAll() {
    rows().forEach(enhancePassport);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      const row = event.target.closest(".project-row");
      if (row) setTimeout(() => enhancePassport(row), 60);
      if (event.target.closest("#expandAllProjects")) setTimeout(enhanceAll, 120);
    });
  }

  function observeTable() {
    const table = document.querySelector("#projectTable");
    if (!table || window.__projectPassportObserver) return;
    window.__projectPassportObserver = new MutationObserver(() => setTimeout(enhanceAll, 200));
    window.__projectPassportObserver.observe(table, { childList: true, subtree: true });
  }

  function init() {
    attachEvents();
    observeTable();
    setTimeout(enhanceAll, 1800);
    setTimeout(enhanceAll, 4200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
