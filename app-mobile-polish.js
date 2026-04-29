/*
  Экстренная мобильная полировка перед показом.
  Главное: меню, нижняя панель и кнопка пожелания должны работать стабильно.
*/
(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec";

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

  function toast(message, isError) {
    let stack = $("#toastStack") || $("#toast");
    if (!stack || stack.id === "toast") {
      if (stack && stack.id === "toast") {
        stack.textContent = message;
        stack.classList.toggle("error", Boolean(isError));
        stack.classList.add("is-visible", "show");
        setTimeout(() => stack.classList.remove("is-visible", "show"), 2600);
        return;
      }
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = `toast ${isError ? "is-error" : ""}`;
    item.textContent = message;
    stack.appendChild(item);
    requestAnimationFrame(() => item.classList.add("is-visible"));
    setTimeout(() => item.remove(), 3000);
  }

  function markReady() {
    document.body.classList.add("mobile-polish-ready");
    document.body.classList.remove("showcase-demo");
    try { localStorage.removeItem("technopark_showcase_demo"); } catch (error) {}
  }

  function normalizeStickyBar() {
    const bar = $("#stickyKpi");
    if (!bar) return;
    const buttons = Array.from(bar.querySelectorAll("button"));
    if (buttons[0]) buttons[0].textContent = "Панель";
    if (buttons[buttons.length - 1]) buttons[buttons.length - 1].textContent = "Решения";
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
      if (event.target.closest("a")) setTimeout(closeMenu, 80);
    });
  }

  function isFeedbackButton(node) {
    const control = node?.closest?.("a, button, [role='button']");
    if (!control) return null;
    const label = cleanText(control.textContent).toLowerCase();
    const href = control.getAttribute("href") || "";
    const action = control.dataset?.mobileAction || "";
    if (action === "feedback") return control;
    if (control.classList?.contains("mobile-add-feedback-button")) return control;
    if (href === "#nts" && /пожел|нтс|добав|остав/.test(label)) return control;
    if (/пожел|добавить/.test(label) && !/скопировать/.test(label)) return control;
    return null;
  }

  function markFeedbackButtons() {
    Array.from(document.querySelectorAll("a, button, [role='button']")).forEach((node) => {
      const label = cleanText(node.textContent).toLowerCase();
      const href = node.getAttribute?.("href") || "";
      if ((/пожел|добавить/.test(label) && !/скопировать/.test(label)) || href === "#nts") {
        node.classList.add("mobile-add-feedback-button");
        node.dataset.mobileAction = "feedback";
        if (cleanText(node.textContent).length > 14 && /пожел/.test(label)) node.textContent = "Пожелание";
      }
    });
  }

  function ensureFallbackForm() {
    const existing = $("#ntsForm") || $("#ntsFeedbackForm") || $("#showcaseQuickFeedbackForm");
    if (existing) return existing;

    const section = document.createElement("section");
    section.className = "section showcase-quick-feedback";
    section.id = "showcaseQuickFeedback";
    section.innerHTML = `
      <div class="section-title compact"><div><p class="eyebrow">НТС</p><h2>Добавить пожелание</h2></div></div>
      <form class="feedback-form" id="showcaseQuickFeedbackForm">
        <label><span>ФИО</span><input name="author" required placeholder="ФИО"></label>
        <label><span>Роль</span><input name="role" placeholder="член НТС, эксперт"></label>
        <label><span>Проект</span><input name="project" placeholder="Ко всему портфелю"></label>
        <label><span>Приоритет</span><select name="priority"><option value="средний">средний</option><option value="высокий">высокий</option><option value="критический">критический</option></select></label>
        <label class="wide"><span>Пожелание</span><textarea name="message" rows="5" required placeholder="Напишите пожелание, замечание, риск или вопрос"></textarea></label>
        <button class="button primary wide" type="submit">Отправить пожелание</button>
      </form>
    `;
    (document.querySelector("main") || document.body).appendChild(section);
    return section.querySelector("form");
  }

  function openFeedbackForm() {
    const form = ensureFallbackForm();
    const section = $("#nts") || $("#nts-feedback") || form.closest("section") || document.body;
    document.body.classList.add("showcase-feedback-open");
    section.hidden = false;
    form.hidden = false;
    section.style.display = "";
    form.style.display = "";
    section.classList.add("showcase-form-highlight");
    form.classList.add("showcase-form-highlight");
    closeMenu();
    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => form.querySelector("input, textarea, select")?.focus({ preventScroll: true }), 360);
      toast("Форма пожелания открыта");
    }, 60);
    setTimeout(() => {
      section.classList.remove("showcase-form-highlight");
      form.classList.remove("showcase-form-highlight");
    }, 2400);
  }

  function attachFeedbackClick() {
    if (window.__emergencyFeedbackClick) return;
    window.__emergencyFeedbackClick = true;
    document.addEventListener("click", (event) => {
      const button = isFeedbackButton(event.target);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openFeedbackForm();
    }, true);
  }

  async function submitForm(form) {
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = "Отправляем...";
    }
    const data = new FormData(form);
    data.set("formKey", "NTS_TECHNOPARK_2026");
    data.set("source", "mobile_emergency");
    data.set("status", "новое");
    data.set("createdAt", new Date().toISOString());
    try {
      await fetch(SCRIPT_URL, { method: "POST", body: data, mode: "no-cors" });
      form.reset();
      toast("Пожелание отправлено");
      setTimeout(() => document.querySelector("#refreshData, #refreshSheet, #refresh")?.click(), 1200);
    } catch (error) {
      console.error(error);
      toast("Не удалось отправить пожелание", true);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || "Отправить пожелание";
      }
    }
  }

  function attachSubmit() {
    document.querySelectorAll("#ntsForm, #ntsFeedbackForm, #showcaseQuickFeedbackForm").forEach((form) => {
      if (form.dataset.emergencySubmit) return;
      form.dataset.emergencySubmit = "1";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitForm(form);
      }, true);
    });
  }

  function removeLegacyButtons() {
    Array.from(document.querySelectorAll(".showcase-controls, .showcase-demo-icon, #showcaseDemoToggle, #showcaseCopyBrief")).forEach((node) => node.remove());
  }

  function patchAll() {
    normalizeStickyBar();
    patchMenu();
    markFeedbackButtons();
    attachFeedbackClick();
    attachSubmit();
    removeLegacyButtons();
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
    setTimeout(patchAll, 300);
    setTimeout(patchAll, 900);
    setTimeout(patchAll, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
