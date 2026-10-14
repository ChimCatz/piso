// Live check of the deployed backend. Adds one ₱1 test entry and removes it again by its ID.
//
//   PowerShell:  $env:PISO_URL="https://script.google.com/macros/s/.../exec"; $env:PISO_TOKEN="..."; npm run smoke
//   bash:        PISO_URL=... PISO_TOKEN=... npm run smoke
//
// The token comes from the environment so it never ends up in the repo.
const url = process.env.PISO_URL;
const token = process.env.PISO_TOKEN;
if (!url || !token) {
  console.error('Set PISO_URL and PISO_TOKEN first (see the top of this file).');
  process.exit(2);
}

const post = async (body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return res.json();
};

let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ->  ' + JSON.stringify(detail)));
  if (!ok) failed++;
};

const id = 'smoke-' + Date.now().toString(36);
const tx = { id, type: 'Expense', amount: 1, account: 'Cash', category: 'Other', note: 'Piso smoke test', raw: '+ smoke test' };

const alive = await (await fetch(url)).text();
check('backend is alive', alive.trim() === 'Piso is alive', alive.slice(0, 80));

const bad = await post({ token: 'wrong', action: 'undo' });
check('wrong token is rejected', bad.error === 'unauthorized', bad);

const add = await post({ token, action: 'add', tx });
check('add works', add.ok === true && !add.duplicate, add);

const again = await post({ token, action: 'add', tx });
check('resend is not duplicated', again.ok === true && again.duplicate === true, again);

const undo = await post({ token, action: 'undo', id });
const raw = undo.undone && undo.undone[0] && undo.undone[0][7];
check('undo by ID removes it', undo.ok === true && undo.undone.length === 1, undo);
check('formula-like text stays text', raw === '+ smoke test', raw);

const gone = await post({ token, action: 'undo', id });
check('it is really gone', gone.error === 'entry not found in sheet', gone);

console.log(failed ? `\n${failed} check(s) failed` : '\nAll live checks passed');
process.exit(failed ? 1 : 0);
