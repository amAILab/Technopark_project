/*
  Жесткая финальная мобильная шапка.
  На телефоне прячет все старые кнопки в topbar и показывает ровно две:
  1) Режим НТС
  2) Добавить пожелание
*/
(function () {
  function isMobile() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function addStyle() {
    if (document.querySelector('#mobileHeaderHardFinalStyle')) return;
    var style = document.createElement('style');
    style.id = 'mobileHeaderHardFinalStyle';
    style.textContent = `
      @media (max-width: 760px) {
        .topbar.mobile-hard-final {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 10px !important;
        }

        .topbar.mobile-hard-final > .brand,
        .topbar.mobile-hard-final > #menuToggle,
        .topbar.mobile-hard-final > .menu-button,
        .topbar.mobile-hard-final > #mainNav,
        .topbar.mobile-hard-final > .main-nav,
        .topbar.mobile-hard-final > #mobileHeaderHardActions {
          display: inherit;
        }

        .topbar.mobile-hard-final > .header-actions,
        .topbar.mobile-hard-final > .showcase-controls,
        .topbar.mobile-hard-final > .tools-menu,
        .topbar.mobile-hard-final > .tools-menu-wrap,
        .topbar.mobile-hard-final > .tools-dropdown,
        .topbar.mobile-hard-final > div:not(#mobileHeaderHardActions):not(.brand):not(.main-nav),
        .topbar.mobile-hard-final > button:not(#menuToggle):not(.menu-button),
        .topbar.mobile-hard-final > a:not(.brand) {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        #mobileHeaderHardActions {
          grid-column: 1 / -1 !important;
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          width: 100% !important;
        }

        #mobileHeaderHardActions button,
        #mobileHeaderHardActions a {
          display: grid !important;
          grid-template-rows: 18px auto !important;
          place-items: center !important;
          gap: 3px !important;
          min-height: 58px !important;
          height: 58px !important;
          width: 100% !important;
          border-radius: 20px !important;
          padding: 6px 10px !important;
          text-align: center !important;
          text-decoration: none !important;
          font-size: 13px !important;
          line-height: 1.05 !important;
          font-weight: 950 !important;
          box-sizing: border-box !important;
        }

        #mobileHeaderHardNts {
          border: 1px solid var(--line, #dfe6ef) !important;
          background: #fff !important;
          color: var(--text, #0f172a) !important;
        }

        #mobileHeaderHardNts::before {
          content: '◉';
          display: block;
          height: 18px;
          color: #1d4ed8;
          font-size: 17px;
          line-height: 18px;
        }

        #mobileHeaderHardFeedback {
          border: 1px solid #1d4ed8 !important;
          background: #1d4ed8 !important;
          color: #fff !important;
        }

        #mobileHeaderHardFeedback::before {
          content: '+';
          display: block;
          height: 18px;
          color: #fff;
          font-size: 24px;
          line-height: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function openFeedback(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (typeof window.openTechnoFeedbackModal === 'function') {
      window.openTechnoFeedbackModal();
      return;
    }

    var nts = document.querySelector('#nts');
    if (nts) nts.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleNts(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    document.body.classList.toggle('executive-mode');
    var button = document.querySelector('#mobileHeaderHardNts');
    if (button) {
      button.textContent = document.body.classList.contains('executive-mode') ? 'Обычный режим' : 'Режим НТС';
    }
  }

  function ensureHardActions() {
    if (!isMobile()) return;
    var topbar = document.querySelector('.topbar');
    if (!topbar) return;

    topbar.classList.add('mobile-hard-final');

    var actions = document.querySelector('#mobileHeaderHardActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'mobileHeaderHardActions';
      actions.innerHTML = `
        <button id="mobileHeaderHardNts" type="button">Режим НТС</button>
        <a id="mobileHeaderHardFeedback" href="#nts" role="button" data-mobile-action="feedback" aria-label="Добавить пожелание НТС">Добавить пожелание</a>
      `;
      topbar.appendChild(actions);

      actions.querySelector('#mobileHeaderHardNts').addEventListener('click', toggleNts, true);
      actions.querySelector('#mobileHeaderHardFeedback').addEventListener('click', openFeedback, true);
    }

    Array.from(topbar.querySelectorAll('button, a')).forEach(function (node) {
      if (node.closest('#mobileHeaderHardActions')) return;
      if (node.classList.contains('brand')) return;
      if (node.id === 'menuToggle' || node.classList.contains('menu-button')) return;
      if (node.closest('#mainNav') || node.closest('.main-nav')) return;
      node.setAttribute('data-hard-hidden-mobile', '1');
    });
  }

  function init() {
    addStyle();
    ensureHardActions();
    setTimeout(ensureHardActions, 150);
    setTimeout(ensureHardActions, 500);
    setTimeout(ensureHardActions, 1200);
    setTimeout(ensureHardActions, 2500);

    new MutationObserver(function () {
      clearTimeout(init.timer);
      init.timer = setTimeout(ensureHardActions, 40);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
