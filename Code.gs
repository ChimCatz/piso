/**
 * Piso - Apps Script backend
 * Bound to your Google Sheet (Extensions > Apps Script).
 * Deploy as Web app: Execute as "Me", access "Anyone".
 */

// The secret token lives in Script Properties (key TOKEN), never in this file,
// so the repo can stay public. setupSheets() creates one if it's missing.
const SHEET_NAME = 'Transactions';
const HEADERS = ['Date', 'Time', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Raw text', 'ID'];
const ID_COL = 9;

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

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else if (sh.getRange(1, ID_COL).getValue() !== 'ID') {
    sh.getRange(1, ID_COL).setValue('ID').setFontWeight('bold'); // sheets made before IDs existed
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

// Row numbers whose ID column equals id (a transfer has two)
function findRows_(sh, id) {
  const last = sh.getLastRow();
  if (!id || last < 2) return [];
  const rows = [];
  sh.getRange(2, ID_COL, last - 1, 1).getValues().forEach(function (r, i) {
    if (String(r[0]) === String(id)) rows.push(i + 2);
  });
  return rows;
}

// The PWA sends text/plain POSTs to avoid CORS preflight.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const token = getToken_();
    if (!token || body.token !== token) return json_({ ok: false, error: 'unauthorized' });

    // one write at a time, so two quick saves can't collide
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = getSheet_();
      if (body.action === 'add') return json_(add_(sh, body.tx || {}));
      if (body.action === 'undo') return json_(undo_(sh, body.id));
      return json_({ ok: false, error: 'unknown action' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function add_(sh, t) {
  const amount = Number(t.amount);
  if (!(amount > 0)) return { ok: false, error: 'bad amount' };
  const account = String(t.account || '').trim();
  if (!account) return { ok: false, error: 'missing account' };
  if (t.type !== 'Income' && t.type !== 'Expense' && t.type !== 'Transfer') return { ok: false, error: 'bad type' };

  // The phone retries queued entries; if this one already landed, don't add it twice.
  const id = String(t.id || '');
  if (id && findRows_(sh, id).length) return { ok: true, duplicate: true };

  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const date = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, tz, 'HH:mm:ss');
  function row(type, acc, category, note) {
    // leading ' keeps the ID as text, so Sheets never turns it into a number or date
    return [date, time, type, amount, text_(acc), text_(category), text_(note), text_(t.raw), id ? "'" + id : ''];
  }

  if (t.type === 'Transfer') {
    // money moving between your accounts: out of one, into the other, total unchanged
    const to = String(t.toAccount || '').trim();
    if (!to || to === account) return { ok: false, error: 'bad transfer accounts' };
    const note = t.note || ('Transfer ' + account + ' to ' + to);
    sh.appendRow(row('Expense', account, 'Transfer', note));
    sh.appendRow(row('Income', to, 'Transfer', note));
    return { ok: true };
  }

  sh.appendRow(row(t.type, account, t.category, t.note));
  return { ok: true };
}

// With an id: remove that entry (both rows of a transfer). Without: the last row.
function undo_(sh, id) {
  let rows;
  if (id) {
    rows = findRows_(sh, id);
    if (!rows.length) return { ok: false, error: 'entry not found in sheet' };
  } else {
    const last = sh.getLastRow();
    if (last <= 1) return { ok: false, error: 'nothing to undo' };
    rows = [last];
  }
  const undone = rows.map(function (r) { return sh.getRange(r, 1, 1, HEADERS.length).getValues()[0]; });
  rows.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  return { ok: true, undone: undone };
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

  // Transfers move money between accounts, so the Summary leaves them out.
  let sum = ss.getSheetByName('Summary');
  if (!sum) sum = ss.insertSheet('Summary');
  sum.clear();
  sum.getRange('A1').setValue('Expenses by category (this month)').setFontWeight('bold');
  sum.getRange('A2').setFormula(SUMMARY_QUERY_);
  sum.getRange('D1').setValue('Month totals').setFontWeight('bold');
  sum.getRange('D2:D3').setValues([['Income'], ['Expense']]);
  sum.getRange('E2:E3').setFormulas([[monthTotal_('Income')], [monthTotal_('Expense')]]);
  sum.getRange('E2:E3').setNumberFormat('#,##0.00');

  // Copy this from View > Logs (Execution log) into the app's Settings.
  Logger.log('Your Piso token: ' + ensureToken_());
}

const SUMMARY_QUERY_ =
  '=IFERROR(QUERY(Transactions!A:G,' +
  '"select F, sum(D) where C = \'Expense\' and F <> \'Transfer\' and A >= date \'"&TEXT(EOMONTH(TODAY(),-1)+1,"yyyy-mm-dd")&"\' ' +
  'group by F label sum(D) \'Total\'",1),"No data yet")';

function monthTotal_(type) {
  return '=SUMIFS(Transactions!D:D,Transactions!C:C,"' + type + '",Transactions!F:F,"<>Transfer",' +
    'Transactions!A:A,">="&(EOMONTH(TODAY(),-1)+1))';
}
