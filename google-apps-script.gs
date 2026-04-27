const CONFIG = {
  SHEET_ID: '1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60',
  CONFIRM_CODE: '11111111',
  HEADER_ROW: 4,
  SHEETS: {
    projects: 'Реестр проектов',
    grants: 'Актуальные гранты',
    packages: 'Пакет подачи',
    actions: 'Журнал действий'
  }
};

function doGet(e) {
  const action = getParam_(e, 'action') || 'health';
  try {
    if (action === 'health') return json_({ ok: true, service: 'Technopark RGSU Project Registry', time: new Date().toISOString() });
    if (action === 'bootstrap') return json_(getBootstrap_());
    if (action === 'projects') return json_({ ok: true, projects: getProjects_() });
    if (action === 'grants') return json_({ ok: true, grants: getGrants_() });
    if (action === 'packages') return json_({ ok: true, packages: getPackages_() });
    return json_({ ok: false, error: 'Unknown action: ' + action });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (String(payload.confirmCode || '') !== CONFIG.CONFIRM_CODE) {
      return json_({ ok: false, error: 'Неверный код подтверждения' });
    }
    const action = payload.action || '';
    if (action === 'add_project') return json_(addProject_(payload));
    if (action === 'update_project') return json_(updateProject_(payload));
    if (action === 'add_package_row') return json_(addPackageRow_(payload));
    return json_({ ok: false, error: 'Unknown action: ' + action });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let actions = ss.getSheetByName(CONFIG.SHEETS.actions);
  if (!actions) actions = ss.insertSheet(CONFIG.SHEETS.actions);
  if (actions.getLastRow() === 0) {
    actions.appendRow(['Дата', 'Действие', 'ID', 'Проект', 'Статус', 'Следующее действие', 'Пользователь']);
    actions.setFrozenRows(1);
  }
  return 'Готово';
}

function getBootstrap_() {
  const projects = getProjects_();
  const grants = getGrants_();
  const packages = getPackages_();
  return {
    ok: true,
    projects,
    grants,
    packages,
    summary: {
      total: projects.length,
      high: projects.filter(p => p.priority === 'Высокий').length,
      ready: projects.filter(p => String(p.status || '').toLowerCase().indexOf('упаков') >= 0).length,
      grants: grants.length
    }
  };
}

function getProjects_() {
  const rows = readTable_(CONFIG.SHEETS.projects, CONFIG.HEADER_ROW);
  return rows.filter(row => row['ID'] || row['Проект']).map(row => ({
    id: row['ID'] || '',
    project: row['Проект'] || '',
    direction: row['Направление'] || '',
    contour: row['Контур'] || '',
    priority: row['Приоритет'] || '',
    trl: row['УТГ'] || '',
    stage: row['Стадия'] || '',
    owner: row['Ответственный'] || '',
    funding: row['Маршрут финансирования'] || '',
    window: row['Ближайшее окно'] || '',
    limit: row['Лимит / ориентир'] || '',
    nextAction: row['Следующее действие'] || '',
    deadline: toIso_(row['Срок'] || ''),
    readiness: row['Готовность пакета'] || '',
    status: row['Статус'] || '',
    note: row['Блокер / примечание'] || ''
  }));
}

function getGrants_() {
  const rows = readTable_(CONFIG.SHEETS.grants, CONFIG.HEADER_ROW);
  return rows.filter(row => row['Маршрут']).map(row => ({
    route: row['Маршрут'] || '',
    operator: row['Оператор'] || '',
    purpose: row['Для чего подходит'] || '',
    applicant: row['Кто подает'] || '',
    funding: row['Финансирование'] || '',
    window: row['Окно / статус на 27.04.2026'] || row['Окно / статус'] || '',
    projects: row['Проекты из реестра'] || '',
    firstStep: row['Что подготовить первым'] || '',
    source: row['Источник'] || '',
    checked: row['Дата проверки'] || ''
  }));
}

function getPackages_() {
  const rows = readTable_(CONFIG.SHEETS.packages, CONFIG.HEADER_ROW);
  return rows.filter(row => row['ID'] || row['Проект']).map(row => ({
    id: row['ID'] || '',
    project: row['Проект'] || '',
    route: row['Маршрут'] || '',
    owner: row['Ответственный'] || '',
    passport: row['Паспорт'] || '',
    problem: row['Проблема и эффект'] || '',
    mvp: row['MVP / прототип'] || '',
    pilot: row['Пилот / письма'] || '',
    estimate: row['Смета'] || '',
    presentation: row['Презентация'] || '',
    legal: row['Юрконтур'] || '',
    readiness: row['Готовность'] || '',
    deadline: toIso_(row['Срок'] || ''),
    nextAction: row['Следующий шаг'] || ''
  }));
}

function addProject_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.projects);
    if (!sheet) throw new Error('Не найден лист: ' + CONFIG.SHEETS.projects);
    const row = nextProjectRow_(sheet);
    const id = payload.id || makeId_();
    setProjectCells_(sheet, row, {
      'ID': id,
      'Проект': payload.project || payload.name || '',
      'Направление': payload.direction || '',
      'Контур': payload.contour || 'Основной',
      'Приоритет': payload.priority || 'Средний',
      'УТГ': payload.trl || '',
      'Стадия': payload.stage || 'Новый',
      'Ответственный': payload.owner || '',
      'Маршрут финансирования': payload.funding || payload.grant || '',
      'Ближайшее окно': payload.window || '',
      'Лимит / ориентир': payload.limit || payload.budget || '',
      'Следующее действие': payload.nextAction || '',
      'Срок': payload.deadline ? new Date(payload.deadline) : '',
      'Готовность пакета': payload.readiness || '0%',
      'Статус': payload.status || 'Новый',
      'Блокер / примечание': payload.note || ''
    });
    logAction_('Добавлен проект', id, payload.project || payload.name || '', payload.status || 'Новый', payload.nextAction || '');
    return { ok: true, id };
  } finally {
    lock.releaseLock();
  }
}

function updateProject_(payload) {
  if (!payload.id) throw new Error('Не указан ID проекта');
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.projects);
  if (!sheet) throw new Error('Не найден лист: ' + CONFIG.SHEETS.projects);
  const headers = getHeaders_(sheet, CONFIG.HEADER_ROW);
  const idCol = headers.indexOf('ID') + 1;
  if (!idCol) throw new Error('Не найдена колонка ID');
  const values = sheet.getRange(CONFIG.HEADER_ROW + 1, idCol, Math.max(sheet.getLastRow() - CONFIG.HEADER_ROW, 1), 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(payload.id)) {
      targetRow = CONFIG.HEADER_ROW + 1 + i;
      break;
    }
  }
  if (targetRow < 0) throw new Error('Проект не найден: ' + payload.id);
  const patch = {};
  if (payload.status !== undefined) patch['Статус'] = payload.status;
  if (payload.nextAction !== undefined) patch['Следующее действие'] = payload.nextAction;
  if (payload.deadline !== undefined) patch['Срок'] = payload.deadline ? new Date(payload.deadline) : '';
  if (payload.readiness !== undefined) patch['Готовность пакета'] = payload.readiness;
  if (payload.note !== undefined) patch['Блокер / примечание'] = payload.note;
  setProjectCells_(sheet, targetRow, patch);
  logAction_('Обновлен проект', payload.id, payload.project || '', payload.status || '', payload.nextAction || '');
  return { ok: true, id: payload.id };
}

function addPackageRow_(payload) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.packages);
  if (!sheet) throw new Error('Не найден лист: ' + CONFIG.SHEETS.packages);
  sheet.appendRow([
    payload.id || '',
    payload.project || '',
    payload.route || '',
    payload.owner || '',
    payload.passport || 'Нет',
    payload.problem || 'Нет',
    payload.mvp || 'Нет',
    payload.pilot || 'Нет',
    payload.estimate || 'Нет',
    payload.presentation || 'Нет',
    payload.legal || 'Нет',
    payload.readiness || '0%',
    payload.deadline ? new Date(payload.deadline) : '',
    payload.nextAction || ''
  ]);
  return { ok: true };
}

function nextProjectRow_(sheet) {
  const last = sheet.getLastRow();
  return Math.max(last + 1, CONFIG.HEADER_ROW + 1);
}

function setProjectCells_(sheet, row, data) {
  const headers = getHeaders_(sheet, CONFIG.HEADER_ROW);
  Object.keys(data).forEach(key => {
    const col = headers.indexOf(key) + 1;
    if (col > 0) sheet.getRange(row, col).setValue(data[key]);
  });
}

function readTable_(sheetName, headerRow) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= headerRow) return [];
  const headers = getHeaders_(sheet, headerRow);
  const values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  return values
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header) obj[header] = normalizeCell_(row[index]);
      });
      return obj;
    });
}

function getHeaders_(sheet, headerRow) {
  return sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function normalizeCell_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return value === null || value === undefined ? '' : String(value);
}

function toIso_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  return raw;
}

function makeId_() {
  return 'ТП-2026-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HHmmss');
}

function logAction_(action, id, project, status, nextAction) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEETS.actions);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.actions);
    sheet.appendRow(['Дата', 'Действие', 'ID', 'Проект', 'Статус', 'Следующее действие', 'Пользователь']);
  }
  sheet.appendRow([new Date(), action, id, project, status, nextAction, Session.getActiveUser().getEmail() || 'web']);
}

function getParam_(e, name) {
  return e && e.parameter && e.parameter[name] ? e.parameter[name] : '';
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
