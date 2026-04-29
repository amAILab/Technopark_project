/*
  Предпоказовый слой надежности интерфейса.
  Не меняет структуру данных Google Sheets: страхует кнопки, якоря, внешние ссылки и форму НТС.
*/
(function () {
  const NEW_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec";
  const FORM_KEY = "NTS_TECHNOPARK_2026";

  function $(selector) {
    return document.querySelector(selector);
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function numberFrom(selectorList) {
    for (const selector of selectorList) {
      const node = $(selector);
      if (!node) continue;
      const match = cleanText(node.textContent).match(/\d+/);
      if (match) return Number(match[0]);
    }
    return 0;
  }

  function toast(message, isError) {
    let stack = $("#toastStack");
    if (!stack) {
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
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      item.classList.remove("is-visible");
      setTimeout(() => item.remove(), 240);
    }, 3600);
  }

  function markBody() {
    document.body.classList.add("showcase-ready");
    document.body.classList.remove("showcase-demo");
    try {
      localStorage.removeItem("technopark_showcase_demo");
    } catch (error) {
      console.warn("Не удалось очистить режим показа", error);
    }
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

  function feedbackForm() {
    return $("#ntsForm") || $("#ntsFeedbackForm") || $("#showcaseQuickFeedbackForm");
  }

  function feedbackSection() {
    const form = feedbackForm();
    return $("#nts") || $("#nts-feedback") || form?.closest("section") || $("main") || document.body;
  }

  function isFeedbackTrigger(node) {
    const control = node?.closest?.("a, button, [role='button'], [data-mobile-action]");
    if (!control) return false;
    const label = cleanText(control.textContent).toLowerCase();
    const href = control.getAttribute("href") || "";
    const action = control.dataset?.mobileAction || "";
    if (action === "feedback") return true;
    if (control.classList?.contains("mobile-add-feedback-button")) return true;
    if (href === "#nts" && /пожел|нтс|добавить|оставить/.test(label)) return true;
    return /(^|\s)пожелание($|\s)|пожелания|пожеланий|добавить\s+пожелание|оставить\s+пожелание|пожелание\s+нтс/.test(label);
  }

  function ensureQuickFeedbackFallback() {
    if (feedbackForm() || $("#showcaseQuickFeedback")) return;
    const section = document.createElement("section");
    section.className = "section showcase-quick-feedback";
    section.id = "showcaseQuickFeedback";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Научно-технический совет</p>
          <h2>Добавить пожелание НТС</h2>
        </div>
        <p>Резервная форма для версии показа. Запись отправляется в Google Таблицу.</p>
      </div>
      <form class="feedback-form" id="showcaseQuickFeedbackForm">
        <label><span>ФИО</span><input name="author" required placeholder="Фамилия Имя Отчество"></label>
        <label><span>Роль / статус</span><input name="role" placeholder="член НТС, эксперт, руководитель направления"></label>
        <label><span>Проект</span><input name="project" placeholder="Ко всему портфелю или название проекта"></label>
        <label><span>Приоритет</span><select name="priority"><option value="средний">средний</option><option value="низкий">низкий</option><option value="высокий">высокий</option><option value="критический">критический</option></select></label>
        <label class="wide"><span>Текст пожелания</span><textarea name="message" rows="5" required placeholder="Напишите пожелание, замечание, риск, идею или вопрос"></textarea></label>
        <button class="button primary wide" type="submit">Отправить пожелание</button>
      </form>
    `;
    const main = $("main") || document.body;
    main.appendChild(section);
  }

  function openFeedbackForm() {
    ensureQuickFeedbackFallback();
    const form = feedbackForm();
    const section = feedbackSection();
    if (!form || !section) {
      toast("Форма пожеланий НТС не найдена. Обновите страницу.", true);
      return;
    }

    document.body.classList.add("showcase-feedback-open");
    section.hidden = false;
    form.hidden = false;
    section.style.display = "";
    form.style.display = "";
    section.classList.add("showcase-form-highlight");
    form.classList.add("showcase-form-highlight");

    closeMobileMenu();
    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstField = form.querySelector("input, textarea, select");
      setTimeout(() => firstField?.focus({ preventScroll: true }), 420);
      toast("Форма пожелания НТС открыта");
    }, 80);

    setTimeout(() => {
      section.classList.remove("showcase-form-highlight");
      form.classList.remove("showcase-form-highlight");
    }, 2600);
  }

  function attachFeedbackOpenEvents() {
    document.addEventListener("click", (event) => {
      if (!isFeedbackTrigger(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openFeedbackForm();
    }, true);
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

  function currentMetrics() {
    const total = numberFrom(["#kpiTotal", "#totalProjects", "#kTotal"]);
    const active = numberFrom(["#kpiActive"]);
    const ready = numberFrom(["#kpiReady", "#readyCount", "#kReady"]);
    const risks = numberFrom(["#kpiRisks", "#riskCount", "#kRisk"]);
    const feedback = numberFrom(["#kpiFeedback"]);
    const urgent = numberFrom(["#urgentGrants", "#kSoon"]);
    return { total, active, ready, risks, feedback, urgent };
  }

  function removeShowcaseControls() {
    $("#showcaseControls")?.remove();
    $("#showcaseDemoToggle")?.remove();
    $("#showcaseCopyBrief")?.remove();
    document.querySelectorAll(".showcase-demo-icon").forEach((node) => node.remove());
  }

  function ensureExecutiveBrief() {
    if ($("#showcaseBrief")) return;
    const anchor = $("#overview") || $(".workspace-head") || $(".summary") || $("main") || document.body;
    const brief = document.createElement("section");
    brief.className = "showcase-brief";
    brief.id = "showcaseBrief";
    brief.innerHTML = `
      <div>
        <p class="eyebrow">Главное за 30 секунд</p>
        <h2>Управленческая сводка перед НТС</h2>
        <p id="showcaseBriefText">Данные загружаются из Google Таблицы...</p>
      </div>
      <div class="showcase-brief-grid">
        <article><span>Проекты</span><strong id="showcaseBriefTotal">0</strong><small>в реестре</small></article>
        <article><span>К грантам</span><strong id="showcaseBriefReady">0</strong><small>готовы или почти готовы</small></article>
        <article><span>Действия</span><strong id="showcaseBriefRisks">0</strong><small>нужны уточнения</small></article>
        <article><span>НТС</span><strong id="showcaseBriefFeedback">0</strong><small>пожеланий</small></article>
      </div>
    `;
    if (anchor.id === "overview") anchor.insertAdjacentElement("afterend", brief);
    else anchor.insertAdjacentElement("afterbegin", brief);
  }

  function updateExecutiveBrief() {
    const brief = $("#showcaseBrief");
    if (!brief) return;
    const m = currentMetrics();
    const totalText = m.total || "0";
    const focus = m.urgent > 0 ? `Есть ${m.urgent} ближайших дедлайнов.` : "Ближайшие дедлайны требуют проверки по календарю грантов.";
    setNodeText("#showcaseBriefTotal", totalText);
    setNodeText("#showcaseBriefReady", m.ready || 0);
    setNodeText("#showcaseBriefRisks", m.risks || 0);
    setNodeText("#showcaseBriefFeedback", m.feedback || 0);
    setNodeText("#showcaseBriefText", `В реестре ${totalText} проектов. ${m.ready || 0} готовы к грантовой упаковке, ${m.risks || 0} требуют действий или уточнений. ${focus} Главный фокус до 1 июня - закрыть паспорта, сметы, письма партнеров и подать первые заявки.`);
  }

  function setNodeText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function addButtonDiagnostics() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.id === "refreshData" || button.id === "refreshSheet" || button.id === "refresh") {
        setTimeout(updateExecutiveBrief, 1200);
        setTimeout(() => {
          const status = $("#syncStatus")?.textContent || $("#syncText")?.textContent || "";
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

  function setSubmitState(form, isLoading) {
    const submit = form.querySelector('button[type="submit"]');
    if (!submit) return;
    submit.disabled = isLoading;
    submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
    submit.textContent = isLoading ? "Отправляем..." : (submit.dataset.originalText || "Отправить пожелание");
  }

  function buildPayload(form) {
    const formData = new FormData(form);
    formData.set("formKey", FORM_KEY);
    formData.set("source", "site_showcase");
    formData.set("status", "новое");
    formData.set("createdAt", new Date().toISOString());
    return formData;
  }

  async function submitNtsForm(form) {
    if (!form.reportValidity()) return;
    setSubmitState(form, true);

    try {
      const response = await fetch(NEW_SCRIPT_URL, {
        method: "POST",
        body: buildPayload(form),
        redirect: "follow",
      });

      if (!response.ok && response.type !== "opaque") {
        throw new Error(`HTTP ${response.status}`);
      }

      form.reset();
      toast("Пожелание НТС отправлено в таблицу");
      setTimeout(() => document.querySelector("#refreshData")?.click(), 900);
      setTimeout(updateExecutiveBrief, 1800);
    } catch (error) {
      console.warn("Основная отправка формы НТС не прошла, пробуем no-cors", error);
      try {
        await fetch(NEW_SCRIPT_URL, {
          method: "POST",
          body: buildPayload(form),
          mode: "no-cors",
        });
        form.reset();
        toast("Пожелание отправлено. Если запись не появилась сразу, нажмите Обновить через несколько секунд.");
      } catch (secondError) {
        console.error("Форма НТС не отправлена", secondError);
        toast("Не удалось отправить пожелание. Проверьте Apps Script и доступ к таблице.", true);
      }
    } finally {
      setSubmitState(form, false);
    }
  }

  function improveFormState() {
    const forms = [$("#ntsForm"), $("#ntsFeedbackForm"), $("#showcaseQuickFeedbackForm")].filter(Boolean);
    forms.forEach((form) => {
      if (form.dataset.showcaseFixed) return;
      form.dataset.showcaseFixed = "1";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitNtsForm(form);
      }, true);
    });
  }

  function ensureShowcaseChecklist() {
    if ($("#showcaseChecklist")) return;
    const overview = $("#overview .overview-head") || $(".workspace-head") || $(".topbar__content") || $(".top") || $("header");
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

  function observeMetrics() {
    const root = document.querySelector("main") || document.body;
    if (!root || window.__showcaseMetricsObserver) return;
    window.__showcaseMetricsObserver = new MutationObserver(() => {
      clearTimeout(observeMetrics.timer);
      observeMetrics.timer = setTimeout(() => {
        removeShowcaseControls();
        updateExecutiveBrief();
      }, 180);
    });
    window.__showcaseMetricsObserver.observe(root, { childList: true, subtree: true, characterData: true });
    setInterval(() => {
      removeShowcaseControls();
      updateExecutiveBrief();
    }, 4000);
  }

  function init() {
    markBody();
    fixExternalLinks();
    attachFeedbackOpenEvents();
    smoothAnchors();
    removeShowcaseControls();
    ensureExecutiveBrief();
    addButtonDiagnostics();
    ensureQuickFeedbackFallback();
    improveFormState();
    ensureShowcaseChecklist();
    checkHashOnLoad();
    updateExecutiveBrief();
    observeMetrics();
    setTimeout(removeShowcaseControls, 300);
    setTimeout(updateExecutiveBrief, 1200);
    setTimeout(removeShowcaseControls, 1800);
    setTimeout(updateExecutiveBrief, 3200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
