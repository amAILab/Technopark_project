(() => {
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const parsePercent = (value) => Math.max(0, Math.min(100, parseInt(String(value || '').replace('%', '').replace(',', '.')) || 0));
  const parseDate = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (!match) return '';
    return `${match[3].length === 2 ? '20' + match[3] : match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  };
  const daysUntil = (value) => {
    const iso = parseDate(value);
    if (!iso) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(`${iso}T00:00:00`) - today) / 86400000);
  };
  const money = (value) => {
    const num = Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
    return new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
  };
  const storageKey = 'tp_rgsu_local_projects';
  const getProjects = () => (window.state && Array.isArray(window.state.projects)) ? window.state.projects : [];
  const getFiltered = () => {
    try {
      if (typeof window.filtered === 'function') return window.filtered();
    } catch (e) {}
    return getProjects();
  };
  const getRisk = (project) => {
    try {
      if (typeof window.risk === 'function') return window.risk(project) || '';
    } catch (e) {}
    if (!project.owner) return 'не назначен ответственный';
    if (!project.funding) return 'не выбран грантовый маршрут';
    if (!project.nextAction) return 'не указано следующее действие';
    return project.note || '';
  };
  const docItems = ['Паспорт', 'MVP / прототип', 'Пилот / письма', 'Смета', 'Презентация', 'Юрконтур'];
  const packageFor = (project) => {
    const packs = (window.state && Array.isArray(window.state.packs)) ? window.state.packs : [];
    const pack = packs.find((item) => String(item.ID || item.id || '') === String(project.id || '') || String(item.Проект || item.project || '') === String(project.project || '')) || {};
    const text = JSON.stringify(pack).toLowerCase();
    const ready = docItems.filter((name) => text.includes(name.toLowerCase()) || text.includes('да')).length;
    return { pack, ready, total: docItems.length };
  };
  const priorityScore = (project) => {
    let score = parsePercent(project.readiness);
    if (project.priority === 'Высокий') score += 25;
    if (project.funding) score += 12;
    if (project.deadline) score += 8;
    score += packageFor(project).ready * 5;
    if (getRisk(project)) score -= 18;
    const due = daysUntil(project.deadline);
    if (due !== null && due <= 30) score += 10;
    if (score >= 105) return 'Высокий';
    if (score >= 70) return 'Средний';
    if (score >= 35) return 'Низкий';
    return 'Заморозить';
  };
  const ensureStyles = () => {
    if ($('tpExtraStyles')) return;
    const style = document.createElement('style');
    style.id = 'tpExtraStyles';
    style.textContent = `
      .nav [data-view="report"], .nav [data-view="calendar"], .nav [data-view="problems"]{display:block}
      .present-mode .side,.present-mode .filters,.present-mode #settings,.present-mode .actions.compact-hide{display:none!important}
      .present-mode .app{display:block}.present-mode .main{padding:24px clamp(18px,4vw,56px)}.present-mode .kpis{grid-template-columns:repeat(5,1fr)}
      .extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.extra-list article{display:grid;grid-template-columns:120px 1fr auto;gap:14px;align-items:center;padding:15px 18px;border-bottom:1px solid var(--line)}
      .doc-status{display:grid;gap:8px}.doc-status div{display:flex;align-items:center;gap:8px;color:var(--muted)}.doc-status b{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#eef1ee}.doc-status .ok b{background:#e2f1ec;color:#0d533f}
      .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-grid article{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff}.detail-grid small{display:block;color:var(--muted);font-weight:850;margin-bottom:5px}
      .project{cursor:pointer}.project:hover{transform:translateY(-1px);box-shadow:0 22px 60px rgba(16,35,29,.11)}
      #projectDetail::backdrop{background:rgba(16,35,29,.50)}#projectDetail{width:min(880px,calc(100% - 28px));border:0;border-radius:22px;padding:0;box-shadow:var(--shadow)}
      .report-box{min-height:520px;border:0;border-radius:0;padding:22px;background:#fbfcfb;line-height:1.55;white-space:pre-wrap;width:100%}
      @media(max-width:900px){.extra-grid,.detail-grid{grid-template-columns:1fr}.extra-list article{grid-template-columns:1fr}}
      @media print{.side,.filters,.actions,.btn,.sync{display:none!important}.app{display:block}.main{padding:0}.view{display:block}.panel,.card{box-shadow:none}.report-box{min-height:auto}}
    `;
    document.head.append(style);
  };
  const addNav = () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const items = [
      ['calendar', 'Календарь'],
      ['problems', 'Проблемы'],
      ['report', 'Отчет']
    ];
    items.forEach(([id, label]) => {
      if (!nav.querySelector(`[data-view="${id}"]`)) {
        const button = document.createElement('button');
        button.dataset.view = id;
        button.type = 'button';
        button.textContent = label;
        nav.append(button);
      }
    });
  };
  const addViews = () => {
    const main = document.querySelector('.main');
    if (!main) return;
    if (!$('calendar')) {
      main.insertAdjacentHTML('beforeend', `<section class="view" id="calendar"><section class="panel"><div class="head"><div><h2>Грантовый календарь</h2><p>Дедлайны, просроченные сроки и проекты без даты.</p></div></div><div class="extra-list" id="calendarList"></div></section></section>`);
    }
    if (!$('problems')) {
      main.insertAdjacentHTML('beforeend', `<section class="view" id="problems"><div class="extra-grid"><section class="panel"><div class="head"><div><h2>Проблемные проекты</h2><p>Автоматически выявленные пробелы по ответственным, грантам, срокам и действиям.</p></div></div><div class="extra-list" id="problemList"></div></section><section class="panel"><div class="head"><div><h2>Готовность документов</h2><p>Паспорт, MVP, пилот, смета, презентация и юридический контур.</p></div></div><div class="extra-list" id="docReadinessList"></div></section></div></section>`);
    }
    if (!$('report')) {
      main.insertAdjacentHTML('beforeend', `<section class="view" id="report"><section class="panel"><div class="head"><div><h2>Отчет для проректора</h2><p>Сводка для совещания: решения, риски, дедлайны и упаковка проектов.</p></div><div class="actions"><button class="btn" id="copyReport">Скопировать</button><button class="btn" id="downloadReport">Скачать TXT</button><button class="btn primary" id="printReport">Печать / PDF</button></div></div><textarea class="report-box" id="reportText" readonly></textarea></section></section>`);
    }
  };
  const addTopButtons = () => {
    const topActions = document.querySelector('.top .actions');
    if (!topActions || $('presentMode')) return;
    topActions.insertAdjacentHTML('afterbegin', `<button class="btn" id="presentMode" type="button">Режим презентации</button><button class="btn" id="quickReport" type="button">Отчет</button>`);
  };
  const buildReport = () => {
    const projects = getFiltered();
    const all = getProjects();
    const urgent = projects.filter((p) => { const d = daysUntil(p.deadline); return d !== null && d <= 30; });
    const risks = projects.filter((p) => getRisk(p));
    const ready = projects.filter((p) => parsePercent(p.readiness) >= 70 || String(p.status || '').toLowerCase().includes('упаков'));
    const lines = [];
    lines.push('Отчет для проректора по проектному портфелю Технопарка РГСУ');
    lines.push('');
    lines.push('Дата формирования: ' + new Date().toLocaleString('ru-RU'));
    lines.push('');
    lines.push('1. Общая сводка');
    lines.push('Всего проектов в реестре: ' + all.length);
    lines.push('Показано с учетом фильтров: ' + projects.length);
    lines.push('Готовы к упаковке / подаче: ' + ready.length);
    lines.push('Срочные дедлайны до 30 дней: ' + urgent.length);
    lines.push('Проекты с блокерами: ' + risks.length);
    lines.push('');
    lines.push('2. Ближайшие дедлайны');
    lines.push(urgent.length ? urgent.slice(0, 10).map((p) => `- ${p.project}: ${p.deadline || 'без даты'}; ${p.funding || 'маршрут не выбран'}`).join('\n') : '- Срочных дедлайнов нет');
    lines.push('');
    lines.push('3. Решения руководства');
    lines.push(risks.length ? risks.slice(0, 12).map((p) => `- ${p.project}: ${getRisk(p)}`).join('\n') : '- Критичных решений нет');
    lines.push('');
    lines.push('4. Рекомендуемые действия');
    lines.push('- Рассмотреть проекты с высоким приоритетом на ближайшем НТС.');
    lines.push('- Назначить ответственных по проектам без владельца.');
    lines.push('- Дособрать паспорт, MVP, смету, презентацию и письма пилотных площадок.');
    lines.push('- Передать проекты с готовностью от 70% в грантовую упаковку.');
    return lines.join('\n');
  };
  const renderExtra = () => {
    const projects = getFiltered();
    const calendar = $('calendarList');
    if (calendar) {
      calendar.innerHTML = projects.slice().sort((a, b) => (daysUntil(a.deadline) ?? 9999) - (daysUntil(b.deadline) ?? 9999)).map((p) => {
        const due = daysUntil(p.deadline);
        const badge = due === null ? '<span class="badge yellow">без даты</span>' : `<span class="badge ${due <= 30 ? 'red' : ''}">${due < 0 ? 'просрочено ' + Math.abs(due) : due + ' дн.'}</span>`;
        return `<article><b>${esc(p.deadline || 'Без срока')}</b><span><b>${esc(p.project)}</b><br><small class="muted">${esc(p.funding || p.direction || '')}</small></span>${badge}</article>`;
      }).join('') || '<div class="empty">Нет проектов для календаря</div>';
    }
    const problems = $('problemList');
    if (problems) {
      const risky = projects.filter((p) => getRisk(p));
      problems.innerHTML = risky.map((p) => `<article><b>${esc(p.id || '')}</b><span><b>${esc(p.project)}</b><br><small class="muted">${esc(getRisk(p))}</small></span><span class="badge red">решить</span></article>`).join('') || '<div class="empty">Проблемных проектов нет</div>';
    }
    const docs = $('docReadinessList');
    if (docs) {
      docs.innerHTML = projects.map((p) => {
        const pack = packageFor(p);
        return `<article><b>${pack.ready}/${pack.total}</b><span><b>${esc(p.project)}</b><br><small class="muted">Комплект подачи: ${pack.ready} из ${pack.total}</small></span><span class="badge ${pack.ready >= pack.total ? '' : 'yellow'}">${Math.round(pack.ready / pack.total * 100)}%</span></article>`;
      }).join('') || '<div class="empty">Нет данных по документам</div>';
    }
    const report = $('reportText');
    if (report) report.value = buildReport();
  };
  const openDetail = (project) => {
    let modal = $('projectDetail');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `<dialog id="projectDetail"><div class="form"><div class="top"><div><h2 id="detailTitle">Карточка проекта</h2><p class="muted" id="detailSub"></p></div><button class="btn" id="detailClose" type="button">Закрыть</button></div><div class="detail-grid" id="detailGrid"></div></div></dialog>`);
      modal = $('projectDetail');
      $('detailClose').onclick = () => modal.close();
    }
    const pack = packageFor(project);
    const risk = getRisk(project) || 'Критичных блокеров нет';
    $('detailTitle').textContent = project.project || 'Проект';
    $('detailSub').textContent = `${project.direction || 'Без направления'} · ${project.owner || 'ответственный не назначен'}`;
    $('detailGrid').innerHTML = `
      <article><small>Приоритет</small>${esc(priorityScore(project))}</article>
      <article><small>УТГ</small>${esc(project.trl || '?')}</article>
      <article><small>Статус</small>${esc(project.status || 'Не указан')}</article>
      <article><small>Срок</small>${esc(project.deadline || 'Без срока')}</article>
      <article><small>Маршрут финансирования</small>${esc(project.funding || 'Не выбран')}</article>
      <article><small>Готовность</small><div class="progress"><i style="width:${parsePercent(project.readiness)}%"></i></div>${parsePercent(project.readiness)}%</article>
      <article><small>Решение / блокер</small>${esc(risk)}</article>
      <article><small>Следующее действие</small>${esc(project.nextAction || 'Не указано')}</article>
      <article style="grid-column:1/-1"><small>Комплект документов</small><div class="doc-status">${docItems.map((name, i) => `<div class="${i < pack.ready ? 'ok' : ''}"><b>${i < pack.ready ? '✓' : '-'}</b>${name}</div>`).join('')}</div></article>
    `;
    modal.showModal();
  };
  const bindCards = () => {
    $$('.project').forEach((card) => {
      if (card.dataset.extraBound) return;
      card.dataset.extraBound = '1';
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        const title = card.querySelector('h3')?.textContent || '';
        const project = getProjects().find((p) => p.project === title);
        if (project) openDetail(project);
      });
    });
  };
  const bind = () => {
    document.addEventListener('click', (event) => {
      const navButton = event.target.closest('.nav button[data-view]');
      if (navButton) setTimeout(renderExtra, 60);
    });
    const present = $('presentMode');
    if (present) present.onclick = () => { document.body.classList.toggle('present-mode'); present.textContent = document.body.classList.contains('present-mode') ? 'Обычный режим' : 'Режим презентации'; };
    const quickReport = $('quickReport');
    if (quickReport) quickReport.onclick = () => { document.querySelector('.nav [data-view="report"]')?.click(); renderExtra(); };
    const copy = $('copyReport');
    if (copy) copy.onclick = async () => { await navigator.clipboard.writeText(buildReport()); if (typeof window.toast === 'function') window.toast('Отчет скопирован'); };
    const download = $('downloadReport');
    if (download) download.onclick = () => { const blob = new Blob([buildReport()], {type:'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Отчет для проректора - Технопарк РГСУ.txt'; a.click(); URL.revokeObjectURL(a.href); };
    const print = $('printReport');
    if (print) print.onclick = () => { document.querySelector('.nav [data-view="report"]')?.click(); setTimeout(() => window.print(), 100); };
  };
  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = function patchedRender() {
      originalRender.apply(this, arguments);
      renderExtra();
      setTimeout(bindCards, 20);
    };
  }
  const boot = () => {
    ensureStyles();
    addNav();
    addViews();
    addTopButtons();
    bind();
    renderExtra();
    setTimeout(bindCards, 300);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
