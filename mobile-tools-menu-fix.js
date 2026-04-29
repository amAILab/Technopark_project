/* Видимый блок инструментов в мобильном меню */
(function () {
  function $(selector) { return document.querySelector(selector); }

  function addStyles() {
    if ($('#mobileToolsMenuFixStyles')) return;
    var style = document.createElement('style');
    style.id = 'mobileToolsMenuFixStyles';
    style.textContent = '@media (max-width:760px){#mobileToolsMenuPanelFix{grid-column:1/-1;display:none;gap:8px;padding:10px;border:1px solid rgba(37,99,235,.18);border-radius:18px;background:rgba(239,246,255,.85)}#mobileToolsMenuPanelFix.is-open{display:grid!important}#mobileToolsMenuPanelFix strong{color:#1e3a8a;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}#mobileToolsMenuPanelFix button,#mobileToolsMenuPanelFix a{display:flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;border:0!important;border-radius:14px!important;padding:9px 12px!important;background:#fff!important;color:#1d4ed8!important;text-align:center!important;text-decoration:none!important;font-size:13px!important;font-weight:900!important;box-shadow:0 8px 20px rgba(15,23,42,.06)!important}#mobileMenuTools.is-open{background:#dbeafe!important;color:#1d4ed8!important}}';
    document.head.appendChild(style);
  }

  function toolButton(text, handler) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      handler();
    }, true);
    return button;
  }

  function ensureToolsButton() {
    var nav = $('#mainNav');
    if (!nav) return null;
    var button = $('#mobileMenuTools');
    if (!button) {
      button = document.createElement('button');
      button.id = 'mobileMenuTools';
      button.className = 'mobile-menu-utility';
      button.type = 'button';
      button.textContent = '▦ Инструменты';
      nav.appendChild(button);
    }
    return button;
  }

  function ensurePanel() {
    var nav = $('#mainNav');
    var button = ensureToolsButton();
    if (!nav || !button) return null;
    var panel = $('#mobileToolsMenuPanelFix');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'mobileToolsMenuPanelFix';
    panel.innerHTML = '<strong>Инструменты панели</strong>';

    panel.appendChild(toolButton('↻ Обновить данные', function () {
      var refresh = document.querySelector('#refreshData, #refreshSheet, #refresh');
      if (refresh) refresh.click();
    }));

    panel.appendChild(toolButton('Сбросить фильтры', function () {
      var reset = document.querySelector('#resetFilters, #clearFilters');
      if (reset) reset.click();
      document.querySelectorAll('.toolbar input, .toolbar select').forEach(function (field) {
        if (field.tagName === 'SELECT') field.selectedIndex = 0;
        else field.value = '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }));

    var tableLink = document.createElement('a');
    tableLink.href = 'https://docs.google.com/spreadsheets/d/1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60/edit';
    tableLink.target = '_blank';
    tableLink.rel = 'noopener noreferrer';
    tableLink.textContent = '↗ Открыть таблицу';
    panel.appendChild(tableLink);

    button.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function togglePanel(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    var panel = ensurePanel();
    var button = $('#mobileMenuTools');
    if (!panel) return;
    var open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    if (button) {
      button.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    }
  }

  function patchButton() {
    addStyles();
    var button = ensureToolsButton();
    ensurePanel();
    if (!button || button.dataset.visibleToolsReady) return;
    button.dataset.visibleToolsReady = '1';
    button.setAttribute('aria-controls', 'mobileToolsMenuPanelFix');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', togglePanel, true);
  }

  function init() {
    patchButton();
    setTimeout(patchButton, 300);
    setTimeout(patchButton, 1000);
    setTimeout(patchButton, 2200);
    new MutationObserver(function () {
      clearTimeout(init.timer);
      init.timer = setTimeout(patchButton, 80);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
