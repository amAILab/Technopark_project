/*
  Сохранение и передача текущего вида панели по ссылке.
  Добавляет кнопки: «Ссылка на вид» и «Кеш».
  Не меняет Google Sheets и работает поверх существующих фильтров.
*/

(function () {
  const FILTER_IDS = ["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"];

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function showToast(message, type = "") {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("error", type === "error");
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function ensureShareButtons() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#copyViewLink")) return;

    const linkButton = document.createElement("button");
    linkButton.className = "button ghost share-view-button";
    linkButton.id = "copyViewLink";
    linkButton.type = "button";
    linkButton.textContent = "Ссылка на вид";

    const cacheButton = document.createElement("button");
    cacheButton.className = "button ghost clear-cache-button";
    cacheButton.id = "clearDashboardCache";
    cacheButton.type = "button";
    cacheButton.textContent = "Кеш";
    cacheButton.title = "Очистить локальный кеш панели и обновить данные";

    actions.appendChild(linkButton);
    actions.appendChild(cacheButton);
  }

  function getActiveFastFilter() {
    return document.querySelector("[data-fast-filter].is-active")?.dataset.fastFilter || "all";
  }

  function collectViewState() {
    const params = new URLSearchParams();
    FILTER_IDS.forEach((id) => {
      const element = document.querySelector(`#${id}`);
      if (!element || !element.value || element.value === "all") return;
      params.set(id.replace("Filter", "").replace("Input", ""), element.value);
    });
    const fast = getActiveFastFilter();
    if (fast && fast !== "all") params.set("fast", fast);
    if (document.body.classList.contains("executive-mode")) params.set("mode", "nts");
    const hash = location.hash || "#overview";
    return `${location.origin}${location.pathname}${params.toString() ? `?${params.toString()}` : ""}${hash}`;
  }

  async function copyViewLink() {
    const url = collectViewState();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка на текущий вид скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Ссылка на текущий вид скопирована");
    }
  }

  function setField(id, value) {
    const element = document.querySelector(`#${id}`);
    if (!element || value === null) return;
    const optionExists = element.tagName.toLowerCase() !== "select" || Array.from(element.options).some((option) => option.value === value);
    if (!optionExists) return;
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyViewFromUrl() {
    const params = new URLSearchParams(location.search);
    const apply = () => {
      setField("searchInput", params.get("search"));
      setField("statusFilter", params.get("status"));
      setField("ownerFilter", params.get("owner"));
      setField("readinessFilter", params.get("readiness"));
      setField("riskFilter", params.get("risk"));

      const fast = params.get("fast");
      if (fast) document.querySelector(`[data-fast-filter="${CSS.escape(fast)}"]`)?.click();

      if (params.get("mode") === "nts" && !document.body.classList.contains("executive-mode")) {
        document.querySelector("#executiveModeToggle")?.click();
      }
    };

    setTimeout(apply, 1400);
    setTimeout(apply, 3200);
  }

  function saveViewToStorage() {
    const state = {};
    FILTER_IDS.forEach((id) => {
      const element = document.querySelector(`#${id}`);
      if (element) state[id] = element.value;
    });
    state.fast = getActiveFastFilter();
    try {
      localStorage.setItem("technopark_last_view", JSON.stringify(state));
    } catch (error) {
      console.warn("Не удалось сохранить вид панели", error);
    }
  }

  function restoreLastView() {
    if (location.search) return;
    try {
      const raw = localStorage.getItem("technopark_last_view");
      if (!raw) return;
      const state = JSON.parse(raw);
      setTimeout(() => {
        Object.entries(state).forEach(([id, value]) => {
          if (FILTER_IDS.includes(id)) setField(id, value);
        });
      }, 1800);
    } catch (error) {
      console.warn("Не удалось восстановить вид панели", error);
    }
  }

  function clearDashboardCache() {
    try {
      Object.keys(localStorage).filter((key) => key.startsWith("technopark_")).forEach((key) => localStorage.removeItem(key));
      showToast("Кеш панели очищен");
      setTimeout(() => document.querySelector("#refreshData")?.click(), 300);
    } catch (error) {
      showToast("Не удалось очистить кеш", "error");
    }
  }

  function ensureViewHint() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || document.querySelector("#viewShareHint")) return;
    const hint = document.createElement("p");
    hint.className = "view-share-hint";
    hint.id = "viewShareHint";
    hint.textContent = "Совет: настройте фильтры и нажмите «Ссылка на вид», чтобы отправить членам НТС конкретный срез панели.";
    toolbar.insertAdjacentElement("beforebegin", hint);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#copyViewLink")) copyViewLink();
      if (event.target.closest("#clearDashboardCache")) clearDashboardCache();
    });
    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (FILTER_IDS.includes(event.target.id)) setTimeout(saveViewToStorage, 120);
      });
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-fast-filter]")) setTimeout(saveViewToStorage, 220);
    });
  }

  function init() {
    ensureShareButtons();
    ensureViewHint();
    attachEvents();
    applyViewFromUrl();
    restoreLastView();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
