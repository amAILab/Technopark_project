/*
  Переключатель режимов панели: Рабочий / НТС / Аудит.
  Объединяет существующие функции в понятный UX-контур.
  Google Sheets не изменяет.
*/

(function () {
  const MODES = [
    { key: "work", label: "Рабочий", hint: "полная панель" },
    { key: "nts", label: "НТС", hint: "показ и повестка" },
    { key: "audit", label: "Аудит", hint: "проверка перед показом" },
  ];

  function ensureModeSwitcher() {
    const overview = document.querySelector("#overview");
    if (!overview || document.querySelector("#viewModeSwitcher")) return;

    const switcher = document.createElement("section");
    switcher.className = "view-mode-switcher";
    switcher.id = "viewModeSwitcher";
    switcher.setAttribute("aria-label", "Режим панели");
    switcher.innerHTML = `
      <div>
        <p class="eyebrow">Режим панели</p>
        <strong id="viewModeTitle">Рабочий режим</strong>
        <small id="viewModeHint">полная панель управления проектами</small>
      </div>
      <div class="view-mode-buttons">
        ${MODES.map((mode) => `
          <button type="button" data-view-mode="${mode.key}" class="${mode.key === "work" ? "is-active" : ""}">
            <span>${mode.label}</span><small>${mode.hint}</small>
          </button>
        `).join("")}
      </div>
    `;
    overview.insertAdjacentElement("afterend", switcher);
  }

  function closeAuditPanel() {
    const audit = document.querySelector("#dashboardAudit");
    if (audit) audit.hidden = true;
  }

  function openAuditPanel() {
    const audit = document.querySelector("#dashboardAudit");
    if (!audit) return;
    audit.hidden = false;
    document.querySelector("#runAudit")?.click();
    audit.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setExecutiveMode(enabled) {
    const active = document.body.classList.contains("executive-mode");
    if (active !== enabled) document.querySelector("#executiveModeToggle")?.click();
  }

  function updateModeText(mode) {
    const title = document.querySelector("#viewModeTitle");
    const hint = document.querySelector("#viewModeHint");
    if (!title || !hint) return;

    if (mode === "nts") {
      title.textContent = "Режим НТС";
      hint.textContent = "скрыты второстепенные блоки, оставлены повестка и решения";
    } else if (mode === "audit") {
      title.textContent = "Режим аудита";
      hint.textContent = "проверка готовности панели перед показом";
    } else {
      title.textContent = "Рабочий режим";
      hint.textContent = "полная панель управления проектами";
    }
  }

  function updateActiveButton(mode) {
    document.querySelectorAll("[data-view-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.viewMode === mode);
    });
  }

  function setMode(mode) {
    if (mode === "nts") {
      closeAuditPanel();
      setExecutiveMode(true);
    } else if (mode === "audit") {
      setExecutiveMode(false);
      openAuditPanel();
    } else {
      closeAuditPanel();
      setExecutiveMode(false);
    }

    updateActiveButton(mode);
    updateModeText(mode);

    try {
      localStorage.setItem("technopark_view_mode", mode);
    } catch (error) {
      console.warn("Не удалось сохранить режим панели", error);
    }
  }

  function restoreMode() {
    try {
      const saved = localStorage.getItem("technopark_view_mode") || "work";
      if (["work", "nts", "audit"].includes(saved)) setMode(saved);
    } catch (error) {
      setMode("work");
    }
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view-mode]");
      if (button) setMode(button.dataset.viewMode);

      if (event.target.closest("#executiveModeToggle")) {
        setTimeout(() => {
          const isNts = document.body.classList.contains("executive-mode");
          updateActiveButton(isNts ? "nts" : "work");
          updateModeText(isNts ? "nts" : "work");
        }, 80);
      }

      if (event.target.closest("#auditToggle")) {
        setTimeout(() => {
          const auditOpen = document.querySelector("#dashboardAudit")?.hidden === false;
          updateActiveButton(auditOpen ? "audit" : "work");
          updateModeText(auditOpen ? "audit" : "work");
        }, 80);
      }
    });
  }

  function init() {
    ensureModeSwitcher();
    attachEvents();
    setTimeout(restoreMode, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
