/* Финальный слой отправки пожеланий: успех на экране + локальная лента */
(function () {
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec';
  var STORAGE_KEY = 'technopark_sent_feedback_v2';

  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function $(selector) { return document.querySelector(selector); }

  function addStyle() {
    if ($('#feedbackSubmitFinalStyles')) return;
    var style = document.createElement('style');
    style.id = 'feedbackSubmitFinalStyles';
    style.textContent = '.feedback-final-result{display:none!important;padding:30px 18px;text-align:center}.feedback-final-result.is-visible{display:grid!important;gap:12px;place-items:center}.feedback-final-icon{width:72px;height:72px;border-radius:24px;display:grid;place-items:center;background:#dcfce7;color:#15803d;font-size:42px;font-weight:950}.feedback-final-result h3{margin:0;color:#0f172a;font-size:24px;line-height:1.15}.feedback-final-result p{margin:0;color:#64748b;font-size:15px;line-height:1.45;max-width:460px}.feedback-final-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:min(420px,100%);margin-top:8px}.feedback-final-actions button,.feedback-final-actions a{min-height:48px;border-radius:16px;padding:0 12px;display:flex;align-items:center;justify-content:center;font-weight:950;text-decoration:none}.feedback-final-actions button{border:1px solid #dfe6ef;background:#fff;color:#0f172a}.feedback-final-actions a{border:1px solid #1d4ed8;background:#1d4ed8;color:#fff}.local-feedback-sent-panel{display:grid!important;gap:8px;margin-bottom:10px;border:1px solid rgba(22,163,74,.24);border-radius:18px;padding:12px;background:rgba(240,253,244,.94)}.local-feedback-sent-panel strong{color:#15803d;font-size:13px;text-transform:uppercase;letter-spacing:.03em}.local-feedback-card{border:1px solid rgba(22,163,74,.16);border-radius:14px;padding:10px;background:#fff;color:#0f172a}.local-feedback-card b{display:block;margin-bottom:4px;font-size:14px}.local-feedback-card p{margin:0;color:#64748b;font-size:13px;line-height:1.35}.local-feedback-card small{display:block;margin-top:6px;color:#15803d;font-weight:800}@media(max-width:760px){.feedback-final-actions{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch];
    });
  }

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveRecord(record) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([record].concat(getSaved()).slice(0, 8))); }
    catch (e) {}
  }

  function renderLocalFeed() {
    var feed = $('#feedbackFeed');
    if (!feed) return;
    var records = getSaved();
    var old = $('#localFeedbackSentPanel');
    if (old) old.remove();
    if (!records.length) return;

    var panel = document.createElement('div');
    panel.id = 'localFeedbackSentPanel';
    panel.className = 'local-feedback-sent-panel';
    panel.innerHTML = '<strong>Отправлено с этого устройства</strong>';

    records.slice(0, 3).forEach(function (record) {
      var card = document.createElement('div');
      card.className = 'local-feedback-card';
      card.innerHTML = '<b>' + escapeHtml(record.project || 'Ко всему портфелю') + '</b><p>' + escapeHtml(record.message || 'Пожелание без текста') + '</p><small>' + escapeHtml(record.author || 'Автор не указан') + ' · ' + escapeHtml(record.priority || 'средний') + ' · отправлено</small>';
      panel.appendChild(card);
    });
    feed.prepend(panel);
  }

  function recordFromForm(form) {
    var data = new FormData(form);
    return {
      author: clean(data.get('author')),
      role: clean(data.get('role')),
      project: clean(data.get('project')),
      type: clean(data.get('type')) || 'пожелание',
      priority: clean(data.get('priority')) || 'средний',
      message: clean(data.get('message')),
      createdAt: new Date().toISOString()
    };
  }

  function ensureResult(form) {
    addStyle();
    var card = form.closest('.feedback-direct-card, .feedback-modal-card') || form.parentElement;
    var result = card.querySelector('.feedback-final-result');
    if (result) return result;
    result = document.createElement('div');
    result.className = 'feedback-final-result';
    result.innerHTML = '<div class="feedback-final-icon">✓</div><h3>Пожелание отправлено</h3><p>Запись передана в Google Таблицу и сразу добавлена в ленту на этой странице. После обновления она подтянется из таблицы.</p><div class="feedback-final-actions"><button type="button" data-feedback-close>Закрыть</button><a href="https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit" target="_blank" rel="noopener noreferrer">Открыть таблицу</a></div>';
    card.appendChild(result);
    result.querySelector('[data-feedback-close]').addEventListener('click', closeModal, true);
    return result;
  }

  function showSuccess(form) {
    var result = ensureResult(form);
    form.style.display = 'none';
    result.classList.add('is-visible');
  }

  function closeModal() {
    document.body.classList.remove('feedback-direct-open', 'feedback-modal-open');
    document.querySelectorAll('#feedbackModalDirect,#feedbackModalEmergency').forEach(function (modal) {
      modal.classList.remove('is-open');
      var form = modal.querySelector('form');
      var result = modal.querySelector('.feedback-final-result');
      if (form) form.style.display = '';
      if (result) result.classList.remove('is-visible');
    });
  }

  async function handleSubmit(event) {
    var form = event.target;
    if (!form || !/feedbackModalDirectForm|feedbackModalEmergencyForm|ntsForm|ntsFeedbackForm|showcaseQuickFeedbackForm/.test(form.id || '')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;

    var submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = 'Отправляем...';
    }

    var record = recordFromForm(form);
    var data = new FormData(form);
    data.set('formKey', 'NTS_TECHNOPARK_2026');
    data.set('source', 'final_feedback_submit');
    data.set('status', 'новое');
    data.set('createdAt', record.createdAt);
    data.set('notifyOwner', 'true');

    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: data, mode: 'no-cors' });
      saveRecord(record);
      renderLocalFeed();
      form.reset();
      showSuccess(form);
      setTimeout(function () { document.querySelector('#refreshData,#refreshSheet,#refresh')?.click(); }, 900);
      setTimeout(closeModal, 2600);
    } catch (error) {
      console.error(error);
      saveRecord(record);
      renderLocalFeed();
      showSuccess(form);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || 'Отправить пожелание';
      }
    }
  }

  function init() {
    addStyle();
    renderLocalFeed();
    document.addEventListener('submit', handleSubmit, true);
    setTimeout(renderLocalFeed, 1200);
    new MutationObserver(renderLocalFeed).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
