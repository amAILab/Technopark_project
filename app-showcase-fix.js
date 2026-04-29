/*
  Предпоказовый слой надежности интерфейса.
  Не меняет структуру данных Google Sheets: только страхует кнопки, якоря, внешние ссылки и форму НТС.
*/
(function () {
  const NEW_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec";
  const FORM_KEY = "NTS_TECHNOPARK_2026";

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
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

  function currentMetrics() {
    const total = numberFrom(["#kpiTotal", "#totalProjects", "#kTotal"]);
    const active = numberFrom(["#kpiActive"]);
    const ready = numberFrom(["#kpiReady", "#readyCount", "#kReady"]);
    const risks = numberFrom(["#kpiRisks", "#riskCount", "#kRisk"]);
    const feedback = numberFrom(["#kpiFeedback"]);
    const urgent = numberFrom(["#urgentGrants", "#kSoon"]);
    return { total, active, ready, risks, feedback, urgent };
  }

  function buildBriefText() {
    const m = currentMetrics();
    const total = m.total || "уточняется";
    const ready = m.ready || 0;
    const risks = m.risks || 0;
    const urgent = m.urgent || 0;
    const feedback = m.feedback || 0;
    return `Краткая сводка по панели Технопарка РГСУ: в реестре ${total} проектов, ${ready} готовы к грантовой упаковке, ${risks} требуют действий или уточнений, ${urgent} имеют ближайшие дедлайны. Получено ${feedback} пожеланий НТС. Основной фокус до 1 июня - отобрать зрелые проекты, закрыть паспорта, сметы, письма партнеров и подготовить первые грантовые заявки.`;
  }

  async function copyBrief() {
    const text = buildBriefText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Краткая сводка для НТС скопирована");
    } catch (error) {
      console.warn("Не удалось скопировать через clipboard", error);
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Краткая сводка для НТС скопирована");
    }
  }

  function ensureShowcaseControls() {
    if ($("#showcaseControls")) return;
    const target = $(".header-actions") || $(".topbar-actions") || $(".topbar__actions") || $(".actions") || $("header") || document.body;
    const controls = document.createElement("div");
    controls.className = "showcase-controls";
    controls.id = "showcaseControls";
    controls.innerHTML = `
      <button class="button ghost showcase-control" id="showcaseDemoToggle" type="button">Режим показа</button>
      <button class="button ghost showcase-control" id="showcaseCopyBrief" type="button">Скопировать сводку</button>
    `;
    target.appendChild(controls);
  }

  function updateDemoButton() {
    const button = $("#showcaseDemoToggle");
    if (!button) return;
    button.textContent = document.body.classList.contains("showcase-demo") ? "Обычный режим" : "Режим показа";
    button.setAttribute("aria-pressed", document.body.classList.contains("showcase-demo") ? "true" : "false");
  }

  function setDemoMode(enabled) {
    document.body.classList.toggle("showcase-demo", enabled);
    try {
      localStorage.setItem("technopark_showcase_demo", enabled ? "1" : "0");
    } catch (error) {
      console.warn("Не удалось сохранить режим показа", error);
    }
    updateDemoButton();
    toast(enabled ? "Режим показа включен" : "Обычный режим включен");
  }

  function restoreDemoMode() {
    try {
      setDemoMode(localStorage.getItem("technopark_showcase_demo") === "1");
    } catch (error) {
      updateDemoButton();
    }
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

      if (button.id === "showcaseDemoToggle") setDemoMode(!document.body.classList.contains("showcase-demo"));
      if (button.id === "showcaseCopyBrief") copyBrief();

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
    const forms = [$("#ntsForm"), $("#ntsFeedbackForm")].filter(Boolean);
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
      <b>Есть режим показа, краткая сводка, проверка кнопок, якорей, внешних ссылок и формы НТС</b>
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
      observeMetrics.timer = setTimeout(updateExecutiveBrief, 180);
    });
    window.__showcaseMetricsObserver.observe(root, { childList: true, subtree: true, characterData: true });
    setInterval(updateExecutiveBrief, 4000);
  }

  function init() {
    markBody();
    fixExternalLinks();
    smoothAnchors();
    ensureShowcaseControls();
    ensureExecutiveBrief();
    addButtonDiagnostics();
    improveFormState();
    ensureShowcaseChecklist();
    restoreDemoMode();
    checkHashOnLoad();
    updateExecutiveBrief();
    observeMetrics();
    setTimeout(updateExecutiveBrief, 1200);
    setTimeout(updateExecutiveBrief, 3200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
