/*
  Контроль публикации и версии панели.
  Показывает, какие модули подключены, какая версия интерфейса открыта
  и дает быстрые действия при проблемах с кешем GitHub Pages.
*/

(function () {
  const DASHBOARD_BUILD = "2026.04.29-final";
  const REQUIRED_MARKERS = [
    { label: "Компактная панель", selector: ".overview" },
    { label: "Пульс портфеля", selector: "#portfolioPulse" },
    { label: "Готовность к НТС", selector: "#ntsReadinessPanel" },
    { label: "Решения руководителя", selector: "#leaderDecisions" },
    { label: "Паспорт проекта", selector: ".project-passport" },
    { label: "Шкала готовности", selector: "#readinessScaleLegend" },
    { label: "Режимы панели", selector: "#viewModeSwitcher" },
    { label: "Меню инструментов", selector: "#toolsMenu" },
    { label: "Аудит", selector: "#dashboardAudit" },
    { label: "Нагрузка по ответственным", selector: "#ownerLoad" },
  ];

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function ensureDeployStatus() {
    const syncCard = document.querySelector(".sync-card");
    if (!syncCard || document.querySelector("#deployStatus")) return;

    const panel = document.createElement("details");
    panel.className = "deploy-status";
    panel.id = "deployStatus";
    panel.innerHTML = `
      <summary>Версия и публикация</summary>
      <div class="deploy-status-body">
        <div class="deploy-version">
          <strong>${DASHBOARD_BUILD}</strong>
          <small id="deployPageUrl"></small>
        </div>
        <div class="deploy-checks" id="deployChecks"></div>
        <div class="deploy-actions">
          <button type="button" id="hardReloadPage">Обновить без кеша</button>
          <button type="button" id="copyDeployReport">Копировать отчет</button>
        </div>
      </div>
    `;
    syncCard.appendChild(panel);
  }

  function collectChecks() {
    return REQUIRED_MARKERS.map((item) => ({
      ...item,
      ok: Boolean(document.querySelector(item.selector)),
    }));
  }

  function renderDeployStatus() {
    const checksNode = document.querySelector("#deployChecks");
    const urlNode = document.querySelector("#deployPageUrl");
    if (!checksNode) return;

    if (urlNode) urlNode.textContent = location.href;
    const checks = collectChecks();
    const passed = checks.filter((item) => item.ok).length;

    checksNode.innerHTML = `
      <div class="deploy-score ${passed === checks.length ? "ok" : "warn"}">
        <b>${passed}/${checks.length}</b><span>${passed === checks.length ? "модули подключены" : "проверьте кеш или публикацию"}</span>
      </div>
      ${checks.map((item) => `
        <span class="deploy-check ${item.ok ? "ok" : "warn"}">${item.ok ? "✓" : "!"} ${item.label}</span>
      `).join("")}
    `;
  }

  function buildReport() {
    const checks = collectChecks();
    const passed = checks.filter((item) => item.ok).length;
    return [
      "Отчет публикации панели Технопарка РГСУ",
      `Версия: ${DASHBOARD_BUILD}`,
      `Адрес: ${location.href}`,
      `Проверка модулей: ${passed}/${checks.length}`,
      `Время: ${new Date().toLocaleString("ru-RU")}`,
      "",
      ...checks.map((item) => `${item.ok ? "✓" : "!"} ${item.label} - ${item.selector}`),
      "",
      `Статус данных: ${cleanText(document.querySelector("#syncStatus")?.textContent || "неизвестно")}`,
      `Последнее обновление: ${cleanText(document.querySelector("#lastUpdated")?.textContent || "неизвестно")}`,
    ].join("\n");
  }

  async function copyReport() {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      toast("Отчет публикации скопирован");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Отчет публикации скопирован");
    }
  }

  function hardReload() {
    const url = new URL(location.href);
    url.searchParams.set("v", DASHBOARD_BUILD);
    url.searchParams.set("t", Date.now());
    location.href = url.toString();
  }

  function toast(message) {
    const node = document.querySelector("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("error");
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2800);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#hardReloadPage")) hardReload();
      if (event.target.closest("#copyDeployReport")) copyReport();
    });
  }

  function init() {
    ensureDeployStatus();
    attachEvents();
    setTimeout(renderDeployStatus, 1800);
    setTimeout(renderDeployStatus, 4200);
    setTimeout(renderDeployStatus, 7000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
