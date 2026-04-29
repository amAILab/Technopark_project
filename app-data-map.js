/*
  Карта данных панели Технопарка РГСУ.
  Объясняет команде, какие поля Google Sheets критичны для управленческой панели.
  Ничего не меняет в Google Sheets и Apps Script.
*/

(function () {
  const DATA_FIELDS = [
    {
      field: "Проект / название",
      purpose: "Идентификация проекта во всех блоках панели.",
      usedBy: "KPI, таблица, паспорт проекта, сводка, НТС",
      ifEmpty: "Проект будет отображаться как запись без понятного названия.",
      priority: "critical"
    },
    {
      field: "Ответственный",
      purpose: "Понимание владельца проекта и распределения нагрузки.",
      usedBy: "Что требует действия, решения руководителя, нагрузка, план 7 дней",
      ifEmpty: "Проект попадет в риски и в список решений: назначить ответственного.",
      priority: "critical"
    },
    {
      field: "Готовность / процент готовности",
      purpose: "Оценка стадии проекта и готовности к грантовой подаче.",
      usedBy: "KPI, шкала готовности, матрица рисков, паспорт проекта",
      ifEmpty: "Панель не сможет корректно определить стадию проекта.",
      priority: "critical"
    },
    {
      field: "Грант / грантовый маршрут",
      purpose: "Понимание источника финансирования и ближайшего конкурса.",
      usedBy: "Календарь грантов, решения руководителя, качество данных",
      ifEmpty: "Проект попадет в блок 'утвердить грантовый маршрут'.",
      priority: "high"
    },
    {
      field: "Срок / дедлайн",
      purpose: "Контроль ближайшей управленческой даты.",
      usedBy: "План 7 дней, дедлайны, матрица рисков, НТС",
      ifEmpty: "Проект будет считаться проектом без срока и попадет в доработку.",
      priority: "high"
    },
    {
      field: "Следующее действие",
      purpose: "Переход от статуса к конкретному действию команды.",
      usedBy: "Паспорт проекта, план 7 дней, качество данных",
      ifEmpty: "Руководителю будет непонятно, что делать дальше.",
      priority: "high"
    },
    {
      field: "Риск / комментарий",
      purpose: "Фиксация проблем, ограничений и вопросов к НТС.",
      usedBy: "Матрица рисков, решения руководителя, повестка НТС",
      ifEmpty: "Риски могут не попасть в управленческую повестку.",
      priority: "medium"
    },
    {
      field: "Статус",
      purpose: "Понимание текущего этапа работы по проекту.",
      usedBy: "Фильтры, таблица проектов, воронка, паспорт проекта",
      ifEmpty: "Проект сложнее отнести к этапу воронки.",
      priority: "medium"
    },
    {
      field: "Описание / суть проекта",
      purpose: "Краткое объяснение, зачем нужен проект.",
      usedBy: "Паспорт проекта, НТС, сводка",
      ifEmpty: "Паспорт проекта будет формальным и непонятным для внешнего просмотра.",
      priority: "medium"
    },
    {
      field: "Ссылка на материалы",
      purpose: "Быстрый доступ к презентации, ТЗ, расчетам или файлам проекта.",
      usedBy: "Паспорт проекта, НТС, подготовка к грантам",
      ifEmpty: "НТС и руководитель не смогут быстро проверить материалы.",
      priority: "low"
    }
  ];

  function ensureDataMap() {
    const quality = document.querySelector("#quality");
    if (!quality || document.querySelector("#dataMap")) return;

    const section = document.createElement("section");
    section.className = "section data-map-section";
    section.id = "dataMap";
    section.innerHTML = `
      <div class="section-title compact">
        <div>
          <p class="eyebrow">Google Sheets</p>
          <h2>Карта данных</h2>
        </div>
        <p>Какие поля таблицы питают панель и почему их нельзя оставлять пустыми.</p>
      </div>
      <div class="data-map-toolbar">
        <button type="button" id="copyDataMap">Копировать карту данных</button>
        <span>${DATA_FIELDS.length} ключевых полей</span>
      </div>
      <div class="data-map-grid" id="dataMapGrid"></div>
    `;

    quality.insertAdjacentElement("afterend", section);
  }

  function renderDataMap() {
    const grid = document.querySelector("#dataMapGrid");
    if (!grid) return;

    grid.innerHTML = DATA_FIELDS.map((item) => `
      <article class="data-field ${item.priority}">
        <div class="data-field-head">
          <strong>${item.field}</strong>
          <span>${item.priority === "critical" ? "критично" : item.priority === "high" ? "важно" : item.priority === "medium" ? "желательно" : "дополнительно"}</span>
        </div>
        <p>${item.purpose}</p>
        <small><b>Используется:</b> ${item.usedBy}</small>
        <small><b>Если пусто:</b> ${item.ifEmpty}</small>
      </article>
    `).join("");
  }

  function buildDataMapText() {
    return [
      "Карта данных панели Технопарка РГСУ",
      "Назначение: какие поля Google Sheets критичны для корректной работы панели.",
      "",
      ...DATA_FIELDS.map((item, index) => [
        `${index + 1}. ${item.field}`,
        `   Приоритет: ${item.priority}`,
        `   Зачем нужно: ${item.purpose}`,
        `   Используется: ${item.usedBy}`,
        `   Если пусто: ${item.ifEmpty}`,
      ].join("\n"))
    ].join("\n");
  }

  async function copyDataMap() {
    const text = buildDataMapText();
    try {
      await navigator.clipboard.writeText(text);
      toast("Карта данных скопирована");
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Карта данных скопирована");
    }
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
      if (event.target.closest("#copyDataMap")) copyDataMap();
    });
  }

  function init() {
    ensureDataMap();
    renderDataMap();
    attachEvents();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
