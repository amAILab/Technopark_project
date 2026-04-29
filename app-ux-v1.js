/*
  Финальный UX-слой v1.0 для панели Технопарка РГСУ.
  Задача: не менять Google Sheets и существующую бизнес-логику,
  а собрать уже созданные блоки в более спокойную управленческую структуру.

  Что делает файл:
  1. Добавляет липкую мини-панель KPI.
  2. Собирает ключевые блоки в «Центр управления» с вкладками.
  3. Добавляет счетчики во вкладки центра управления.
  4. Скрывает технические блоки в обычном рабочем режиме.
  5. Делает режим НТС более чистым.
  6. Добавляет кнопку «Показать технические блоки» для администратора.
*/

(function () {
  const CONTROL_TABS = [
    { id: "leaderDecisions", key: "decisions", label: "Решения", hint: "что принять" },
    { id: "weekPlan", key: "week", label: "7 дней", hint: "что сделать" },
    { id: "riskMatrix", key: "risks", label: "Риски", hint: "где узкие места" },
    { id: "nts", key: "nts", label: "НТС", hint: "повестка" },
  ];

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function numberText(selector) {
    return cleanText(document.querySelector(selector)?.textContent || "0");
  }

  function numberFromText(value) {
    const match = cleanText(value).match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function countVisible(selector) {
    return Array.from(document.querySelectorAll(selector)).filter((node) => {
      return node.offsetParent !== null || node.getClientRects().length > 0;
    }).length;
  }

  function ensureStickyKpi() {
    if (document.querySelector("#stickyKpi")) return;
    const bar = document.createElement("aside");
    bar.className = "sticky-kpi-bar";
    bar.id = "stickyKpi";
    bar.innerHTML = `
      <button type="button" data-sticky-scroll="overview">Панель</button>
      <span><b id="stickyTotal">0</b> проектов</span>
      <span><b id="stickyRisks">0</b> требуют действий</span>
      <span><b id="stickyReady">0</b> готовы к грантам</span>
      <span><b id="stickyNts">0%</b> НТС</span>
      <button type="button" data-sticky-scroll="controlCenter">К решениям</button>
    `;
    document.body.appendChild(bar);
  }

  function updateStickyKpi() {
    const total = document.querySelector("#stickyTotal");
    const risks = document.querySelector("#stickyRisks");
    const ready = document.querySelector("#stickyReady");
    const nts = document.querySelector("#stickyNts");
    if (!total || !risks || !ready || !nts) return;
    total.textContent = numberText("#kpiTotal");
    risks.textContent = numberText("#kpiRisks");
    ready.textContent = numberText("#kpiReady");
    nts.textContent = numberText("#ntsReadinessValue") || "0%";
  }

  function toggleStickyKpi() {
    const bar = document.querySelector("#stickyKpi");
    if (!bar) return;
    bar.classList.toggle("is-visible", window.scrollY > 360);
  }

  function ensureControlCenter() {
    const actions = document.querySelector("#actions");
    if (!actions || document.querySelector("#controlCenter")) return;

    const center = document.createElement("section");
    center.className = "section control-center";
    center.id = "controlCenter";
    center.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Главный рабочий экран</p>
          <h2>Центр управления</h2>
        </div>
        <p>Решения, план на 7 дней, риски и повестка НТС собраны в одном месте.</p>
      </div>
      <div class="control-tabs" role="tablist" aria-label="Центр управления">
        ${CONTROL_TABS.map((tab, index) => `
          <button type="button" role="tab" data-control-tab="${tab.key}" class="${index === 0 ? "is-active" : ""}">
            <span>${tab.label}<b class="control-tab-count" data-control-count="${tab.key}">0</b></span><small>${tab.hint}</small>
          </button>
        `).join("")}
      </div>
      <div class="control-panels" id="controlPanels"></div>
    `;

    actions.insertAdjacentElement("afterend", center);
  }

  function moveControlSections() {
    ensureControlCenter();
    const panels = document.querySelector("#controlPanels");
    if (!panels) return;

    CONTROL_TABS.forEach((tab, index) => {
      let panel = document.querySelector(`#controlPanel-${tab.key}`);
      if (!panel) {
        panel = document.createElement("div");
        panel.className = `control-panel ${index === 0 ? "is-active" : ""}`;
        panel.id = `controlPanel-${tab.key}`;
        panel.dataset.controlPanel = tab.key;
        panels.appendChild(panel);
      }

      const section = document.querySelector(`#${tab.id}`);
      if (section && section.parentElement !== panel) {
        section.classList.add("inside-control-center");
        panel.appendChild(section);
      }
    });
    updateControlCounters();
  }

  function controlCount(key) {
    if (key === "decisions") {
      return numberFromText(document.querySelector("#leaderDecisionsCount")?.textContent) || countVisible(".leader-decision");
    }
    if (key === "week") {
      return numberFromText(document.querySelector("#weekPlanCount")?.textContent) || countVisible(".week-task");
    }
    if (key === "risks") {
      const critical = numberFromText(document.querySelector(".risk-zone.critical header b")?.textContent);
      const packageZone = numberFromText(document.querySelector(".risk-zone.package header b")?.textContent);
      return critical + packageZone || countVisible(".risk-zone.critical .risk-zone-list button, .risk-zone.package .risk-zone-list button");
    }
    if (key === "nts") {
      return countVisible("#ntsAgenda .agenda-item, #decisionList .agenda-item, #feedbackFeed .feedback-item") || numberFromText(document.querySelector("#kpiFeedback")?.textContent);
    }
    return 0;
  }

  function updateControlCounters() {
    CONTROL_TABS.forEach((tab) => {
      const node = document.querySelector(`[data-control-count="${tab.key}"]`);
      if (!node) return;
      const value = controlCount(tab.key);
      node.textContent = String(value);
      node.classList.toggle("is-zero", value === 0);
    });
  }

  function setControlTab(key) {
    document.querySelectorAll("[data-control-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.controlTab === key);
    });
    document.querySelectorAll("[data-control-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.controlPanel === key);
    });
    try {
      localStorage.setItem("technopark_control_tab", key);
    } catch (error) {
      console.warn("Не удалось сохранить вкладку центра управления", error);
    }
  }

  function restoreControlTab() {
    try {
      const saved = localStorage.getItem("technopark_control_tab") || "decisions";
      if (CONTROL_TABS.some((tab) => tab.key === saved)) setControlTab(saved);
    } catch (error) {
      setControlTab("decisions");
    }
  }

  function ensureTechToggle() {
    if (document.querySelector("#techToggle")) return;
    const toolsPanel = document.querySelector("#toolsMenuPanel");
    const headerActions = document.querySelector(".header-actions");
    const button = document.createElement("button");
    button.type = "button";
    button.id = "techToggle";
    button.className = "button ghost tools-menu-item tech-toggle-button";
    button.textContent = "Технические блоки";
    if (toolsPanel) toolsPanel.appendChild(button);
    else headerActions?.appendChild(button);
  }

  function setTechVisible(enabled) {
    document.body.classList.toggle("show-tech-blocks", enabled);
    const button = document.querySelector("#techToggle");
    if (button) button.textContent = enabled ? "Скрыть тех. блоки" : "Технические блоки";
    try {
      localStorage.setItem("technopark_show_tech", enabled ? "1" : "0");
    } catch (error) {
      console.warn("Не удалось сохранить состояние тех. блоков", error);
    }
  }

  function restoreTechState() {
    try {
      setTechVisible(localStorage.getItem("technopark_show_tech") === "1");
    } catch (error) {
      setTechVisible(false);
    }
  }

  function markUxReady() {
    document.body.classList.add("ux-v1-ready");
  }

  function attachEvents() {
    window.addEventListener("scroll", toggleStickyKpi, { passive: true });

    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-control-tab]");
      if (tab) setControlTab(tab.dataset.controlTab);

      const sticky = event.target.closest("[data-sticky-scroll]");
      if (sticky) {
        document.querySelector(`#${sticky.dataset.stickyScroll}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (event.target.closest("#techToggle")) {
        setTechVisible(!document.body.classList.contains("show-tech-blocks"));
      }

      if (event.target.closest("[data-view-mode='audit'], #auditToggle")) {
        setTechVisible(true);
      }

      if (event.target.closest("[data-view-mode='work']")) {
        setTechVisible(false);
      }

      if (event.target.closest("[data-fast-filter], #resetFilters, #refreshData")) {
        setTimeout(updateControlCounters, 600);
      }
    });

    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          setTimeout(updateControlCounters, 420);
        }
      });
    });
  }

  function observePage() {
    const main = document.querySelector("main");
    if (!main || window.__uxV1Observer) return;
    window.__uxV1Observer = new MutationObserver(() => {
      setTimeout(() => {
        moveControlSections();
        updateStickyKpi();
        updateControlCounters();
        ensureTechToggle();
      }, 120);
    });
    window.__uxV1Observer.observe(main, { childList: true, subtree: true });
  }


  function setupSectionSpy() {
    const sections = Array.from(document.querySelectorAll("#overview, #actions, #projects, #quality, #funnel, #grants, #nts"));
    const links = Array.from(document.querySelectorAll(".main-nav a"));
    if (!sections.length || !links.length) return;

    document.addEventListener("click", (event) => {
      const link = event.target.closest('.main-nav a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    });

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`));
    }, { rootMargin: "-30% 0px -55% 0px", threshold: [0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  function init() {
    ensureStickyKpi();
    ensureControlCenter();
    ensureTechToggle();
    attachEvents();
    observePage();
    restoreTechState();
    restoreControlTab();
    markUxReady();
    setupSectionSpy();

    setTimeout(moveControlSections, 1000);
    setTimeout(moveControlSections, 2400);
    setTimeout(moveControlSections, 4800);
    setTimeout(updateStickyKpi, 1600);
    setTimeout(updateStickyKpi, 3600);
    setTimeout(updateControlCounters, 2200);
    setTimeout(updateControlCounters, 5200);
    setInterval(updateStickyKpi, 5000);
    setInterval(updateControlCounters, 5000);
    toggleStickyKpi();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
