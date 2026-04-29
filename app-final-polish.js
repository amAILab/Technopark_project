/*
  Финальный слой UX-полировки для панели Технопарка РГСУ.
  Добавляет метку версии, легенду статусов, кнопку «Наверх» и диагностику пустых данных.
  Данные Google Sheets не изменяются.
*/

(function () {
  const VERSION = "v6.1 · show";

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function ensureVersionChip() {
    const title = document.querySelector("#overview h1");
    if (!title || document.querySelector("#dashboardVersion")) return;
    const chip = document.createElement("span");
    chip.className = "version-chip";
    chip.id = "dashboardVersion";
    chip.textContent = `${VERSION} · compact`;
    title.insertAdjacentElement("afterend", chip);
  }

  function ensureStatusLegend() {
    const projectsSection = document.querySelector("#projects .section-title");
    if (!projectsSection || document.querySelector("#statusLegend")) return;
    const legend = document.createElement("div");
    legend.className = "status-legend";
    legend.id = "statusLegend";
    legend.innerHTML = `
      <span><b class="legend-dot good"></b>готово / ок</span>
      <span><b class="legend-dot info"></b>в работе</span>
      <span><b class="legend-dot warn"></b>нужно уточнить</span>
      <span><b class="legend-dot danger"></b>риск / срочно</span>
      <span><b class="legend-dot neutral"></b>нет данных</span>
    `;
    projectsSection.insertAdjacentElement("afterend", legend);
  }

  function ensureBackToTop() {
    if (document.querySelector("#backToTop")) return;
    const button = document.createElement("button");
    button.className = "back-to-top";
    button.id = "backToTop";
    button.type = "button";
    button.textContent = "↑";
    button.setAttribute("aria-label", "Вернуться наверх");
    document.body.appendChild(button);
  }

  function toggleBackToTop() {
    const button = document.querySelector("#backToTop");
    if (!button) return;
    button.classList.toggle("is-visible", window.scrollY > 640);
  }

  function ensureDiagnosticPanel() {
    const actionBoard = document.querySelector("#actionBoard");
    if (!actionBoard || document.querySelector("#dataDiagnostic")) return;
    const diagnostic = document.createElement("div");
    diagnostic.className = "diagnostic-card";
    diagnostic.id = "dataDiagnostic";
    diagnostic.hidden = true;
    diagnostic.innerHTML = `
      <strong>Данные не отобразились</strong>
      <p>Проверьте публикацию Google Таблицы, доступ к листам, корректность gid и работу Apps Script. После исправления нажмите «Обновить».</p>
      <div>
        <a href="https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit" target="_blank" rel="noreferrer">Открыть таблицу</a>
        <button type="button" id="diagnosticRefresh">Обновить</button>
      </div>
    `;
    actionBoard.insertAdjacentElement("beforebegin", diagnostic);
  }

  function updateDiagnostic() {
    const diagnostic = document.querySelector("#dataDiagnostic");
    if (!diagnostic) return;
    const rows = document.querySelectorAll("#projectTable .project-row").length;
    const syncText = cleanText(document.querySelector("#syncStatus")?.textContent || "").toLowerCase();
    const shouldShow = rows === 0 && !syncText.includes("загрузка");
    diagnostic.hidden = !shouldShow;
  }

  function ensureSectionAnchors() {
    document.querySelectorAll("main .section").forEach((section) => {
      if (section.querySelector(".section-anchor-copy")) return;
      const title = section.querySelector("h2");
      if (!title || !section.id) return;
      const button = document.createElement("button");
      button.className = "section-anchor-copy";
      button.type = "button";
      button.dataset.anchor = section.id;
      button.textContent = "#";
      button.setAttribute("aria-label", `Скопировать ссылку на раздел ${cleanText(title.textContent)}`);
      title.appendChild(button);
    });
  }

  async function copySectionLink(id) {
    const url = `${location.origin}${location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка на раздел скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Ссылка на раздел скопирована");
    }
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("error");
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function loadShowcaseStyles() {
    if (document.querySelector('link[href="styles-showcase-fix.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "styles-showcase-fix.css";
    document.head.appendChild(link);
  }

  function loadShowcaseLayer() {
    loadShowcaseStyles();
    if (document.querySelector('script[src="app-showcase-fix.js"]')) return;
    const script = document.createElement("script");
    script.src = "app-showcase-fix.js";
    script.defer = true;
    document.body.appendChild(script);
  }

  function attachEvents() {
    window.addEventListener("scroll", toggleBackToTop, { passive: true });
    document.addEventListener("click", (event) => {
      if (event.target.closest("#backToTop")) window.scrollTo({ top: 0, behavior: "smooth" });
      if (event.target.closest("#diagnosticRefresh")) document.querySelector("#refreshData")?.click();
      const anchorButton = event.target.closest("[data-anchor]");
      if (anchorButton) copySectionLink(anchorButton.dataset.anchor);
    });
  }

  function observeData() {
    const table = document.querySelector("#projectTable");
    if (table && !window.__finalPolishObserver) {
      window.__finalPolishObserver = new MutationObserver(() => setTimeout(updateDiagnostic, 120));
      window.__finalPolishObserver.observe(table, { childList: true, subtree: true });
    }
    setTimeout(updateDiagnostic, 2600);
    setTimeout(updateDiagnostic, 5200);
  }

  function init() {
    ensureVersionChip();
    ensureStatusLegend();
    ensureBackToTop();
    ensureDiagnosticPanel();
    ensureSectionAnchors();
    attachEvents();
    observeData();
    toggleBackToTop();
    loadShowcaseLayer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
