/*
  Мобильные фильтры.
  На узких экранах сворачивает панель фильтров в кнопку «Фильтры и поиск».
  Google Sheets и структуру данных не меняет.
*/

(function () {
  function ensureMobileFilterButton() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || document.querySelector("#mobileFilterToggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-filter-toggle";
    button.id = "mobileFilterToggle";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span>Фильтры и поиск</span><b id="mobileFilterBadge">0</b>`;

    toolbar.insertAdjacentElement("beforebegin", button);
  }

  function activeFilterCount() {
    const search = document.querySelector("#searchInput")?.value.trim();
    const selects = ["statusFilter", "ownerFilter", "readinessFilter", "riskFilter"];
    let count = search ? 1 : 0;
    selects.forEach((id) => {
      const node = document.querySelector(`#${id}`);
      if (node && node.value && node.value !== "all") count += 1;
    });
    return count;
  }

  function updateBadge() {
    const badge = document.querySelector("#mobileFilterBadge");
    if (!badge) return;
    const count = activeFilterCount();
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  function setOpen(open) {
    const toolbar = document.querySelector(".toolbar");
    const button = document.querySelector("#mobileFilterToggle");
    if (!toolbar || !button) return;
    toolbar.classList.toggle("is-mobile-open", open);
    button.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#mobileFilterToggle")) {
        const toolbar = document.querySelector(".toolbar");
        setOpen(!toolbar?.classList.contains("is-mobile-open"));
      }

      if (event.target.closest("#resetFilters")) {
        setTimeout(updateBadge, 80);
      }
    });

    ["input", "change"].forEach((type) => {
      document.addEventListener(type, (event) => {
        if (["searchInput", "statusFilter", "ownerFilter", "readinessFilter", "riskFilter"].includes(event.target.id)) {
          updateBadge();
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) setOpen(true);
      else setOpen(false);
    }, { passive: true });
  }

  function init() {
    ensureMobileFilterButton();
    attachEvents();
    updateBadge();
    if (window.innerWidth <= 760) setOpen(false);
    setTimeout(updateBadge, 1600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
