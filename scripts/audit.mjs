// How well does the parser understand what you actually say?
// Re-parses the "Raw text" of every saved entry and compares it with what you saved
// (i.e. after any fixes you made on the confirm card).
//
//   1. In the sheet: open the Transactions tab -> File -> Download -> CSV
//   2. npm run audit -- "path/to/Piso - Transactions.csv"
//
// Every mismatch is a phrase worth adding to tests/parser.test.js.
import fs from 'node:fs';
import P from '../parser.js';

const file = process.argv[2];
if (!file) { console.error('Usage: npm run audit -- <Transactions.csv>'); process.exit(2); }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [header, ...data] = parseCsv(fs.readFileSync(file, 'utf8'));
const col = (name) => header.indexOf(name);
const C = { type: col('Type'), amount: col('Amount'), account: col('Account'), category: col('Category'), raw: col('Raw text'), id: col('ID') };
const accounts = [...new Set(data.map((r) => r[C.account]).filter(Boolean))];

// A transfer is two rows sharing an ID: rebuild it as one entry
const entries = [];
const seen = new Map();
for (const r of data) {
  if (!r[C.raw]) continue;
  const e = { type: r[C.type], amount: Number(String(r[C.amount]).replace(/,/g, '')), account: r[C.account], category: r[C.category], raw: r[C.raw] };
  if (e.category === 'Transfer' && r[C.id]) {
    const t = seen.get(r[C.id]);
    if (t) { if (e.type === 'Income') t.toAccount = e.account; else t.account = e.account; continue; }
    const entry = { ...e, type: 'Transfer', [e.type === 'Income' ? 'toAccount' : 'account']: e.account };
    seen.set(r[C.id], entry); entries.push(entry);
    continue;
  }
  entries.push(e);
}

const fields = ['type', 'amount', 'account', 'toAccount', 'category'];
let perfect = 0;
const misses = [];
for (const e of entries) {
  const p = P.parse(e.raw, { accounts });
  const wrong = fields.filter((f) => e[f] !== undefined && String(p[f]) !== String(e[f]));
  if (wrong.length) misses.push({ said: e.raw, wrong: Object.fromEntries(wrong.map((f) => [f, `${p[f]} (you saved ${e[f]})`])) });
  else perfect++;
}

console.log(`${perfect}/${entries.length} entries parsed exactly as saved (${entries.length ? Math.round(100 * perfect / entries.length) : 0}%)\n`);
for (const m of misses) console.log(JSON.stringify(m.said), m.wrong);
