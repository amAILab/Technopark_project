/*
  Меню «Инструменты» для разгрузки шапки.
  Автоматически переносит второстепенные кнопки в выпадающее меню,
  не меняет Google Sheets и не ломает существующие обработчики.
*/

(function () {
  const TOOL_BUTTON_IDS = [
    "copyDashboardSummary",
    "exportVisibleProjects",
    "auditToggle",
    "copyViewLink",
    "clearDashboardCache",
    "dashboardHelpToggle"
  ];

  function ensureMenu() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#toolsMenu")) return;

    const menu = document.createElement("div");
    menu.className = "tools-menu";
    menu.id = "toolsMenu";
    menu.innerHTML = `
      <button class="button ghost tools-menu-toggle" id="toolsMenuToggle" type="button" aria-expanded="false">Инструменты</button>
      <div class="tools-menu-panel" id="toolsMenuPanel" aria-label="Инструменты панели"></div>
    `;

    const addWish = actions.querySelector("a.button.primary");
    actions.insertBefore(menu, addWish || null);
  }

  function moveTools() {
    ensureMenu();
    const panel = document.querySelector("#toolsMenuPanel");
    if (!panel) return;

    TOOL_BUTTON_IDS.forEach((id) => {
      const button = document.querySelector(`#${id}`);
      if (!button || button.closest("#toolsMenuPanel")) return;
      button.classList.add("tools-menu-item");
      panel.appendChild(button);
    });
  }

  function toggleMenu(force) {
    const menu = document.querySelector("#toolsMenu");
    const toggle = document.querySelector("#toolsMenuToggle");
    if (!menu || !toggle) return;
    const open = typeof force === "boolean" ? force : !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#toolsMenuToggle")) {
        toggleMenu();
        return;
      }
      if (!event.target.closest("#toolsMenu")) toggleMenu(false);
      if (event.target.closest("#toolsMenuPanel button")) setTimeout(() => toggleMenu(false), 120);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") toggleMenu(false);
    });
  }

  function observeHeader() {
    const actions = document.querySelector(".header-actions");
    if (!actions || window.__toolsMenuObserver) return;
    window.__toolsMenuObserver = new MutationObserver(() => setTimeout(moveTools, 80));
    window.__toolsMenuObserver.observe(actions, { childList: true, subtree: true });
  }

  function init() {
    ensureMenu();
    attachEvents();
    observeHeader();
    setTimeout(moveTools, 900);
    setTimeout(moveTools, 1800);
    setTimeout(moveTools, 3200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
