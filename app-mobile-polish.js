/*
  Мобильная полировка перед показом.
  Делает меню, нижнюю панель и режим показа аккуратнее на телефоне.
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

    if (firstButton) firstButton.textContent = "Панель";
    if (lastButton) lastButton.textContent = "Решения";
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

  function removeCopyBriefButtons() {
    Array.from(document.querySelectorAll("a, button")).forEach((node) => {
      const label = cleanText(node.textContent).toLowerCase();
      if (node.id === "showcaseCopyBrief" || label.includes("скопировать сводку")) {
        node.remove();
      }
    });
  }

  function ensureDemoIcon() {
    const button = $("#showcaseDemoToggle");
    if (!button) return;

    button.classList.remove("button", "ghost", "showcase-control");
    button.classList.add("showcase-demo-icon");
    button.innerHTML = `<span class="showcase-demo-icon-ring"></span><span class="showcase-demo-icon-core"></span>`;
    button.setAttribute("aria-label", document.body.classList.contains("showcase-demo") ? "Выключить режим показа" : "Включить режим показа");
    button.setAttribute("title", document.body.classList.contains("showcase-demo") ? "Обычный режим" : "Режим показа");
  }

  function patchDemoToast() {
    const stack = $("#toastStack");
    if (!stack) return;
    Array.from(stack.querySelectorAll(".toast")).forEach((toast) => {
      const label = cleanText(toast.textContent).toLowerCase();
      if (label.includes("режим показа включен") || label.includes("обычный режим включен")) {
        toast.classList.add("compact-mode-toast");
        setTimeout(() => toast.remove(), 950);
      }
    });
  }

  function patchAll() {
    normalizeStickyBar();
    patchMenu();
    patchHeaderActions();
    removeCopyBriefButtons();
    ensureDemoIcon();
    patchDemoToast();
  }

  function observe() {
    if (window.__mobilePolishObserver) return;
    window.__mobilePolishObserver = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(patchAll, 80);
    });
    window.__mobilePolishObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function init() {
    loadStyle();
    markReady();
    patchAll();
    observe();
    setTimeout(patchAll, 500);
    setTimeout(patchAll, 1200);
    setTimeout(patchAll, 3600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
