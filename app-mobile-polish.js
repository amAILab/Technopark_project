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
    document.body.classList.remove("showcase-demo");
    try {
      localStorage.removeItem("technopark_showcase_demo");
    } catch (error) {
      console.warn("Не удалось очистить режим показа", error);
    }
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

  function removeLegacyButtons() {
    Array.from(document.querySelectorAll("a, button, .showcase-controls, .showcase-demo-icon")).forEach((node) => {
      const label = cleanText(node.textContent).toLowerCase();
      if (
        node.id === "showcaseCopyBrief" ||
        node.id === "showcaseDemoToggle" ||
        node.id === "showcaseControls" ||
        node.classList?.contains("showcase-demo-icon") ||
        label.includes("скопировать сводку") ||
        label.includes("режим показа") ||
        label.includes("обычный режим")
      ) {
        node.remove();
      }
    });
  }

  function removeDemoToasts() {
    const stack = $("#toastStack");
    if (!stack) return;
    Array.from(stack.querySelectorAll(".toast")).forEach((toast) => {
      const label = cleanText(toast.textContent).toLowerCase();
      if (label.includes("режим показа") || label.includes("обычный режим")) {
        toast.remove();
      }
    });
  }

  function patchAll() {
    normalizeStickyBar();
    patchMenu();
    patchHeaderActions();
    removeLegacyButtons();
    removeDemoToasts();
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
