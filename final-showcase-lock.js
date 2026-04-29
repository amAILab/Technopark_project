/* Финальный стабильный слой для показа */
(function () {
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiOYwnD7aozxYFzox4JokcHIZjR-OD7FUXcn16n0YqH1gdHoWqgqYXy2CmIJaiN9o/exec';
  var STORAGE_KEY = 'technopark_final_feedback_sent';
  var sending = false;

  function $(s) { return document.querySelector(s); }
  function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function mobile() { return window.matchMedia('(max-width:760px)').matches; }

  function addStyle() {
    if ($('#finalShowcaseLockStyle')) return;
    var st = document.createElement('style');
    st.id = 'finalShowcaseLockStyle';
    st.textContent = '@media(max-width:760px){.topbar.final-lock{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;padding:10px 12px 12px!important;background:rgba(255,255,255,.97)!important;border-bottom:1px solid #e2e8f0!important}.topbar.final-lock>.header-actions,.topbar.final-lock>#mobileHeaderHardActions,.topbar.final-lock>#mobileOnlyNtsButton,.topbar.final-lock>#mobileOnlyFeedbackButton,.topbar.final-lock>.showcase-controls{display:none!important;visibility:hidden!important;pointer-events:none!important}#finalTopActions{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}#finalTopActions button{display:grid!important;grid-template-rows:18px auto!important;place-items:center!important;gap:3px!important;min-height:58px!important;height:58px!important;width:100%!important;border-radius:20px!important;padding:6px 10px!important;text-align:center!important;font-size:13px!important;line-height:1.05!important;font-weight:950!important;box-sizing:border-box!important;cursor:pointer!important}#finalNts{border:1px solid #dfe6ef!important;background:#fff!important;color:#0f172a!important}#finalNts:before{content:"◉";display:block;height:18px;color:#1d4ed8;font-size:17px;line-height:18px}#finalFeedback{border:1px solid #1d4ed8!important;background:#1d4ed8!important;color:#fff!important}#finalFeedback:before{content:"+";display:block;height:18px;color:#fff;font-size:24px;line-height:18px}}body.final-feedback-open{overflow:hidden!important}#finalFeedbackModal{position:fixed!important;inset:0!important;z-index:2147483600!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(15,23,42,.48)!important;backdrop-filter:blur(12px)!important}#finalFeedbackModal.is-open{display:flex!important}.final-card{width:min(720px,100%)!important;max-height:min(820px,calc(100vh - 36px))!important;overflow:auto!important;border-radius:28px!important;background:#fff!important;color:#0f172a!important;box-shadow:0 34px 100px rgba(15,23,42,.32)!important;border:1px solid rgba(226,232,240,.96)!important}.final-head{position:sticky!important;top:0!important;z-index:2!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:18px 18px 12px!important;background:rgba(255,255,255,.97)!important;border-bottom:1px solid #e2e8f0!important}.final-head h2{margin:0!important;font-size:22px!important;line-height:1.1!important}.final-head p{margin:5px 0 0!important;color:#64748b!important;font-size:13.5px!important;line-height:1.35!important}.final-close{width:44px!important;height:44px!important;min-width:44px!important;border:1px solid #dfe6ef!important;border-radius:16px!important;background:#fff!important;color:#0f172a!important;font-size:28px!important;line-height:1!important;display:grid!important;place-items:center!important;cursor:pointer!important}.final-form{display:grid!important;gap:12px!important;padding:16px 18px 18px!important}.final-intro{display:grid!important;gap:6px!important;padding:12px 14px!important;border:1px solid rgba(37,99,235,.16)!important;border-radius:18px!important;background:rgba(239,246,255,.7)!important;color:#334155!important;font-size:13.5px!important;line-height:1.4!important}.final-intro b{color:#1d4ed8!important}.final-form label{display:grid!important;gap:7px!important;font-weight:900!important;color:#64748b!important;font-size:12px!important;text-transform:uppercase!important;letter-spacing:.02em!important}.final-form input,.final-form select,.final-form textarea{width:100%!important;box-sizing:border-box!important;border:1px solid #dfe6ef!important;border-radius:16px!important;padding:13px 14px!important;background:#fff!important;color:#0f172a!important;font:inherit!important;font-size:16px!important;line-height:1.35!important;outline:none!important}.final-form textarea{min-height:132px!important;resize:vertical!important}.final-hint{display:block!important;margin-top:-3px!important;color:#94a3b8!important;font-size:12.5px!important;line-height:1.35!important;text-transform:none!important;letter-spacing:0!important;font-weight:700!important}.final-actions{display:grid!important;grid-template-columns:1fr 1.25fr!important;gap:10px!important;margin-top:4px!important}.final-actions button{min-height:52px!important;border-radius:18px!important;padding:0 14px!important;font-weight:950!important;font-size:15px!important;cursor:pointer!important}.final-cancel{border:1px solid #dfe6ef!important;background:#fff!important;color:#0f172a!important}.final-submit{border:1px solid #1d4ed8!important;background:#1d4ed8!important;color:#fff!important}.final-result{display:none!important;padding:34px 18px 30px!important;text-align:center!important;place-items:center!important;gap:12px!important}.final-result.on{display:grid!important}.final-icon{width:72px!important;height:72px!important;border-radius:24px!important;display:grid!important;place-items:center!important;background:#dcfce7!important;color:#15803d!important;font-size:42px!important;font-weight:950!important}.final-icon.loading{background:#dbeafe!important;color:#1d4ed8!important;animation:fpulse 1s ease-in-out infinite}.final-result h3{margin:0!important;font-size:24px!important;line-height:1.15!important}.final-result p{margin:0!important;color:#64748b!important;font-size:15px!important;line-height:1.45!important;max-width:460px!important}.final-result button{min-height:48px!important;border:1px solid #dfe6ef!important;background:#fff!important;color:#0f172a!important;border-radius:16px!important;padding:0 16px!important;font-weight:950!important}.final-local{display:grid!important;gap:8px!important;margin-bottom:10px!important;border:1px solid rgba(22,163,74,.24)!important;border-radius:18px!important;padding:12px!important;background:rgba(240,253,244,.94)!important}.final-local strong{color:#15803d!important;font-size:13px!important;text-transform:uppercase!important}.final-local-card{border:1px solid rgba(22,163,74,.16)!important;border-radius:14px!important;padding:10px!important;background:#fff!important}.final-local-card b{display:block!important;margin-bottom:4px!important;font-size:14px!important}.final-local-card p{margin:0!important;color:#64748b!important;font-size:13px!important;line-height:1.35!important}.final-local-card small{display:block!important;margin-top:6px!important;color:#15803d!important;font-weight:800!important}@keyframes fpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.94);opacity:.72}}@media(max-width:760px){#finalFeedbackModal{align-items:stretch!important;justify-content:stretch!important;padding:0!important}.final-card{width:100%!important;max-height:none!important;height:100%!important;border-radius:0!important;border:0!important}.final-head{padding:calc(14px + env(safe-area-inset-top,0px)) 16px 12px!important}.final-head h2{font-size:20px!important}.final-form{padding:14px 16px calc(18px + env(safe-area-inset-bottom,0px))!important}.final-actions{grid-template-columns:1fr!important}.final-actions button{min-height:54px!important}}';
    document.head.appendChild(st);
  }

  function esc(v) { return String(v || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function saved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; } }
  function save(r) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([r].concat(saved()).slice(0,8))); } catch(e) {} }

  function renderFeed() {
    var feed = $('#feedbackFeed');
    if (!feed) return;
    var old = $('#finalLocalFeed');
    if (old) old.remove();
    var list = saved();
    if (!list.length) return;
    var panel = document.createElement('div');
    panel.id = 'finalLocalFeed';
    panel.className = 'final-local';
    panel.innerHTML = '<strong>Отправлено с этого устройства</strong>';
    list.slice(0,3).forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'final-local-card';
      card.innerHTML = '<b>' + esc(r.project || 'Ко всему портфелю') + '</b><p>' + esc(r.message || 'Пожелание без текста') + '</p><small>' + esc(r.author || 'Автор не указан') + ' · ' + esc(r.priority || 'средний') + ' · отправлено</small>';
      panel.appendChild(card);
    });
    feed.prepend(panel);
  }

  function header() {
    if (!mobile()) return;
    var top = $('.topbar');
    if (!top) return;
    top.classList.add('final-lock');
    if ($('#finalTopActions')) return;
    var box = document.createElement('div');
    box.id = 'finalTopActions';
    box.innerHTML = '<button id="finalNts" type="button">Режим НТС</button><button id="finalFeedback" type="button">Добавить пожелание</button>';
    top.appendChild(box);
    $('#finalNts').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      document.body.classList.toggle('executive-mode');
      $('#finalNts').textContent = document.body.classList.contains('executive-mode') ? 'Обычный режим' : 'Режим НТС';
    }, true);
    $('#finalFeedback').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); openModal();
    }, true);
  }

  function modal() {
    var m = $('#finalFeedbackModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'finalFeedbackModal';
    m.innerHTML = '<div class="final-card"><div class="final-head"><div><h2>Добавить пожелание НТС</h2><p>Заполните поля. После отправки появится подтверждение и запись добавится в ленту.</p></div><button class="final-close" type="button">×</button></div><form class="final-form" id="finalFeedbackForm"><div class="final-intro"><b>Как заполнить:</b><span>Укажите автора, проект, тип сообщения и конкретно напишите, что нужно изменить, проверить или решить.</span></div><label><span>Кто оставляет пожелание *</span><input name="author" required autocomplete="name" placeholder="Например: Иванов И.И."><small class="final-hint">ФИО или короткое имя, чтобы было понятно, от кого сообщение.</small></label><label><span>Роль / статус</span><input name="role" placeholder="Например: член НТС, эксперт, руководитель проекта"><small class="final-hint">Можно оставить пустым, если роль не важна.</small></label><label><span>К какому проекту относится</span><input name="project" placeholder="Например: ко всему портфелю или название проекта"><small class="final-hint">Если замечание общее, напишите: ко всему портфелю.</small></label><label><span>Тип сообщения</span><select name="type"><option value="пожелание">Пожелание</option><option value="замечание">Замечание</option><option value="риск">Риск</option><option value="идея">Идея</option><option value="вопрос">Вопрос</option><option value="решение НТС">Решение НТС</option></select><small class="final-hint">Тип поможет потом быстро разобрать ленту.</small></label><label><span>Приоритет</span><select name="priority"><option value="средний">Средний</option><option value="низкий">Низкий</option><option value="высокий">Высокий</option><option value="критический">Критический</option></select><small class="final-hint">Критический - если нужно срочно исправить до показа или подачи.</small></label><label><span>Текст пожелания *</span><textarea name="message" required placeholder="Например: уточнить сроки подачи гранта, добавить ответственного, проверить смету, обновить статус проекта"></textarea><small class="final-hint">Пишите конкретно: что сделать, где проблема, какой ожидаемый результат.</small></label><div class="final-actions"><button class="final-cancel" type="button">Закрыть без отправки</button><button class="final-submit" type="submit">Отправить пожелание</button></div></form><div class="final-result" id="finalResult"><div class="final-icon">✓</div><h3>Пожелание отправлено</h3><p>Запись передана в Google Таблицу и добавлена в ленту на этой странице.</p><button type="button" id="finalResultClose">Закрыть</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.final-close,.final-cancel,#finalResultClose')) closeModal(); }, true);
    $('#finalFeedbackForm').addEventListener('submit', submit, true);
    return m;
  }

  function openModal() {
    var m = modal();
    var f = $('#finalFeedbackForm');
    var r = $('#finalResult');
    if (f) f.style.display = 'grid';
    if (r) r.classList.remove('on');
    document.body.classList.add('final-feedback-open');
    m.classList.add('is-open');
    setTimeout(function () { var first = m.querySelector('input,textarea,select'); if (first) first.focus({ preventScroll:true }); }, 100);
  }
  function closeModal() { var m = $('#finalFeedbackModal'); if (m) m.classList.remove('is-open'); document.body.classList.remove('final-feedback-open'); }
  function record(form) { var d = new FormData(form); return {author:clean(d.get('author')),role:clean(d.get('role')),project:clean(d.get('project')),type:clean(d.get('type'))||'пожелание',priority:clean(d.get('priority'))||'средний',message:clean(d.get('message')),createdAt:new Date().toISOString()}; }
  function sendingView() { var f=$('#finalFeedbackForm'), r=$('#finalResult'); if (!f||!r) return; f.style.display='none'; r.classList.add('on'); r.querySelector('.final-icon').textContent='…'; r.querySelector('.final-icon').classList.add('loading'); r.querySelector('h3').textContent='Отправляем пожелание'; r.querySelector('p').textContent='Форма принята. Сейчас отправляем запись в Google Таблицу.'; r.querySelector('#finalResultClose').style.display='none'; }
  function successView() { var r=$('#finalResult'); if (!r) return; r.querySelector('.final-icon').textContent='✓'; r.querySelector('.final-icon').classList.remove('loading'); r.querySelector('h3').textContent='Пожелание отправлено'; r.querySelector('p').textContent='Запись передана в Google Таблицу и добавлена в ленту на этой странице.'; r.querySelector('#finalResultClose').style.display=''; }

  async function submit(e) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (sending) return;
    var form = e.currentTarget;
    if (!form.reportValidity()) return;
    sending = true;
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Отправляется...'; }
    var r = record(form);
    var data = new FormData(form);
    data.set('formKey','NTS_TECHNOPARK_2026'); data.set('source','final_showcase_lock'); data.set('status','новое'); data.set('createdAt',r.createdAt); data.set('notifyOwner','true');
    sendingView();
    try {
      await Promise.race([fetch(SCRIPT_URL,{method:'POST',body:data,mode:'no-cors'}), new Promise(function(res){setTimeout(res,1300);})]);
      save(r); renderFeed(); form.reset(); successView();
      setTimeout(function(){ var b=document.querySelector('#refreshData,#refreshSheet,#refresh'); if(b) b.click(); },900);
      setTimeout(closeModal,2800);
    } catch(err) { console.error(err); save(r); renderFeed(); successView(); }
    finally { sending=false; if(btn){btn.disabled=false; btn.textContent='Отправить пожелание';} }
  }

  function intercept() {
    document.addEventListener('click', function (e) {
      var c = e.target.closest('a,button');
      if (!c || c.closest('#finalFeedbackModal')) return;
      var t = clean(c.textContent).toLowerCase();
      var href = c.getAttribute('href') || '';
      if ((/добавить/.test(t) && /пожел/.test(t)) || c.id === 'mobileHeaderHardFeedback' || href === '#nts') {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); openModal();
      }
    }, true);
  }

  function init() {
    addStyle(); header(); modal(); renderFeed(); intercept();
    setTimeout(header,150); setTimeout(header,700); setTimeout(header,1800);
    new MutationObserver(function(){ clearTimeout(init.t); init.t=setTimeout(function(){ header(); renderFeed(); },80); }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
