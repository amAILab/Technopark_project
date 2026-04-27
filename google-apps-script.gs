const SHEET_ID = "1cNN4cPE1F1dlewJCelJPGUR5EkYUmQyJGb_BOKN4n60";
const SHEET_GID = 969711980;
const CONFIRM_CODE = "11111111";
const HEADERS = [
  "Название",
  "Ответственный",
  "Статус",
  "Готовность",
  "Грант",
  "Дедлайн",
  "Бюджет",
  "Следующее действие",
  "Создано",
];

function doPost(event) {
  const payload = JSON.parse((event.postData && event.postData.contents) || "{}");

  if (payload.confirmCode !== CONFIRM_CODE) {
    return jsonResponse({ ok: false, error: "bad_confirm_code" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getTargetSheet();
    ensureHeadersIfEmpty(sheet);
    sheet.appendRow([
      payload.name || "",
      payload.owner || "",
      payload.status || "",
      payload.readiness || "",
      payload.grant || "",
      payload.deadline || "",
      payload.budget || "",
      payload.nextStep || "",
      new Date(),
    ]);

    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function getTargetSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  return spreadsheet.getSheets().find((sheet) => sheet.getSheetId() === SHEET_GID) || spreadsheet.getSheets()[0];
}

function ensureHeadersIfEmpty(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (firstRow.some(Boolean)) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
