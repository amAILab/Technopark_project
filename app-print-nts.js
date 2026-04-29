/*
  Печать и предпросмотр повестки НТС.
  Добавляет управленческие кнопки: сначала предпросмотр режима НТС,
  затем печать / сохранение в PDF только полезной для заседания части.
  Google Sheets и Apps Script не изменяет.
*/

(function () {
  function ensurePrintButtons() {
    const toolsPanel = document.querySelector("#toolsMenuPanel");
    const headerActions = document.querySelector(".header-actions");

    if (!document.querySelector("#previewNtsAgenda")) {
      const preview = document.createElement("button");
      preview.type = "button";
      preview.id = "previewNtsAgenda";
      preview.className = "button ghost tools-menu-item print-nts-button";
      preview.textContent = "Предпросмотр НТС";
      if (toolsPanel) toolsPanel.appendChild(preview);
      else headerActions?.appendChild(preview);
    }

    if (!document.querySelector("#printNtsAgenda")) {
      const print = document.createElement("button");
      print.type = "button";
      print.id = "printNtsAgenda";
      print.className = "button ghost tools-menu-item print-nts-button";
      print.textContent = "Печать НТС";
      if (toolsPanel) toolsPanel.appendChild(print);
      else headerActions?.appendChild(print);
    }
  }

  function ensurePrintMeta() {
    if (document.querySelector("#printMeta")) return;
    const meta = document.createElement("section");
    meta.className = "print-meta";
    meta.id = "printMeta";
    meta.innerHTML = `
      <div>
        <p>Проектный центр «Технопарк РГСУ»</p>
        <h1>Повестка и управленческая сводка к НТС</h1>
        <span id="printMetaDate"></span>
      </div>
      <div>
        <strong>Источник данных</strong>
        <span>Google Sheets / панель руководителя</span>
      </div>
    `;
    document.body.insertBefore(meta, document.body.firstChild);
  }

  function ensurePreviewBanner() {
    if (document.querySelector("#ntsPreviewBanner")) return;
    const banner = document.createElement("section");
    banner.className = "nts-preview-banner";
    banner.id = "ntsPreviewBanner";
    banner.innerHTML = `
      <div>
        <strong>Предпросмотр НТС включен</strong>
        <span>Проверьте сводку, решения, план на 7 дней, риски и повестку. После проверки можно печатать или сохранить в PDF.</span>
      </div>
      <div>
        <button type="button" id="printNtsFromPreview">Печать / PDF</button>
        <button type="button" id="closeNtsPreview">Выйти из предпросмотра</button>
      </div>
    `;
    document.body.insertBefore(banner, document.querySelector("main"));
  }

  function updatePrintMeta() {
    const date = document.querySelector("#printMetaDate");
    if (date) date.textContent = `Сформировано: ${new Date().toLocaleString("ru-RU")}`;
  }

  function enableNtsMode() {
    const isExecutive = document.body.classList.contains("executive-mode");
    if (!isExecutive) {
      const modeButton = document.querySelector("[data-view-mode='nts']");
      const oldToggle = document.querySelector("#executiveModeToggle");
      if (modeButton) modeButton.click();
      else oldToggle?.click();
    }
  }

  function previewAgenda() {
    ensurePreviewBanner();
    updatePrintMeta();
    enableNtsMode();
    document.body.classList.add("nts-preview-mode");
    setTimeout(() => {
      document.querySelector("#overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function closePreview() {
    document.body.classList.remove("nts-preview-mode");
  }

  function printAgenda() {
    ensurePrintMeta();
    updatePrintMeta();
    enableNtsMode();
    document.body.classList.add("print-nts-mode");
    setTimeout(() => window.print(), 160);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#previewNtsAgenda")) previewAgenda();
      if (event.target.closest("#printNtsAgenda, #printNtsFromPreview")) printAgenda();
      if (event.target.closest("#closeNtsPreview")) closePreview();
      if (event.target.closest("[data-view-mode='work']")) closePreview();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePreview();
    });

    window.addEventListener("afterprint", () => {
      document.body.classList.remove("print-nts-mode");
    });
  }

  function init() {
    ensurePrintButtons();
    ensurePrintMeta();
    ensurePreviewBanner();
    attachEvents();
    setTimeout(ensurePrintButtons, 1600);
    setTimeout(ensurePrintButtons, 3600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
