// Regenerates the pictures in docs/ from the real app, in headless Chrome.
//   npm run screenshots
// Needs Chrome. Set CHROME to its path if it isn't in the usual place.
// Uses made-up sample entries; nothing is sent anywhere.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const PHONE = { width: 390, height: 844 };

const SAMPLE = {
  'piso.url': 'https://script.google.com/macros/s/SAMPLE/exec',
  'piso.token': 'sample',
  'piso.accounts': ['BDO', 'GCash', 'Maya', 'Cash'],
  'piso.defaultAccount': 'Cash',
  'piso.recent': [
    { id: 's1', type: 'Expense', amount: 45, account: 'Cash', category: 'Transport', note: 'Jeep' },
    { id: 's2', type: 'Expense', amount: 1850, account: 'GCash', category: 'Groceries', note: 'Groceries At Puregold' },
    { id: 's3', type: 'Transfer', amount: 2000, account: 'BDO', toAccount: 'GCash', category: 'Transfer', note: '' },
    { id: 's4', type: 'Income', amount: 15000, account: 'BDO', category: 'Salary', note: 'Sweldo' },
    { id: 's5', type: 'Expense', amount: 149, account: 'GCash', category: 'Load/Bills', note: 'Dito Load' },
    { id: 's6', type: 'Expense', amount: 120, account: 'Cash', category: 'Food', note: 'Milk Tea' }
  ]
};

const SHOTS = [
  { file: 'phone-expense.png', say: 'minus 189 for chickenjoy gcash', theme: 'light' },
  { file: 'phone-transfer.png', say: 'transfer 2000 from BDO to GCash', theme: 'light' },
  { file: 'phone-dark.png', say: 'plus 15,000 sweldo into BDO', theme: 'dark' }
];

/* ---------- static server for the repo ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

/* ---------- Chrome over the DevTools protocol ---------- */
const chromePath = process.env.CHROME || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find((p) => fs.existsSync(p));
if (!chromePath) { console.error('Chrome not found. Set CHROME to its path.'); process.exit(2); }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'piso-shots-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });

const portFile = path.join(profile, 'DevToolsActivePort');
for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 100));
const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else listeners.forEach((l) => l(msg));
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const once = (method) => new Promise((r) => { const l = (m) => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); r(m); } }; listeners.push(l); });
const run = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const goto = async (url) => { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const save = async (file, params = {}) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', ...params });
  fs.writeFileSync(path.join(DOCS, file), Buffer.from(data, 'base64'));
  console.log('wrote docs/' + file);
};

await send('Page.enable');
await send('Runtime.enable');
fs.mkdirSync(DOCS, { recursive: true });

/* ---------- the phone screens ---------- */
await send('Emulation.setDeviceMetricsOverride', { ...PHONE, deviceScaleFactor: 2, mobile: true });
await goto(`${BASE}/app/index.html`);
await run(`(${(s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }})(${JSON.stringify(SAMPLE)})`);

for (const shot of SHOTS) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: shot.theme }] });
  await goto(`${BASE}/app/index.html?shot=${shot.file}`);
  await run(`(() => { const i = document.getElementById('typed'); i.value = ${JSON.stringify(shot.say)};
    document.getElementById('typedForm').requestSubmit(); })()`);
  await wait(200);
  await save(shot.file);
}

/* ---------- the README banner: three phones side by side ---------- */
await send('Emulation.setEmulatedMedia', { features: [] });
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
const phone = (f, caption) => `<figure><img src="${BASE}/docs/${f}"><figcaption>${caption}</figcaption></figure>`;
const banner = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: transparent; font: 15px/1.4 "Segoe UI", system-ui, sans-serif; }
  .row { display: flex; gap: 36px; justify-content: center; padding: 24px 24px 8px; }
  figure { margin: 0; text-align: center; }
  img { width: 340px; border-radius: 36px; border: 8px solid #14201e; box-shadow: 0 16px 40px rgba(15,118,110,.25); display: block; }
  figcaption { margin-top: 14px; color: #5d6b68; }
</style><div class="row" id="b">
  ${phone('phone-expense.png', '“Minus 189 for Chickenjoy, GCash”')}
  ${phone('phone-transfer.png', '“Transfer 2000 from BDO to GCash”')}
  ${phone('phone-dark.png', '“Plus 15,000 sweldo into BDO”, in dark mode')}
</div>`;
fs.writeFileSync(path.join(profile, 'banner.html'), banner);
await goto('file:///' + path.join(profile, 'banner.html').replace(/\\/g, '/'));
await wait(300);
const box = await run(`(() => { const r = document.getElementById('b').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height + 8 }; })()`);
await save('screenshot.png', { clip: { ...box, scale: 1 } });

/* ---------- the wordmark ---------- */
const mark = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: transparent; }
  #m { display: inline-flex; align-items: center; gap: 22px; padding: 12px;
       font: 800 104px/1 "Segoe UI", system-ui, sans-serif; letter-spacing: -2px; color: #0f766e; }
  img { width: 112px; height: 112px; border-radius: 28px; }
</style><div id="m"><img src="${BASE}/app/icons/icon-512.png">Piso</div>`;
fs.writeFileSync(path.join(profile, 'mark.html'), mark);
await goto('file:///' + path.join(profile, 'mark.html').replace(/\\/g, '/'));
await wait(200);
const mbox = await run(`(() => { const r = document.getElementById('m').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 2, mobile: false });
await save('logo.png', { clip: { ...mbox, scale: 1 } });

for (const f of SHOTS.map((s) => s.file)) fs.rmSync(path.join(DOCS, f)); // only the banner is kept
ws.close(); chrome.kill(); server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
