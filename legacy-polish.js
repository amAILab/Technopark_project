(() => {
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  ready(() => {
    document.body.classList.add('legacy-polish-ready');
    const nav = document.createElement('nav');
    nav.className = 'legacy-floating-nav';
    nav.setAttribute('aria-label', 'Быстрая навигация расширенной панели');
    nav.innerHTML = '<a href="#overview" title="Наверх">↑</a><a href="#actions" title="Действия">!</a><a href="#projects" title="Проекты">P</a><a href="#nts" title="НТС">N</a>';
    document.body.appendChild(nav);

    const density = document.createElement('button');
    density.className = 'legacy-density-toggle';
    density.type = 'button';
    density.textContent = 'Компактно';
    density.addEventListener('click', () => {
      document.body.classList.toggle('legacy-compact');
      density.textContent = document.body.classList.contains('legacy-compact') ? 'Воздух' : 'Компактно';
    });
    document.body.appendChild(density);

    const links = [...document.querySelectorAll('.main-nav a')];
    const update = () => {
      let active = null;
      links.forEach((link) => {
        const section = document.querySelector(link.getAttribute('href'));
        if (section && section.getBoundingClientRect().top < innerHeight * 0.35) active = link;
      });
      links.forEach((link) => link.classList.toggle('is-active', link === active));
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    document.querySelectorAll('.section, .panel, .table-card, .executive-snapshot, .leader-top-decisions').forEach((el) => {
      el.setAttribute('data-polished', 'true');
    });
  });
})();
