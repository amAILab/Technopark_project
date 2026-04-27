// Дополнительный слой интеграции НТС.
// Этот файл безопасно работает поверх основного app.js и не ломает существующую панель.
(function () {
  const NTS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzbWEjEpb1ySylb--7VhqEHvaC05WB5jhcw-8xpAj811bIJurVB3CW-ElDsoeKnWOA/exec";
  const SCRIPT_URL_KEY = "rgsu-technopark-script-url";
  const NTS_LOCAL_KEY = "rgsu-technopark-nts-feedback";
  const CONFIRM_CODE = "11111111";
  const FORM_KEY = "NTS_TECHNOPARK_2026";

  function $(selector) {
    return document.querySelector(selector);
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function makeClientMark() {
    const time = new Date().toISOString();
    const random = Math.random().toString(36).slice(2, 8);
    return `site-${time}-${random}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Если локальное хранилище заблокировано, сайт все равно отправит запись в таблицу.
    }
  }

  function setStatus(text, type) {
    const status = $("#feedbackStatus") || $("#feedbackError");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  }

  function showToast(text, type) {
    const toast = $("#toast");
    if (!toast) {
      setStatus(text, type);
      return;
    }
    toast.textContent = text;
    toast.classList.toggle("is-error", type === "error");
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3600);
  }

  function ensureScriptUrl() {
    // Принудительно сохраняем новый URL Apps Script, чтобы основной app.js отправлял данные в нужную таблицу.
    localStorage.setItem(SCRIPT_URL_KEY, NTS_SCRIPT_URL);

    const input = $("#scriptUrl");
    if (input) input.value = NTS_SCRIPT_URL;

    const sheetId = $("#sheetId");
    if (sheetId) sheetId.value = "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60";

    const sheetGid = $("#sheetGid");
    if (sheetGid) sheetGid.value = "1500721586";
  }

  function addFieldIfMissing(form, name, label, placeholder, tagName) {
    if (!form || form.querySelector(`[name="${name}"]`)) return;

    const field = document.createElement("label");
    field.className = "nts-added-field";
    const control = tagName === "textarea" ? document.createElement("textarea") : document.createElement("input");
    control.name = name;
    control.placeholder = placeholder || "";
    if (tagName === "textarea") control.rows = 3;

    field.innerHTML = `<span>${label}</span>`;
    field.append(control);

    const messageField = form.querySelector('[name="message"]')?.closest("label");
    if (name === "solution" && messageField) {
      messageField.insertAdjacentElement("afterend", field);
      return;
    }

    const roleField = form.querySelector('[name="role"]')?.closest("label");
    if (name === "contact" && roleField) {
      roleField.insertAdjacentElement("afterend", field);
      return;
    }

    form.insertBefore(field, form.firstElementChild);
  }

  function enhanceFeedbackForm() {
    const form = $("#ntsFeedbackForm");
    if (!form || form.dataset.ntsBridgeReady === "1") return;
    form.dataset.ntsBridgeReady = "1";

    addFieldIfMissing(form, "contact", "Контакт для уточнения", "Телефон, email или Telegram", "input");
    addFieldIfMissing(form, "solution", "Предложенное решение", "Как лучше учесть это пожелание?", "textarea");

    const button = form.querySelector('button[type="submit"]');
    if (button) button.textContent = "Отправить пожелание в таблицу";

    const note = document.createElement("div");
    note.className = "nts-connection-note";
    note.textContent = "Связь активна: записи сохраняются в Google Таблицу, лист «Пожелания НТС».";
    form.append(note);

    // Capture-обработчик срабатывает раньше старого обработчика из app.js.
    form.addEventListener("submit", handleFeedbackSubmit, true);
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    const author = normalize(formData.get("author"));
    const message = normalize(formData.get("message"));

    if (!author || !message) {
      setStatus("Заполните ФИО автора и текст пожелания.", "error");
      return;
    }

    const payload = {
      action: "add_nts_feedback",
      confirmCode: CONFIRM_CODE,
      formKey: FORM_KEY,
      author,
      role: normalize(formData.get("role")),
      contact: normalize(formData.get("contact")),
      type: normalize(formData.get("type")) || normalize(formData.get("category")) || "Идея",
      category: normalize(formData.get("category")) || normalize(formData.get("type")) || "Идея",
      project: normalize(formData.get("project")),
      section: "Пожелания НТС",
      priority: normalize(formData.get("priority")) || "Средний",
      message,
      solution: normalize(formData.get("solution")),
      status: normalize(formData.get("processingStatus")) || "Новое",
      responsible: normalize(formData.get("responseOwner")),
      source: window.location.href,
      userAgent: navigator.userAgent,
      clientMark: makeClientMark(),
    };

    if (button) {
      button.disabled = true;
      button.textContent = "Отправляем...";
    }
    setStatus("Сохраняем пожелание в таблицу...", "");

    try {
      // Для Google Apps Script на GitHub Pages используем no-cors: запись сохраняется, хотя ответ нельзя прочитать.
      await fetch(NTS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      rememberFeedback(payload);
      form.reset();
      renderLocalFeedback();
      setStatus("Пожелание отправлено и сохранено в лист «Пожелания НТС».", "success");
      showToast("Пожелание НТС отправлено в таблицу", "success");
    } catch (error) {
      console.error(error);
      setStatus("Не удалось отправить пожелание. Проверьте публикацию Apps Script.", "error");
      showToast("Ошибка отправки пожелания НТС", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Отправить пожелание в таблицу";
      }
    }
  }

  function rememberFeedback(payload) {
    const items = readJson(NTS_LOCAL_KEY, []);
    items.unshift({
      id: payload.clientMark,
      createdAt: new Date().toISOString(),
      author: payload.author,
      role: payload.role,
      project: payload.project,
      category: payload.category,
      priority: payload.priority,
      message: payload.message,
      status: payload.status || "Новое",
      source: "local-after-send",
    });
    writeJson(NTS_LOCAL_KEY, items.slice(0, 50));
  }

  function renderLocalFeedback() {
    const list = $("#ntsFeedbackList");
    const latest = $("#latestFeedback");
    const items = readJson(NTS_LOCAL_KEY, []);
    const html = items.length
      ? items.slice(0, 12).map(renderFeedbackItem).join("")
      : '<div class="empty-state">Пока нет локально отправленных пожеланий. Новые записи появятся после отправки формы.</div>';

    if (list && (!list.children.length || list.textContent.includes("загружаются") || list.textContent.includes("Пока нет"))) {
      list.innerHTML = html;
    }
    if (latest && (!latest.children.length || latest.textContent.includes("Пока нет"))) {
      latest.innerHTML = items.slice(0, 4).map(renderFeedbackItem).join("") || '<div class="empty-state">Новых пожеланий пока нет.</div>';
    }
  }

  function renderFeedbackItem(item) {
    const date = item.createdAt
      ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))
      : "сейчас";
    return `
      <article class="feedback-item nts-local-item">
        <div>
          <strong>${escapeHtml(item.author || "Автор не указан")}</strong>
          <small>${escapeHtml([date, item.role, item.project].filter(Boolean).join(" · "))}</small>
        </div>
        <p>${escapeHtml(item.message || "")}</p>
        <span class="status-pill">${escapeHtml(item.status || "Новое")}</span>
      </article>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function addMicroStyles() {
    if ($("#ntsBridgeStyles")) return;
    const style = document.createElement("style");
    style.id = "ntsBridgeStyles";
    style.textContent = `
      .nts-connection-note {
        padding: 12px 14px;
        border: 1px solid rgba(20, 119, 90, .22);
        border-radius: 10px;
        color: #0f4f3e;
        background: #edf8f3;
        font-size: 13px;
        font-weight: 700;
      }
      .nts-added-field textarea { min-height: 92px; }
      .feedback-item.nts-local-item {
        display: grid;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--line, #dfe6e2);
        background: #fff;
      }
      .feedback-item.nts-local-item p { margin: 0; color: var(--ink, #111817); line-height: 1.45; }
      .feedback-item.nts-local-item small { display: block; color: var(--muted, #5f6d67); margin-top: 4px; }
      .is-success { color: #0f7a55 !important; }
      .is-error { color: #b3261e !important; }
    `;
    document.head.append(style);
  }

  function renameInterface() {
    document.title = "Технопарк РГСУ - панель руководителя";
    const pageTitle = $("#pageTitle");
    if (pageTitle) pageTitle.textContent = "Панель руководителя: проекты, гранты и решения НТС";
    const lead = document.querySelector(".lead");
    if (lead) {
      lead.textContent = "Единая управленческая панель: проекты, готовность пакета, ближайшие гранты, блокеры, пожелания НТС и следующие решения руководителя.";
    }
    document.querySelectorAll("h2, p, small, button, span, strong").forEach((node) => {
      if (node.childNodes.length === 1 && node.textContent.includes("проректора")) {
        node.textContent = node.textContent.replaceAll("проректора", "руководителя");
      }
    });
  }

  function init() {
    ensureScriptUrl();
    addMicroStyles();
    renameInterface();
    enhanceFeedbackForm();
    renderLocalFeedback();
    setTimeout(() => {
      ensureScriptUrl();
      enhanceFeedbackForm();
      renderLocalFeedback();
    }, 1200);
    setTimeout(() => {
      ensureScriptUrl();
      enhanceFeedbackForm();
      renderLocalFeedback();
    }, 3500);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
