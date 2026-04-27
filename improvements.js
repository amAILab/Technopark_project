(() => {
  const byId = (id) => document.getElementById(id);
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const textOf = (project, keys) => keys.map((key) => project?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
  const projectName = (p) => textOf(p, ['project', 'name', 'Проект', 'Название']);
  const owner = (p) => textOf(p, ['owner', 'Ответственный']);
  const funding = (p) => textOf(p, ['funding', 'grant', 'Грант', 'Маршрут финансирования']);
  const deadline = (p) => textOf(p, ['deadline', 'Срок', 'Дедлайн']);
  const readiness = (p) => Math.max(0, Math.min(100, parseInt(String(textOf(p, ['readiness', 'ready', 'Готовность пакета', 'Готовность']) || '0').replace('%', '').replace(',', '.')) || 0));
  const nextAction = (p) => textOf(p, ['nextAction', 'nextStep', 'Следующее действие', 'Действие']);
  const status = (p) => textOf(p, ['status', 'Статус']);
  const direction = (p) => textOf(p, ['direction', 'type', 'Направление', 'Тип']);
  const priority = (p) => textOf(p, ['priority', 'Приоритет']);
  const trl = (p) => textOf(p, ['trl', 'УТГ']);
  const note = (p) => textOf(p, ['note', 'Блокер / примечание', 'Примечание']);
  const docs = (p) => textOf(p, ['docs', 'documents', 'Документы', 'Материалы']);

  const parseDate = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
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
  const getProjects = () => {
    try {
      if (typeof window.filtered === 'function') return window.filtered() || [];
    } catch (error) {}
    if (Array.isArray(window.projects)) return window.projects;
    return [];
  };
  const getAllProjects = () => {
    if (window.state && Array.isArray(window.state.projects)) return window.state.projects;
    if (Array.isArray(window.projects)) return window.projects;
    return getProjects();
  };
  const missing = (p) => {
    const list = [];
    if (!projectName(p)) list.push('название');
    if (!owner(p)) list.push('ответственный');
    if (!funding(p)) list.push('маршрут финансирования');
    if (!deadline(p)) list.push('срок');
    if (!nextAction(p)) list.push('следующее действие');
    if (!status(p)) list.push('статус');
    if (!docs(p)) list.push('документы');
    return list;
  };
  const docItems = ['Паспорт', 'MVP / прототип', 'Пилот / письма', 'Смета', 'Презентация', 'Юрконтур'];
  const docReady = (p) => {
    const packRows = window.state && Array.isArray(window.state.packs) ? window.state.packs : [];
    const pack = packRows.find((row) => String(row.ID || row.id || '') === String(p.id || '') || String(row.Проект || row.project || '') === String(projectName(p))) || {};
    const source = (JSON.stringify(pack) + ' ' + docs(p) + ' ' + nextAction(p)).toLowerCase();
    const ready = docItems.filter((item) => source.includes(item.toLowerCase()) || source.includes('да')).length;
    return { ready, total: docItems.length, pack };
  };
  const qualityScore = (p) => {
    const required = ['name', 'owner', 'funding', 'deadline', 'next', 'status'];
    let score = 0;
    if (projectName(p)) score += 18;
    if (owner(p)) score += 18;
    if (funding(p)) score += 16;
    if (deadline(p)) score += 16;
    if (nextAction(p)) score += 16;
    if (status(p)) score += 8;
    if (docs(p)) score += 8;
    return Math.min(100, score);
  };
  const expertScore = (p) => {
    let score = readiness(p);
    if (priority(p) === 'Высокий') score += 25;
    if (funding(p)) score += 14;
    if (owner(p)) score += 10;
    if (nextAction(p)) score += 8;
    score += docReady(p).ready * 5;
    const due = daysUntil(deadline(p));
    if (due !== null && due <= 30) score += 12;
    if (missing(p).length) score -= missing(p).length * 9;
    return Math.max(0, Math.min(140, score));
  };
  const expertLevel = (p) => {
    const score = expertScore(p);
    if (score >= 105) return 'А - подавать / утверждать';
    if (score >= 80) return 'B - быстро доупаковать';
    if (score >= 55) return 'C - требуется куратор';
    return 'D - заморозить или переосмыслить';
  };
  const recommendedDecision = (p) => {
    const miss = missing(p);
    const due = daysUntil(deadline(p));
    if (!owner(p)) return 'назначить ответственного';
    if (!funding(p)) return 'выбрать грантовый маршрут';
    if (due !== null && due <= 14 && readiness(p) < 70) return 'срочно решить на НТС';
    if (readiness(p) >= 70 && docReady(p).ready >= 4) return 'передать в грантовую упаковку';
    if (miss.includes('документы')) return 'дособрать комплект документов';
    return nextAction(p) || 'назначить следующий шаг';
  };
  const badge = (label, color = '') => `<span class="badge ${color}">${safe(label)}</span>`;

  const style = () => {
    if (byId('tpExecutiveStyles')) return;
    const node = document.createElement('style');
    node.id = 'tpExecutiveStyles';
    node.textContent = `
      .tp-wide{display:grid;grid-template-columns:1fr;gap:12px}.tp-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tp-list article{display:grid;grid-template-columns:110px 1fr auto;gap:14px;align-items:center;padding:15px 18px;border-bottom:1px solid var(--line)}
      .tp-matrix-card{display:grid;grid-template-columns:110px 1fr 210px;gap:14px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line)}.tp-score{font-size:28px;font-weight:900;color:var(--green)}.tp-small{color:var(--muted);font-size:12px}.tp-qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px}.tp-qa-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px}.tp-qa-card strong{display:block;font-size:28px;margin:8px 0}.tp-agenda-text{width:100%;min-height:520px;border:0;padding:22px;background:#fbfcfb;line-height:1.55}.tp-docbar{height:8px;border-radius:99px;background:#edf1ee;overflow:hidden}.tp-docbar i{display:block;height:100%;background:var(--green)}
      .present-mode .side,.present-mode .filters,.present-mode #settings{display:none!important}.present-mode .app{display:block}.present-mode .main{padding:24px clamp(18px,4vw,56px)}
      .project{cursor:pointer}.project:hover{transform:translateY(-1px);box-shadow:0 22px 60px rgba(16,35,29,.11)}#projectDetail::backdrop{background:rgba(16,35,29,.50)}#projectDetail{width:min(900px,calc(100% - 28px));border:0;border-radius:22px;padding:0;box-shadow:var(--shadow)}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-grid article{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff}.detail-grid small{display:block;color:var(--muted);font-weight:850;margin-bottom:5px}.doc-status{display:grid;gap:8px}.doc-status div{display:flex;gap:8px;align-items:center}.doc-status b{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#eef1ee}.doc-status .ok b{background:#e2f1ec;color:#0d533f}
      @media(max-width:900px){.tp-two,.tp-qa-grid,.detail-grid{grid-template-columns:1fr}.tp-list article,.tp-matrix-card{grid-template-columns:1fr}}@media print{.side,.filters,.actions,.btn,.sync{display:none!important}.app{display:block}.main{padding:0}.view{display:block}.panel,.card{box-shadow:none}.tp-agenda-text{min-height:auto}}
    `;
    document.head.append(node);
  };

  const addNav = () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    [['calendar','Календарь'],['problems','Проблемы'],['matrix','Матрица'],['quality','Качество данных'],['nts','НТС'],['report','Отчет']].forEach(([id, title]) => {
      if (!nav.querySelector(`[data-view="${id}"]`)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.view = id;
        button.textContent = title;
        nav.append(button);
      }
    });
  };
  const addViews = () => {
    const main = document.querySelector('.main');
    if (!main) return;
    if (!byId('calendar')) main.insertAdjacentHTML('beforeend', `<section class="view" id="calendar"><section class="panel"><div class="head"><div><h2>Грантовый календарь</h2><p>Дедлайны, просроченные сроки и проекты без даты.</p></div></div><div class="tp-list" id="calendarList"></div></section></section>`);
    if (!byId('problems')) main.insertAdjacentHTML('beforeend', `<section class="view" id="problems"><div class="tp-two"><section class="panel"><div class="head"><div><h2>Проблемные проекты</h2><p>Автоматически выявленные пробелы.</p></div></div><div class="tp-list" id="problemList"></div></section><section class="panel"><div class="head"><div><h2>Готовность документов</h2><p>Паспорт, MVP, пилот, смета, презентация, юрконтур.</p></div></div><div class="tp-list" id="docReadinessList"></div></section></div></section>`);
    if (!byId('matrix')) main.insertAdjacentHTML('beforeend', `<section class="view" id="matrix"><section class="panel"><div class="head"><div><h2>Экспертная матрица приоритетов</h2><p>Рейтинг проектов по готовности, срокам, документам, ответственным и грантовому маршруту.</p></div></div><div id="matrixList"></div></section></section>`);
    if (!byId('quality')) main.insertAdjacentHTML('beforeend', `<section class="view" id="quality"><section class="panel"><div class="head"><div><h2>Контроль качества данных</h2><p>Показывает, насколько реестр пригоден для управленческого решения.</p></div><button class="btn" id="copyQa">Скопировать аудит</button></div><div class="tp-qa-grid" id="qaCards"></div><div class="tp-list" id="qaList"></div></section></section>`);
    if (!byId('nts')) main.insertAdjacentHTML('beforeend', `<section class="view" id="nts"><section class="panel"><div class="head"><div><h2>Повестка НТС</h2><p>Автоматический план ближайшего научно-технического совета.</p></div><div class="actions"><button class="btn" id="copyNts">Скопировать</button><button class="btn primary" id="printNts">Печать / PDF</button></div></div><textarea class="tp-agenda-text" id="ntsText" readonly></textarea></section></section>`);
    if (!byId('report')) main.insertAdjacentHTML('beforeend', `<section class="view" id="report"><section class="panel"><div class="head"><div><h2>Отчет для проректора</h2><p>Сводка для совещания: решения, риски, дедлайны и упаковка проектов.</p></div><div class="actions"><button class="btn" id="copyReport">Скопировать</button><button class="btn" id="downloadReport">Скачать TXT</button><button class="btn primary" id="printReport">Печать / PDF</button></div></div><textarea class="tp-agenda-text" id="reportText" readonly></textarea></section></section>`);
  };
  const addTopButtons = () => {
    const actions = document.querySelector('.top .actions');
    if (!actions || byId('presentMode')) return;
    actions.insertAdjacentHTML('afterbegin', `<button class="btn" id="presentMode" type="button">Режим презентации</button><button class="btn" id="quickNts" type="button">НТС</button><button class="btn" id="quickReport" type="button">Отчет</button>`);
  };

  const buildNts = () => {
    const projects = getProjects();
    const high = projects.slice().sort((a,b) => expertScore(b) - expertScore(a)).slice(0, 8);
    const urgent = projects.filter((p) => { const d = daysUntil(deadline(p)); return d !== null && d <= 30; });
    const problem = projects.filter((p) => missing(p).length || note(p));
    const lines = ['Повестка НТС Технопарка РГСУ', '', 'Дата формирования: ' + new Date().toLocaleString('ru-RU'), '', '1. Проекты к рассмотрению'];
    lines.push(high.map((p, i) => `${i + 1}. ${projectName(p)} - ${expertLevel(p)}. Решение: ${recommendedDecision(p)}.`).join('\n') || 'Нет проектов для рассмотрения');
    lines.push('', '2. Срочные дедлайны');
    lines.push(urgent.map((p) => `- ${projectName(p)}: срок ${deadline(p) || 'не указан'}, маршрут: ${funding(p) || 'не выбран'}`).join('\n') || '- Срочных дедлайнов нет');
    lines.push('', '3. Проблемные вопросы');
    lines.push(problem.slice(0, 12).map((p) => `- ${projectName(p)}: ${missing(p).join(', ') || note(p)}`).join('\n') || '- Критичных проблем нет');
    lines.push('', '4. Предлагаемые решения НТС', '- Утвердить проекты категории A для грантовой упаковки.', '- Назначить кураторов по проектам категории B и C.', '- Закрыть или переупаковать проекты категории D.', '- Зафиксировать ответственных и сроки следующего шага по каждому проекту.');
    return lines.join('\n');
  };
  const buildReport = () => {
    const projects = getProjects();
    const urgent = projects.filter((p) => { const d = daysUntil(deadline(p)); return d !== null && d <= 30; });
    const blockers = projects.filter((p) => missing(p).length || note(p));
    const ready = projects.filter((p) => readiness(p) >= 70 || expertScore(p) >= 90);
    const averageQuality = projects.length ? Math.round(projects.reduce((s,p) => s + qualityScore(p), 0) / projects.length) : 0;
    return ['Отчет для проректора по проектному портфелю Технопарка РГСУ', '', 'Дата формирования: ' + new Date().toLocaleString('ru-RU'), '', '1. Общая сводка', 'Всего проектов: ' + projects.length, 'Готовы к упаковке / подаче: ' + ready.length, 'Срочные дедлайны до 30 дней: ' + urgent.length, 'Проекты с блокерами: ' + blockers.length, 'Среднее качество данных: ' + averageQuality + '%', '', '2. Топ проектов по экспертной матрице', projects.slice().sort((a,b) => expertScore(b) - expertScore(a)).slice(0, 8).map((p) => `- ${projectName(p)}: ${expertScore(p)} баллов, ${expertLevel(p)}, решение: ${recommendedDecision(p)}`).join('\n') || '- Нет данных', '', '3. Рекомендации', '- Рассмотреть топ проектов на ближайшем НТС.', '- Довести качество данных реестра минимум до 85%.', '- По проектам без ответственного и срока принять управленческое решение.', '- По проектам категории A начать грантовую упаковку.'].join('\n');
  };
  const renderExtra = () => {
    const projects = getProjects();
    const calendar = byId('calendarList');
    if (calendar) calendar.innerHTML = projects.slice().sort((a,b) => (daysUntil(deadline(a)) ?? 9999) - (daysUntil(deadline(b)) ?? 9999)).map((p) => {
      const d = daysUntil(deadline(p));
      const color = d === null ? 'yellow' : d <= 30 ? 'red' : '';
      return `<article><b>${safe(deadline(p) || 'Без срока')}</b><span><b>${safe(projectName(p))}</b><br><small class="muted">${safe(funding(p) || direction(p))}</small></span>${badge(d === null ? 'без даты' : d < 0 ? 'просрочено ' + Math.abs(d) : d + ' дн.', color)}</article>`;
    }).join('') || '<div class="empty">Нет проектов для календаря</div>';
    const problems = byId('problemList');
    if (problems) {
      const rows = projects.filter((p) => missing(p).length || note(p));
      problems.innerHTML = rows.map((p) => `<article><b>${safe(p.id || '')}</b><span><b>${safe(projectName(p))}</b><br><small class="muted">${safe(missing(p).join(', ') || note(p))}</small></span>${badge('решить','red')}</article>`).join('') || '<div class="empty">Проблемных проектов нет</div>';
    }
    const docsList = byId('docReadinessList');
    if (docsList) docsList.innerHTML = projects.map((p) => { const pack = docReady(p); const percent = Math.round(pack.ready / pack.total * 100); return `<article><b>${pack.ready}/${pack.total}</b><span><b>${safe(projectName(p))}</b><br><div class="tp-docbar"><i style="width:${percent}%"></i></div><small class="muted">Комплект документов: ${percent}%</small></span>${badge(percent + '%', percent >= 80 ? '' : 'yellow')}</article>`; }).join('') || '<div class="empty">Нет данных по документам</div>';
    const matrix = byId('matrixList');
    if (matrix) matrix.innerHTML = projects.slice().sort((a,b) => expertScore(b) - expertScore(a)).map((p) => `<article class="tp-matrix-card"><div class="tp-score">${expertScore(p)}</div><div><b>${safe(projectName(p))}</b><br><span class="tp-small">${safe(direction(p))} · ${safe(owner(p) || 'ответственный не назначен')}</span><br><span class="tp-small">${safe(funding(p) || 'маршрут не выбран')}</span></div><div>${badge(expertLevel(p), expertScore(p) >= 80 ? '' : 'yellow')}<br><small class="tp-small">${safe(recommendedDecision(p))}</small></div></article>`).join('') || '<div class="empty">Нет данных для матрицы</div>';
    const qaCards = byId('qaCards');
    if (qaCards) {
      const avg = projects.length ? Math.round(projects.reduce((s,p) => s + qualityScore(p), 0) / projects.length) : 0;
      const noOwner = projects.filter((p) => !owner(p)).length;
      const noDeadline = projects.filter((p) => !deadline(p)).length;
      const noFunding = projects.filter((p) => !funding(p)).length;
      qaCards.innerHTML = `<article class="tp-qa-card"><span class="muted">Качество реестра</span><strong>${avg}%</strong><small>цель - от 85%</small></article><article class="tp-qa-card"><span class="muted">Без ответственного</span><strong>${noOwner}</strong><small>нужны назначения</small></article><article class="tp-qa-card"><span class="muted">Без срока</span><strong>${noDeadline}</strong><small>нужен календарь</small></article><article class="tp-qa-card"><span class="muted">Без гранта</span><strong>${noFunding}</strong><small>нужен маршрут</small></article>`;
    }
    const qaList = byId('qaList');
    if (qaList) qaList.innerHTML = projects.filter((p) => missing(p).length).map((p) => `<article><b>${qualityScore(p)}%</b><span><b>${safe(projectName(p))}</b><br><small class="muted">Не хватает: ${safe(missing(p).join(', '))}</small></span>${badge('доработать','yellow')}</article>`).join('') || '<div class="empty">Качество данных хорошее</div>';
    const nts = byId('ntsText');
    if (nts) nts.value = buildNts();
    const report = byId('reportText');
    if (report) report.value = buildReport();
  };
  const openDetail = (p) => {
    let modal = byId('projectDetail');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `<dialog id="projectDetail"><div class="form"><div class="top"><div><h2 id="detailTitle">Карточка проекта</h2><p class="muted" id="detailSub"></p></div><button class="btn" id="detailClose" type="button">Закрыть</button></div><div class="detail-grid" id="detailGrid"></div></div></dialog>`);
      modal = byId('projectDetail');
      byId('detailClose').onclick = () => modal.close();
    }
    const pack = docReady(p);
    byId('detailTitle').textContent = projectName(p) || 'Проект';
    byId('detailSub').textContent = `${direction(p) || 'Без направления'} · ${owner(p) || 'ответственный не назначен'}`;
    byId('detailGrid').innerHTML = `<article><small>Экспертная категория</small>${safe(expertLevel(p))}</article><article><small>Балл</small>${expertScore(p)}</article><article><small>Качество данных</small>${qualityScore(p)}%</article><article><small>УТГ</small>${safe(trl(p) || '?')}</article><article><small>Статус</small>${safe(status(p) || 'Не указан')}</article><article><small>Срок</small>${safe(deadline(p) || 'Без срока')}</article><article><small>Маршрут</small>${safe(funding(p) || 'Не выбран')}</article><article><small>Решение</small>${safe(recommendedDecision(p))}</article><article style="grid-column:1/-1"><small>Комплект документов</small><div class="doc-status">${docItems.map((item, i) => `<div class="${i < pack.ready ? 'ok' : ''}"><b>${i < pack.ready ? '✓' : '-'}</b>${item}</div>`).join('')}</div></article>`;
    modal.showModal();
  };
  const bindCards = () => {
    all('.project').forEach((card) => {
      if (card.dataset.tpBound) return;
      card.dataset.tpBound = '1';
      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        const title = card.querySelector('h3')?.textContent || '';
        const project = getProjects().find((p) => projectName(p) === title);
        if (project) openDetail(project);
      });
    });
  };
  const bind = () => {
    document.addEventListener('click', (event) => {
      const nav = event.target.closest('.nav button[data-view]');
      if (nav) setTimeout(renderExtra, 60);
    });
    const present = byId('presentMode');
    if (present) present.onclick = () => { document.body.classList.toggle('present-mode'); present.textContent = document.body.classList.contains('present-mode') ? 'Обычный режим' : 'Режим презентации'; };
    const quickReport = byId('quickReport');
    if (quickReport) quickReport.onclick = () => { document.querySelector('.nav [data-view="report"]')?.click(); renderExtra(); };
    const quickNts = byId('quickNts');
    if (quickNts) quickNts.onclick = () => { document.querySelector('.nav [data-view="nts"]')?.click(); renderExtra(); };
    const copyNts = byId('copyNts');
    if (copyNts) copyNts.onclick = async () => navigator.clipboard.writeText(buildNts());
    const printNts = byId('printNts');
    if (printNts) printNts.onclick = () => { document.querySelector('.nav [data-view="nts"]')?.click(); setTimeout(() => window.print(), 100); };
    const copyReport = byId('copyReport');
    if (copyReport) copyReport.onclick = async () => navigator.clipboard.writeText(buildReport());
    const copyQa = byId('copyQa');
    if (copyQa) copyQa.onclick = async () => navigator.clipboard.writeText('Аудит качества данных\n\n' + getProjects().filter((p) => missing(p).length).map((p) => `${projectName(p)} - не хватает: ${missing(p).join(', ')}`).join('\n'));
    const download = byId('downloadReport');
    if (download) download.onclick = () => { const blob = new Blob([buildReport()], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Отчет для проректора - Технопарк РГСУ.txt'; link.click(); URL.revokeObjectURL(link.href); };
    const print = byId('printReport');
    if (print) print.onclick = () => { document.querySelector('.nav [data-view="report"]')?.click(); setTimeout(() => window.print(), 100); };
  };
  const patchRender = () => {
    const original = window.render;
    if (typeof original !== 'function' || original.tpPatched) return;
    const patched = function () {
      original.apply(this, arguments);
      renderExtra();
      setTimeout(bindCards, 30);
    };
    patched.tpPatched = true;
    window.render = patched;
  };
  const boot = () => {
    style();
    addNav();
    addViews();
    addTopButtons();
    bind();
    patchRender();
    renderExtra();
    setTimeout(bindCards, 400);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
