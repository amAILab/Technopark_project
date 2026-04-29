/*
  Последняя точка входа мобильной версии.
  Подключает финальный стабильный слой final-showcase-lock.js.
*/
(function () {
  function loadFinalLock() {
    if (document.querySelector('script[data-final-showcase-lock="1"]')) return;
    var script = document.createElement('script');
    script.src = 'final-showcase-lock.js?v=final-lock-20260429-1025';
    script.defer = true;
    script.dataset.finalShowcaseLock = '1';
    document.body.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFinalLock);
  } else {
    loadFinalLock();
  }
})();
