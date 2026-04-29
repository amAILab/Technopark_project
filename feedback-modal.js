/*
  Прямой обработчик кнопки «Добавить пожелание».
  Подключается последним и не зависит от остальных слоев сайта.
*/
(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec";

  const $ = (selector) => document.querySelector(selector);
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

  function addStyles() {
    if ($("#feedbackModalDirectStyles")) return;
    const style = document.createElement("style");
    style.id = "feedbackModalDirectStyles";
    style.textContent = `
      body.feedback-direct-open { overflow: hidden !important; }
      .feedback-direct-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 18px !important;
        background: rgba(15, 23, 42, .46) !important;
        backdrop-filter: blur(12px) !important;
      }
      .feedback-direct-backdrop.is-open { display: flex !important; }
      .feedback-direct-card {
        width: min(700px, 100%) !important;
        max-height: min(780px, calc(100vh - 36px)) !important;
        overflow: auto !important;
        border-radius: 28px !important;
        background: #fff !important;
        color: #0f172a !important;
        box-shadow: 0 34px 100px rgba(15, 23, 42, .32) !important;
        border: 1px solid rgba(226, 232, 240, .96) !important;
      }
      .feedback-direct-head {
        position: sticky !important;
        top: 0 !important;
        z-index: 2 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 18px 18px 12px !important;
        background: rgba(255,255,255,.96) !important;
        border-bottom: 1px solid rgba(226, 232, 240, .9) !important;
        backdrop-filter: blur(10px) !important;
      }
      .feedback-direct-head h2 { margin: 0 !important; font-size: 22px !important; line-height: 1.1 !important; color: #0f172a !important; }
      .feedback-direct-head p { margin: 4px 0 0 !important; color: #64748b !important; font-size: 13px !important; line-height: 1.35 !important; }
      .feedback-direct-close {
        width: 44px !important; height: 44px !important; min-width: 44px !important;
        border: 1px solid #dfe6ef !important; border-radius: 16px !important;
        background: #fff !important; color: #0f172a !important; font-size: 28px !important; line-height: 1 !important;
        display: grid !important; place-items: center !important; cursor: pointer !important;
      }
      .feedback-direct-form { display: grid !important; gap: 12px !important; padding: 16px 18px 18px !important; }
      .feedback-direct-form label { display: grid !important; gap: 7px !important; font-weight: 900 !important; color: #64748b !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: .02em !important; }
      .feedback-direct-form input,
      .feedback-direct-form select,
      .feedback-direct-form textarea {
        width: 100% !important; box-sizing: border-box !important;
        border: 1px solid #dfe6ef !important; border-radius: 16px !important;
        padding: 13px 14px !important; background: #fff !important; color: #0f172a !important;
        font: inherit !important; font-size: 16px !important; line-height: 1.35 !important; outline: none !important;
      }
      .feedback-direct-form textarea { min-height: 132px !important; resize: vertical !important; }
      .feedback-direct-form input:focus,
      .feedback-direct-form select:focus,
      .feedback-direct-form textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 4px rgba(37, 99, 235, .12) !important; }
      .feedback-direct-actions { display: grid !important; grid-template-columns: 1fr 1.25fr !important; gap: 10px !important; margin-top: 4px !important; }
      .feedback-direct-actions button { min-height: 52px !important; border-radius: 18px !important; padding: 0 14px !important; font-weight: 950 !important; font-size: 15px !important; cursor: pointer !important; }
      .feedback-direct-cancel { border: 1px solid #dfe6ef !important; background: #fff !important; color: #0f172a !important; }
      .feedback-direct-submit { border: 1px solid #1d4ed8 !important; background: #1d4ed8 !important; color: #fff !important; }
      .feedback-direct-submit:disabled { opacity: .68 !important; cursor: wait !important; }
      @media (max-width: 760px) {
        .feedback-direct-backdrop { align-items: stretch !important; justify-content: stretch !important; padding: 0 !important; }
        .feedback-direct-card { width: 100% !important; max-height: none !important; height: 100% !important; border-radius: 0 !important; border: 0 !important; }
        .feedback-direct-head { padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px !important; }
        .feedback-direct-form { padding: 14px 16px calc(18px + env(safe-area-inset-bottom, 0px)) !important; }
        .feedback-direct-actions { grid-template-columns: 1fr !important; }
        .feedback-direct-actions button { min-height: 54px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    addStyles();
    let modal = $("#feedbackModalDirect");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "feedbackModalDirect";
    modal.className = "feedback-direct-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="feedback-direct-card">
        <div class="feedback-direct-head">
          <div>
            <h2>Добавить пожелание НТС</h2>
            <p>Заполните форму. После отправки окно закроется автоматически.</p>
          </div>
          <button class="feedback-direct-close" type="button" aria-label="Закрыть форму">×</button>
        </div>
        <form class="feedback-direct-form" id="feedbackModalDirectForm">
          <label><span>ФИО</span><input name="author" required placeholder="Фамилия Имя Отчество"></label>
          <label><span>Роль / статус</span><input name="role" placeholder="член НТС, эксперт, руководитель"></label>
          <label><span>Проект</span><input name="project" placeholder="Ко всему портфелю или название проекта"></label>
          <label><span>Тип</span><select name="type"><option value="пожелание">пожелание</option><option value="замечание">замечание</option><option value="риск">риск</option><option value="идея">идея</option><option value="вопрос">вопрос</option><option value="решение НТС">решение НТС</option></select></label>
          <label><span>Приоритет</span><select name="priority"><option value="средний">средний</option><option value="низкий">низкий</option><option value="высокий">высокий</option><option value="критический">критический</option></select></label>
          <label><span>Текст пожелания</span><textarea name="message" required placeholder="Напишите пожелание, замечание, риск, идею или вопрос"></textarea></label>
          <div class="feedback-direct-actions">
            <button class="feedback-direct-cancel" type="button">Закрыть</button>
            <button class="feedback-direct-submit" type="submit">Отправить пожелание</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest(".feedback-direct-close, .feedback-direct-cancel")) closeModal();
    });

    modal.querySelector("form").addEventListener("submit", submitForm, true);
    return modal;
  }

  function openModal() {
    const modal = ensureModal();
    document.body.classList.add("feedback-direct-open");
    modal.classList.add("is-open");
    setTimeout(() => modal.querySelector("input, textarea, select")?.focus({ preventScroll: true }), 120);
  }

  function closeModal() {
    const modal = $("#feedbackModalDirect");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("feedback-direct-open");
  }

  function isFeedbackTrigger(target) {
    const control = target?.closest?.("a, button, [role='button'], [data-mobile-action]");
    if (!control) return false;
    const label = clean(control.textContent).toLowerCase();
    const aria = clean(control.getAttribute("aria-label") || "").toLowerCase();
    const href = control.getAttribute("href") || "";
    const action = control.dataset?.mobileAction || "";
    const text = `${label} ${aria}`;
    if (action === "feedback") return true;
    if (control.classList.contains("mobile-add-feedback-button")) return true;
    if (/пожел/.test(text) && !/скоп/.test(text)) return true;
    if (href === "#nts" && /пожел|добав|нтс/.test(text)) return true;
    return false;
  }

  function markButtons() {
    document.querySelectorAll("a, button, [role='button']").forEach((node) => {
      const label = clean(node.textContent).toLowerCase();
      const href = node.getAttribute("href") || "";
      if ((/пожел/.test(label) && !/скоп/.test(label)) || href === "#nts") {
        node.dataset.mobileAction = "feedback";
        node.classList.add("mobile-add-feedback-button");
        node.setAttribute("aria-label", "Добавить пожелание НТС");
      }
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = "Отправляем...";
    }
    const data = new FormData(form);
    data.set("formKey", "NTS_TECHNOPARK_2026");
    data.set("source", "direct_feedback_modal");
    data.set("status", "новое");
    data.set("createdAt", new Date().toISOString());
    try {
      await fetch(SCRIPT_URL, { method: "POST", body: data, mode: "no-cors" });
      form.reset();
      closeModal();
      alert("Пожелание отправлено");
      setTimeout(() => document.querySelector("#refreshData, #refreshSheet, #refresh")?.click(), 1000);
    } catch (error) {
      console.error(error);
      alert("Не удалось отправить пожелание. Проверьте подключение.");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || "Отправить пожелание";
      }
    }
  }

  function attach() {
    if (window.__directFeedbackModalAttached) return;
    window.__directFeedbackModalAttached = true;

    document.addEventListener("click", (event) => {
      if (!isFeedbackTrigger(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openModal();
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  function init() {
    markButtons();
    attach();
    setTimeout(markButtons, 300);
    setTimeout(markButtons, 1000);
    setTimeout(markButtons, 2500);
    new MutationObserver(() => markButtons()).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
