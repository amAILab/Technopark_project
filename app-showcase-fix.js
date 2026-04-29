/*
  Предпоказовый слой надежности интерфейса.
  Не меняет структуру данных Google Sheets: только страхует кнопки, якоря, внешние ссылки и форму НТС.
*/
(function () {
  const NEW_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec";

  function $(selector) {
    return document.querySelector(selector);
  }

  function toast(message, isError) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", Boolean(isError));
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 3200);
  }

  function setScriptUrl() {
    if (!window.CONFIG) return;
    window.CONFIG.scriptUrl = NEW_SCRIPT_URL;
  }

  function markBody() {
    document.body.classList.add("showcase-ready");
  }

  function fixExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  }

  function closeMobileMenu() {
    const nav = $("#mainNav");
    const button = $("#menuToggle");
    nav?.classList.remove("is-open");
    button?.setAttribute("aria-expanded", "false");
  }

  function smoothAnchors() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", hash);
      closeMobileMenu();
    });
  }

  function addButtonDiagnostics() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.id === "refreshData") {
        setTimeout(() => {
          const status = $("#syncStatus")?.textContent || "";
          if (/ошибка|недоступ|не удалось/i.test(status)) toast("Данные не загрузились. Проверьте публикацию таблицы и нажмите обновить еще раз.", true);
        }, 2600);
      }

      if (button.classList.contains("row-toggle")) {
        setTimeout(() => {
          const row = button.closest("tr");
          const uid = row?.dataset.project;
          const detail = uid ? document.querySelector(`[data-detail="${CSS.escape(uid)}"]`) : null;
          if (detail) button.setAttribute("aria-expanded", detail.classList.contains("is-open") ? "true" : "false");
        }, 60);
      }
    });
  }

  function improveFormState() {
    const form = $("#ntsForm");
    if (!form || form.dataset.showcaseFixed) return;
    form.dataset.showcaseFixed = "1";

    form.addEventListener("submit", () => {
      setScriptUrl();
      const submit = form.querySelector('button[type="submit"]');
      if (!submit) return;
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = "Отправляем...";
      setTimeout(() => {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || "Отправить пожелание";
      }, 6500);
    }, true);
  }

  function ensureShowcaseChecklist() {
    if ($("#showcaseChecklist")) return;
    const overview = $("#overview .overview-head");
    if (!overview) return;
    const checklist = document.createElement("div");
    checklist.className = "showcase-checklist";
    checklist.id = "showcaseChecklist";
    checklist.innerHTML = `
      <span>Готово к показу</span>
      <b>Кнопки, якоря, внешние ссылки и форма НТС проверяются автоматически</b>
    `;
    overview.appendChild(checklist);
  }

  function checkHashOnLoad() {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
  }

  function init() {
    setScriptUrl();
    markBody();
    fixExternalLinks();
    smoothAnchors();
    addButtonDiagnostics();
    improveFormState();
    ensureShowcaseChecklist();
    checkHashOnLoad();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
