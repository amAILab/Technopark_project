/* Финальная защита мобильной шапки: ровно две кнопки */
(function () {
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function isMobile() { return window.matchMedia('(max-width: 760px)').matches; }

  function makeNtsButton() {
    var button = document.createElement('button');
    button.id = 'mobileOnlyNtsButton';
    button.type = 'button';
    button.className = 'button ghost mobile-top-action';
    button.dataset.mobileAction = 'nts';
    button.textContent = 'Режим НТС';
    button.addEventListener('click', function () {
      document.body.classList.toggle('executive-mode');
      button.textContent = document.body.classList.contains('executive-mode') ? 'Обычный режим' : 'Режим НТС';
    });
    return button;
  }

  function makeFeedbackButton(original) {
    var button;
    if (original && original.tagName === 'A') {
      button = original.cloneNode(true);
    } else {
      button = document.createElement('a');
      button.href = '#nts';
    }
    button.id = 'mobileOnlyFeedbackButton';
    button.className = 'button primary mobile-top-action mobile-add-feedback-button';
    button.dataset.mobileAction = 'feedback';
    button.setAttribute('aria-label', 'Добавить пожелание НТС');
    button.textContent = 'Добавить пожелание';
    return button;
  }

  function findFeedbackButton(actions) {
    return Array.from(actions.querySelectorAll('a,button')).find(function (node) {
      return /пожел/.test(clean(node.textContent).toLowerCase()) || node.dataset.mobileAction === 'feedback';
    });
  }

  function forceTwoButtons() {
    if (!isMobile()) return;
    var actions = document.querySelector('.header-actions');
    if (!actions) return;

    var originalFeedback = findFeedbackButton(actions) || document.querySelector('a[href="#nts"]');
    var nts = document.querySelector('#mobileOnlyNtsButton') || makeNtsButton();
    var feedback = document.querySelector('#mobileOnlyFeedbackButton') || makeFeedbackButton(originalFeedback);

    actions.innerHTML = '';
    actions.appendChild(nts);
    actions.appendChild(feedback);
    actions.dataset.twoButtonsFinal = '1';
  }

  function addStyle() {
    if (document.querySelector('#mobileTwoButtonsFinalStyle')) return;
    var style = document.createElement('style');
    style.id = 'mobileTwoButtonsFinalStyle';
    style.textContent = '@media(max-width:760px){.header-actions[data-two-buttons-final="1"]{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}.header-actions[data-two-buttons-final="1"]>*{display:grid!important;width:100%!important;min-height:56px!important;height:56px!important;border-radius:20px!important;place-items:center!important;text-align:center!important;font-weight:950!important;font-size:13px!important;line-height:1.05!important;padding:6px 10px!important}.header-actions[data-two-buttons-final="1"]>[data-mobile-action="nts"]::before{content:"◉";display:block;color:#1d4ed8;font-size:16px;line-height:16px}.header-actions[data-two-buttons-final="1"]>[data-mobile-action="feedback"]::before{content:"+";display:block;color:#fff;font-size:22px;line-height:16px}.header-actions[data-two-buttons-final="1"]>[data-mobile-action="feedback"]{background:#1d4ed8!important;color:#fff!important;border-color:#1d4ed8!important}}';
    document.head.appendChild(style);
  }

  function init() {
    addStyle();
    forceTwoButtons();
    setTimeout(forceTwoButtons, 200);
    setTimeout(forceTwoButtons, 700);
    setTimeout(forceTwoButtons, 1600);
    new MutationObserver(function () {
      clearTimeout(init.timer);
      init.timer = setTimeout(forceTwoButtons, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
