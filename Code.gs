/**
 * Piso - Apps Script backend
 * Bound to your Google Sheet (Extensions > Apps Script).
 * Deploy as Web app: Execute as "Me", access "Anyone".
 */

// The secret token lives in Script Properties (key TOKEN), never in this file,
// so the repo can stay public. setupSheets() creates one if it's missing.
const SHEET_NAME = 'Transactions';

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN');
}

function ensureToken_() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('TOKEN', token);
  }
  return token;
}
const HEADERS = ['Date', 'Time', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Raw text'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Text starting with = + - @ would be parsed as a formula ("+ 500 into gcash" -> #ERROR!).
function text_(v) {
  const s = String(v || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// The PWA sends text/plain POSTs to avoid CORS preflight.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const token = getToken_();
    if (!token || body.token !== token) return json_({ ok: false, error: 'unauthorized' });

    const sh = getSheet_();

    if (body.action === 'undo') {
      const last = sh.getLastRow();
      if (last <= 1) return json_({ ok: false, error: 'nothing to undo' });
      const row = sh.getRange(last, 1, 1, HEADERS.length).getValues()[0];
      sh.deleteRow(last);
      return json_({ ok: true, undone: row });
    }

    if (body.action === 'add') {
      const t = body.tx;
      const amount = Number(t.amount);
      if (!(amount > 0)) return json_({ ok: false, error: 'bad amount' });
      if (t.type !== 'Income' && t.type !== 'Expense') return json_({ ok: false, error: 'bad type' });

      const now = new Date();
      const tz = Session.getScriptTimeZone();
      sh.appendRow([
        Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
        Utilities.formatDate(now, tz, 'HH:mm:ss'),
        t.type,
        amount,
        text_(t.account),
        text_(t.category),
        text_(t.note),
        text_(t.raw)
      ]);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Quick browser check: open the web app URL, should say "Piso is alive".
function doGet() {
  return ContentService.createTextOutput('Piso is alive');
}

/**
 * Run once from the editor to create the Accounts + Summary tabs.
 * Edit the ACCOUNTS list to match yours.
 */
function setupSheets() {
  const ACCOUNTS = ['BDO', 'GCash', 'Maya', 'Cash'];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getSheet_();

  let acc = ss.getSheetByName('Accounts');
  if (!acc) acc = ss.insertSheet('Accounts');
  acc.clear();
  acc.appendRow(['Account', 'Income', 'Expense', 'Balance']);
  ACCOUNTS.forEach(function (name, i) {
    const r = i + 2;
    acc.appendRow([
      name,
      '=SUMIFS(Transactions!D:D,Transactions!E:E,A' + r + ',Transactions!C:C,"Income")',
      '=SUMIFS(Transactions!D:D,Transactions!E:E,A' + r + ',Transactions!C:C,"Expense")',
      '=B' + r + '-C' + r
    ]);
  });
  const total = ACCOUNTS.length + 2;
  acc.getRange(total, 1, 1, 4).setValues([[
    'TOTAL',
    '=SUM(B2:B' + (total - 1) + ')',
    '=SUM(C2:C' + (total - 1) + ')',
    '=SUM(D2:D' + (total - 1) + ')'
  ]]);
  acc.getRange(1, 1, 1, 4).setFontWeight('bold');
  acc.getRange(total, 1, 1, 4).setFontWeight('bold');
  acc.getRange(2, 2, total - 1, 3).setNumberFormat('#,##0.00');

  let sum = ss.getSheetByName('Summary');
  if (!sum) sum = ss.insertSheet('Summary');
  sum.clear();
  sum.getRange('A1').setValue('Expenses by category (this month)').setFontWeight('bold');
  sum.getRange('A2').setFormula(
    '=IFERROR(QUERY(Transactions!A:G,' +
    '"select F, sum(D) where C = \'Expense\' and A >= date \'"&TEXT(EOMONTH(TODAY(),-1)+1,"yyyy-mm-dd")&"\' ' +
    'group by F label sum(D) \'Total\'",1),"No data yet")'
  );
  sum.getRange('D1').setValue('Month totals').setFontWeight('bold');
  sum.getRange('D2:D3').setValues([['Income'], ['Expense']]);
  sum.getRange('E2:E3').setFormulas([
    ['=SUMIFS(Transactions!D:D,Transactions!C:C,"Income",Transactions!A:A,">="&(EOMONTH(TODAY(),-1)+1))'],
    ['=SUMIFS(Transactions!D:D,Transactions!C:C,"Expense",Transactions!A:A,">="&(EOMONTH(TODAY(),-1)+1))']
  ]);
  sum.getRange('E2:E3').setNumberFormat('#,##0.00');

  // Copy this from View > Logs (Execution log) into the app's Settings.
  Logger.log('Your Piso token: ' + ensureToken_());
}
