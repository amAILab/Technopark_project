/*
  Мобильная полировка перед показом.
  Делает меню и нижнюю панель аккуратнее на телефоне.
*/
(function () {
  function $(selector) {
    return document.querySelector(selector);
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function loadStyle() {
    if ($('link[href="styles-mobile-polish.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "styles-mobile-polish.css";
    document.head.appendChild(link);
  }

  function markReady() {
    document.body.classList.add("mobile-polish-ready");
  }

  function normalizeStickyBar() {
    const bar = $("#stickyKpi");
    if (!bar) return;

    const buttons = Array.from(bar.querySelectorAll("button"));
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];
    const spans = Array.from(bar.querySelectorAll("span"));

    if (firstButton) firstButton.textContent = "Панель";
    if (lastButton) lastButton.textContent = "Решения";

    spans.forEach((span) => {
      const text = cleanText(span.textContent).toLowerCase();
      if (text.includes("требуют")) span.dataset.mobileHide = "true";
      if (text.includes("готов") && text.includes("грант")) span.dataset.mobileLabel = "НТС";
    });
  }

  function closeMenu() {
    document.body.classList.remove("menu-open");
    const nav = $("#mainNav");
    const button = $("#menuToggle");
    nav?.classList.remove("is-open");
    button?.setAttribute("aria-expanded", "false");
  }

  function patchMenu() {
    const nav = $("#mainNav");
    const button = $("#menuToggle");
    if (!nav || !button || button.dataset.mobilePolished) return;
    button.dataset.mobilePolished = "1";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const open = !document.body.classList.contains("menu-open") && !nav.classList.contains("is-open");
      document.body.classList.toggle("menu-open", open);
      nav.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    }, true);

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) setTimeout(closeMenu, 80);
    });
  }

  function patchHeaderActions() {
    const addButton = Array.from(document.querySelectorAll("a, button")).find((node) => {
      const label = cleanText(node.textContent).toLowerCase();
      return label.includes("добавить") && label.includes("пожел");
    });
    if (addButton) addButton.classList.add("mobile-add-feedback-button");
  }

  function observe() {
    if (window.__mobilePolishObserver) return;
    window.__mobilePolishObserver = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(() => {
        normalizeStickyBar();
        patchMenu();
        patchHeaderActions();
      }, 120);
    });
    window.__mobilePolishObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    loadStyle();
    markReady();
    normalizeStickyBar();
    patchMenu();
    patchHeaderActions();
    observe();
    setTimeout(normalizeStickyBar, 1200);
    setTimeout(normalizeStickyBar, 3600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
