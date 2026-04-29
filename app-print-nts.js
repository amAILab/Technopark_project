/*
  Печать повестки НТС.
  Добавляет управленческую кнопку печати и режим печати,
  в котором остаются только блоки, полезные для заседания НТС.
  Google Sheets и Apps Script не изменяет.
*/

(function () {
  function ensurePrintButton() {
    const toolsPanel = document.querySelector("#toolsMenuPanel");
    const headerActions = document.querySelector(".header-actions");
    if (document.querySelector("#printNtsAgenda")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "printNtsAgenda";
    button.className = "button ghost tools-menu-item print-nts-button";
    button.textContent = "Печать НТС";

    if (toolsPanel) toolsPanel.appendChild(button);
    else headerActions?.appendChild(button);
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

  function updatePrintMeta() {
    const date = document.querySelector("#printMetaDate");
    if (date) date.textContent = `Сформировано: ${new Date().toLocaleString("ru-RU")}`;
  }

  function printAgenda() {
    ensurePrintMeta();
    updatePrintMeta();
    document.body.classList.add("print-nts-mode");
    setTimeout(() => window.print(), 120);
  }

  function attachEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#printNtsAgenda")) printAgenda();
    });

    window.addEventListener("afterprint", () => {
      document.body.classList.remove("print-nts-mode");
    });
  }

  function init() {
    ensurePrintButton();
    ensurePrintMeta();
    attachEvents();
    setTimeout(ensurePrintButton, 1600);
    setTimeout(ensurePrintButton, 3600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
