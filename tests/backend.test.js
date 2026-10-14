// Backend tests: run Code.gs against a fake in-memory Google Sheet.
// Nothing here touches your real sheet. For that, see scripts/smoke.mjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');

/* ---------- A tiny fake of the Apps Script services Code.gs uses ---------- */
// What typing a value into a cell does: ' forces text, = is a formula, + - @ break.
function enter(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (v.startsWith('=')) return { formula: v };
  if (/^[+\-@]/.test(v)) return '#ERROR!';
  return v;
}

function a1(ref) {
  const [start, end] = ref.split(':').map((r) => {
    const m = /^([A-Z]+)(\d+)$/.exec(r);
    const col = [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    return { row: Number(m[2]), col };
  });
  const e = end || start;
  return [start.row, start.col, e.row - start.row + 1, e.col - start.col + 1];
}

class FakeRange {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
  each(fn) { for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) fn(r, c); }
  getValues() {
    const out = Array.from({ length: this.rows }, () => []);
    this.each((r, c) => { out[r][c] = this.sheet.read(this.row + r, this.col + c); });
    return out;
  }
  getValue() { return this.sheet.read(this.row, this.col); }
  setValues(v) { this.each((r, c) => this.sheet.write(this.row + r, this.col + c, v[r][c])); return this; }
  setValue(v) { this.sheet.write(this.row, this.col, v); return this; }
  setFormulas(v) { this.each((r, c) => this.sheet.write(this.row + r, this.col + c, { formula: v[r][c] })); return this; }
  setFormula(f) { this.sheet.write(this.row, this.col, { formula: f }); return this; }
  setFontWeight() { return this; }
  setNumberFormat() { return this; }
}

class FakeSheet {
  constructor(rows) { this.cells = (rows || []).map((r) => r.slice()); }
  getLastRow() {
    let n = this.cells.length;
    while (n > 0 && (this.cells[n - 1] || []).every((v) => v === '' || v == null)) n--;
    return n;
  }
  write(r, c, v) { (this.cells[r - 1] = this.cells[r - 1] || [])[c - 1] = v && v.formula ? v : enter(v); }
  read(r, c) { const v = (this.cells[r - 1] || [])[c - 1]; return v == null ? '' : v; }
  appendRow(values) { const r = this.getLastRow() + 1; values.forEach((v, i) => this.write(r, i + 1, v)); }
  getRange(a, b, c, d) {
    const [row, col, rows, cols] = typeof a === 'string' ? a1(a) : [a, b, c || 1, d || 1];
    return new FakeRange(this, row, col, rows, cols);
  }
  deleteRow(r) { this.cells.splice(r - 1, 1); }
  setFrozenRows() {}
  clear() { this.cells = []; }
  rows() { return this.cells.slice(0, this.getLastRow()).map((r) => r.slice()); }
}

function setup(opts = {}) {
  const sheets = {};
  if (opts.transactions) sheets.Transactions = new FakeSheet(opts.transactions);
  const props = { ...('token' in opts ? (opts.token ? { TOKEN: opts.token } : {}) : { TOKEN: 'secret' }) };
  const logs = [];
  const lock = { held: 0, waitLock() { this.held++; }, releaseLock() { this.held--; } };
  const ctx = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = new FakeSheet())
      })
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => lock },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s })
    },
    Utilities: {
      formatDate: (d, tz, fmt) => (fmt === 'yyyy-MM-dd' ? '2026-10-14' : '12:00:00'),
      getUuid: () => crypto.randomUUID()
    },
    Session: { getScriptTimeZone: () => 'Asia/Manila' },
    Logger: { log: (m) => logs.push(m) }
  });
  vm.runInContext(CODE, ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 'secret', ...body }) } }).getContent());
  return { ctx, sheets, props, logs, lock, post, tx: () => sheets.Transactions.rows() };
}

const expense = (extra) => ({ type: 'Expense', amount: 29, account: 'Cash', category: 'Food', note: 'Coffee', raw: 'minus 29 for coffee', ...extra });

/* ---------- Tests ---------- */
test('GET says Piso is alive', () => {
  assert.equal(setup().ctx.doGet().getContent(), 'Piso is alive');
});

test('wrong token is rejected and nothing is written', () => {
  const s = setup();
  assert.deepEqual(s.post({ token: 'nope', action: 'add', tx: expense() }), { ok: false, error: 'unauthorized' });
  assert.equal(s.sheets.Transactions, undefined);
});

test('everything is rejected until a token has been set up', () => {
  const s = setup({ token: null });
  assert.equal(s.post({ token: null, action: 'undo' }).error, 'unauthorized');
  assert.equal(s.post({ token: '', action: 'undo' }).error, 'unauthorized');
});

test('add writes one row with its ID', () => {
  const s = setup();
  assert.deepEqual(s.post({ action: 'add', tx: expense({ id: 'p1' }) }), { ok: true });
  assert.deepEqual(s.tx(), [
    ['Date', 'Time', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Raw text', 'ID'],
    ['2026-10-14', '12:00:00', 'Expense', 29, 'Cash', 'Food', 'Coffee', 'minus 29 for coffee', 'p1']
  ]);
});

test('an older sheet without the ID column gets one', () => {
  const s = setup({ transactions: [['Date', 'Time', 'Type', 'Amount', 'Account', 'Category', 'Note', 'Raw text']] });
  s.post({ action: 'add', tx: expense({ id: 'p1' }) });
  assert.equal(s.tx()[0][8], 'ID');
  assert.equal(s.tx()[1][8], 'p1');
});

test('text that looks like a formula is stored as text', () => {
  const s = setup();
  s.post({ action: 'add', tx: { type: 'Income', amount: 500, account: 'GCash', category: 'Other Income', note: '=1+1', raw: '+ 500 into gcash', id: 'p1' } });
  const row = s.tx()[1];
  assert.equal(row[6], '=1+1');
  assert.equal(row[7], '+ 500 into gcash');
});

test('an ID that looks like a number stays text', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: '1728912345678-1234' }) });
  assert.equal(s.tx()[1][8], '1728912345678-1234');
});

test('resending the same entry does not duplicate it', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: 'p1' }) });
  assert.deepEqual(s.post({ action: 'add', tx: expense({ id: 'p1' }) }), { ok: true, duplicate: true });
  assert.equal(s.tx().length, 2);
});

test('a transfer writes two linked rows', () => {
  const s = setup();
  s.post({ action: 'add', tx: { type: 'Transfer', amount: 1000, account: 'BDO', toAccount: 'GCash', category: 'Transfer', note: '', raw: 'transfer 1000 from bdo to gcash', id: 't1' } });
  const [, out, inn] = s.tx();
  assert.deepEqual(out.slice(2), ['Expense', 1000, 'BDO', 'Transfer', 'Transfer BDO to GCash', 'transfer 1000 from bdo to gcash', 't1']);
  assert.deepEqual(inn.slice(2), ['Income', 1000, 'GCash', 'Transfer', 'Transfer BDO to GCash', 'transfer 1000 from bdo to gcash', 't1']);
});

test('a transfer needs two different accounts', () => {
  const s = setup();
  const t = { type: 'Transfer', amount: 100, account: 'BDO', category: 'Transfer', id: 't1' };
  assert.equal(s.post({ action: 'add', tx: { ...t, toAccount: 'BDO' } }).error, 'bad transfer accounts');
  assert.equal(s.post({ action: 'add', tx: t }).error, 'bad transfer accounts');
});

test('undo by ID removes exactly that entry, both rows of a transfer', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: 'a', note: 'A' }) });
  s.post({ action: 'add', tx: { type: 'Transfer', amount: 1000, account: 'BDO', toAccount: 'GCash', id: 'b' } });
  s.post({ action: 'add', tx: expense({ id: 'c', note: 'C' }) });
  const res = s.post({ action: 'undo', id: 'b' });
  assert.equal(res.ok, true);
  assert.equal(res.undone.length, 2);
  assert.deepEqual(s.tx().slice(1).map((r) => r[8]), ['a', 'c']);
});

test('undo of an ID the sheet does not have changes nothing', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: 'a' }) });
  assert.equal(s.post({ action: 'undo', id: 'zzz' }).error, 'entry not found in sheet');
  assert.equal(s.tx().length, 2);
});

test('undo without an ID removes the last row; an empty sheet has nothing to undo', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: 'a' }) });
  s.post({ action: 'add', tx: expense({ id: 'b' }) });
  assert.equal(s.post({ action: 'undo' }).ok, true);
  assert.deepEqual(s.tx().slice(1).map((r) => r[8]), ['a']);
  s.post({ action: 'undo' });
  assert.equal(s.post({ action: 'undo' }).error, 'nothing to undo');
});

test('bad input is refused', () => {
  const s = setup();
  assert.equal(s.post({ action: 'add', tx: expense({ amount: 0 }) }).error, 'bad amount');
  assert.equal(s.post({ action: 'add', tx: expense({ amount: 'abc' }) }).error, 'bad amount');
  assert.equal(s.post({ action: 'add', tx: expense({ type: 'Gift' }) }).error, 'bad type');
  assert.equal(s.post({ action: 'add', tx: expense({ account: ' ' }) }).error, 'missing account');
  assert.equal(s.post({ action: 'add' }).error, 'bad amount');
  assert.equal(s.post({ action: 'explode' }).error, 'unknown action');
  assert.equal(s.tx().length, 1); // header only
});

test('broken JSON is reported, not thrown', () => {
  const s = setup();
  const res = JSON.parse(s.ctx.doPost({ postData: { contents: '{nope' } }).getContent());
  assert.equal(res.ok, false);
});

test('the lock is always released', () => {
  const s = setup();
  s.post({ action: 'add', tx: expense({ id: 'a' }) });
  s.post({ action: 'explode' });
  s.post({ action: 'add', tx: expense({ amount: -1 }) });
  assert.equal(s.lock.held, 0);
});

test('setupSheets builds the tabs, keeps labels as text and makes a token', () => {
  const s = setup({ token: null });
  s.ctx.setupSheets();
  const acc = s.sheets.Accounts.rows();
  assert.deepEqual(acc.map((r) => r[0]), ['Account', 'BDO', 'GCash', 'Maya', 'Cash', 'TOTAL']);
  const sum = s.sheets.Summary;
  assert.equal(sum.read(2, 4), 'Income');    // was a formula (#NAME?) before
  assert.equal(sum.read(3, 4), 'Expense');
  assert.match(sum.read(2, 5).formula, /"<>Transfer"/);
  assert.match(sum.read(2, 1).formula, /F <> 'Transfer'/);
  assert.match(s.props.TOKEN, /^[0-9a-f]{64}$/);
  assert.ok(s.logs.some((l) => l.includes(s.props.TOKEN)));
});
