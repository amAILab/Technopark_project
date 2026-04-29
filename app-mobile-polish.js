/*
  Экстренная мобильная полировка перед показом.
  Главное: кнопка «Добавить пожелание» открывает форму в модальном окне.
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
    if (!$('link[href="styles-mobile-polish.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "styles-mobile-polish.css";
      document.head.appendChild(link);
    }

    if ($("#feedbackModalEmergencyStyles")) return;
    const style = document.createElement("style");
    style.id = "feedbackModalEmergencyStyles";
    style.textContent = `
      body.feedback-modal-open { overflow: hidden !important; }
      .feedback-modal-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(15, 23, 42, .42);
        backdrop-filter: blur(12px);
      }
      .feedback-modal-backdrop.is-open { display: flex !important; }
      .feedback-modal-card {
        width: min(680px, 100%);
        max-height: min(760px, calc(100vh - 36px));
        overflow: auto;
        border-radius: 28px;
        background: #fff;
        box-shadow: 0 32px 90px rgba(15, 23, 42, .28);
        border: 1px solid rgba(226, 232, 240, .95);
      }
      .feedback-modal-head {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 18px 12px;
        background: rgba(255,255,255,.96);
        border-bottom: 1px solid rgba(226, 232, 240, .9);
        backdrop-filter: blur(10px);
      }
      .feedback-modal-head h2 { margin: 0; font-size: 22px; line-height: 1.1; color: #0f172a; }
      .feedback-modal-head p { margin: 4px 0 0; color: #64748b; font-size: 13px; line-height: 1.35; }
      .feedback-modal-close {
        width: 44px; height: 44px; min-width: 44px;
        border: 1px solid #dfe6ef; border-radius: 16px;
        background: #fff; color: #0f172a; font-size: 28px; line-height: 1;
        display: grid; place-items: center; cursor: pointer;
      }
      .feedback-modal-form { display: grid; gap: 12px; padding: 16px 18px 18px; }
      .feedback-modal-form label { display: grid; gap: 7px; font-weight: 900; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .02em; }
      .feedback-modal-form input,
      .feedback-modal-form select,
      .feedback-modal-form textarea {
        width: 100%; box-sizing: border-box;
        border: 1px solid #dfe6ef; border-radius: 16px;
        padding: 13px 14px; background: #fff; color: #0f172a;
        font: inherit; font-size: 16px; line-height: 1.35; outline: none;
      }
      .feedback-modal-form textarea { min-height: 132px; resize: vertical; }
      .feedback-modal-form input:focus,
      .feedback-modal-form select:focus,
      .feedback-modal-form textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, .12); }
      .feedback-modal-actions { display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px; margin-top: 4px; }
      .feedback-modal-actions button {
        min-height: 52px; border-radius: 18px; padding: 0 14px; font-weight: 950; font-size: 15px; cursor: pointer;
      }
      .feedback-modal-cancel { border: 1px solid #dfe6ef; background: #fff; color: #0f172a; }
      .feedback-modal-submit { border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; }
      .feedback-modal-submit:disabled { opacity: .68; cursor: wait; }
      @media (max-width: 760px) {
        .feedback-modal-backdrop { align-items: stretch; justify-content: stretch; padding: 0; }
        .feedback-modal-card { width: 100%; max-height: none; height: 100%; border-radius: 0; border: 0; }
        .feedback-modal-head { padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px; }
        .feedback-modal-form { padding: 14px 16px calc(18px + env(safe-area-inset-bottom, 0px)); }
        .feedback-modal-actions { grid-template-columns: 1fr; }
        .feedback-modal-actions button { min-height: 54px; }
      }
    `;
    document.head.appendChild(style);
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
    const control = node?.closest?.("a, button, [role='button'], [data-mobile-action]");
    if (!control) return null;
    const label = cleanText(control.textContent).toLowerCase();
    const href = control.getAttribute("href") || "";
    const action = control.dataset?.mobileAction || "";
    const aria = cleanText(control.getAttribute("aria-label") || "").toLowerCase();
    const title = cleanText(control.getAttribute("title") || "").toLowerCase();
    const combined = `${label} ${aria} ${title}`;
    if (action === "feedback") return control;
    if (control.classList?.contains("mobile-add-feedback-button")) return control;
    if (href === "#nts" && /пожел|нтс|добав|остав/.test(combined)) return control;
    if (/(^|\s)(пожелание|пожелания|пожеланий)($|\s)/.test(combined)) return control;
    if (/добавить/.test(combined) && /пожел/.test(combined)) return control;
    return null;
  }

  function markFeedbackButtons() {
    Array.from(document.querySelectorAll("a, button, [role='button']")).forEach((node) => {
      const label = cleanText(node.textContent).toLowerCase();
      const aria = cleanText(node.getAttribute?.("aria-label") || "").toLowerCase();
      const href = node.getAttribute?.("href") || "";
      const combined = `${label} ${aria}`;
      if ((/пожел/.test(combined) && !/скопировать/.test(combined)) || href === "#nts") {
        node.classList.add("mobile-add-feedback-button");
        node.dataset.mobileAction = "feedback";
        node.setAttribute("aria-label", "Добавить пожелание НТС");
      }
    });
  }

  function ensureFeedbackModal() {
    let modal = $("#feedbackModalEmergency");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "feedbackModalEmergency";
    modal.className = "feedback-modal-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="feedback-modal-card">
        <div class="feedback-modal-head">
          <div>
            <h2>Добавить пожелание НТС</h2>
            <p>Заполните форму. После отправки окно закроется автоматически.</p>
          </div>
          <button class="feedback-modal-close" type="button" aria-label="Закрыть форму">×</button>
        </div>
        <form class="feedback-modal-form" id="feedbackModalEmergencyForm">
          <label><span>ФИО</span><input name="author" required placeholder="Фамилия Имя Отчество"></label>
          <label><span>Роль / статус</span><input name="role" placeholder="член НТС, эксперт, руководитель"></label>
          <label><span>Проект</span><input name="project" placeholder="Ко всему портфелю или название проекта"></label>
          <label><span>Тип</span><select name="type"><option value="пожелание">пожелание</option><option value="замечание">замечание</option><option value="риск">риск</option><option value="идея">идея</option><option value="вопрос">вопрос</option><option value="решение НТС">решение НТС</option></select></label>
          <label><span>Приоритет</span><select name="priority"><option value="средний">средний</option><option value="низкий">низкий</option><option value="высокий">высокий</option><option value="критический">критический</option></select></label>
          <label><span>Текст пожелания</span><textarea name="message" required placeholder="Напишите пожелание, замечание, риск, идею или вопрос"></textarea></label>
          <div class="feedback-modal-actions">
            <button class="feedback-modal-cancel" type="button">Закрыть</button>
            <button class="feedback-modal-submit" type="submit">Отправить пожелание</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest(".feedback-modal-close, .feedback-modal-cancel")) closeFeedbackModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeFeedbackModal();
    });
    modal.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitForm(event.currentTarget, true);
    }, true);

    return modal;
  }

  function openFeedbackModal() {
    loadStyle();
    const modal = ensureFeedbackModal();
    closeMenu();
    document.body.classList.add("feedback-modal-open");
    modal.classList.add("is-open");
    setTimeout(() => modal.querySelector("input, textarea, select")?.focus({ preventScroll: true }), 120);
  }

  function closeFeedbackModal() {
    const modal = $("#feedbackModalEmergency");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("feedback-modal-open");
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
      openFeedbackModal();
    }, true);
  }

  async function submitForm(form, closeAfter) {
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = "Отправляем...";
    }
    const data = new FormData(form);
    data.set("formKey", "NTS_TECHNOPARK_2026");
    data.set("source", "feedback_modal");
    data.set("status", "новое");
    data.set("createdAt", new Date().toISOString());
    try {
      await fetch(SCRIPT_URL, { method: "POST", body: data, mode: "no-cors" });
      form.reset();
      if (closeAfter) closeFeedbackModal();
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
        submitForm(form, false);
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
