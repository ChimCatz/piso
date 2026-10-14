// Parser tests: run with `npm test` (Node's built-in test runner, no installs).
// Add a row to CASES whenever Piso mishears or misfiles something you said.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../parser.js');

// [what was said, expected fields] — only the fields listed are checked
const CASES = [
  // the originals
  ['Minus 29 for coffee', { type: 'Expense', amount: 29, account: 'Cash', category: 'Food', note: 'Coffee' }],
  ['Plus 6890.90 into BDO', { type: 'Income', amount: 6890.9, account: 'BDO', category: 'Other Income', note: '' }],
  ['Minus 149 for DITO Load', { type: 'Expense', amount: 149, category: 'Load/Bills', note: 'Dito Load' }],
  // how Chrome actually transcribes plus/minus
  ['-29 for coffee', { type: 'Expense', amount: 29, category: 'Food', note: 'Coffee' }],
  ['+ 500 into gcash', { type: 'Income', amount: 500, account: 'GCash', category: 'Other Income' }],
  ['+500 salary into BDO', { type: 'Income', amount: 500, account: 'BDO', category: 'Salary' }],
  // amounts
  ['minus 1.5k for groceries from gcash', { amount: 1500, account: 'GCash', category: 'Food', note: 'Groceries' }],
  ['spent 2,500 for rent from BDO', { amount: 2500, account: 'BDO', category: 'Load/Bills', note: 'Rent' }],
  ['plus 5 thousand into BDO', { type: 'Income', amount: 5000, account: 'BDO' }],
  ['minus twenty nine for coffee', { amount: 29, category: 'Food' }],
  ['minus twenty-nine for coffee', { amount: 29 }],
  ['minus one fifty for lunch', { amount: 150, category: 'Food' }],
  ['minus two twenty five for lunch', { amount: 225 }],
  ['minus one hundred and fifty for lunch', { amount: 150 }],
  ['minus a thousand for rent', { amount: 1000, category: 'Load/Bills' }],
  ['plus two thousand five hundred allowance', { type: 'Income', amount: 2500, category: 'Other Income' }],
  ['P250 for load', { amount: 250, category: 'Load/Bills' }],
  ['₱1,000.50 for groceries', { amount: 1000.5 }],
  ['minus 300 pesos for dinner', { amount: 300, note: 'Dinner' }],
  ['minus 50 for 7-eleven snack', { amount: 50, category: 'Food', note: '7-Eleven Snack' }],
  // categories: longest keyword wins
  ['minus 850 for water bill', { category: 'Load/Bills' }],
  ['minus 20 for water', { category: 'Food' }],
  ['minus 200 for grab food', { category: 'Food' }],
  ['minus 60 for grab to work', { category: 'Transport', note: 'Grab To Work' }],
  ['minus 120 for milk tea', { category: 'Food', note: 'Milk Tea' }],
  ['minus 100 for gift', { type: 'Expense', category: 'Other' }],   // income-only category on an expense
  // Taglish
  ['minus 60 pamasahe', { type: 'Expense', amount: 60, category: 'Transport', note: 'Pamasahe' }],
  ['minus 250 for ulam', { category: 'Food', note: 'Ulam' }],
  ['minus 1,500 for meralco', { amount: 1500, category: 'Load/Bills' }],
  ['sweldo 15000 bdo', { type: 'Income', amount: 15000, account: 'BDO', category: 'Salary' }],
  ['gastos 80 kape', { type: 'Expense', amount: 80, category: 'Food' }],
  ['minus 450 for gamot', { category: 'Health' }],
  // notes without "for"
  ['spent 150 on lunch using gcash', { amount: 150, account: 'GCash', category: 'Food', note: 'Lunch' }],
  ['plus 300 refund to g-cash', { type: 'Income', account: 'GCash', category: 'Other Income', note: 'Refund' }],
  ['got 500 from mom', { type: 'Income', amount: 500, account: 'Cash', note: 'Mom' }],
  // account names, nicknames and mishearings
  ['minus 99 for spotify on maia', { account: 'Maya', category: 'Entertainment', note: 'Spotify' }],
  ['minus 99 for netflix b.d.o.', { account: 'BDO' }],
  ['minus 35 for kape gkash', { account: 'GCash', note: 'Kape' }],
  ['minus 40 for car wash', { account: 'Cash' }],   // "wash" must not fuzzy-match an account
  // transfers
  ['transfer 1000 from bdo to gcash', { type: 'Transfer', amount: 1000, account: 'BDO', toAccount: 'GCash', category: 'Transfer' }],
  ['transfer 1000 to gcash from bdo', { type: 'Transfer', account: 'BDO', toAccount: 'GCash' }],
  ['transfer 500 to maya', { type: 'Transfer', account: 'Cash', toAccount: 'Maya' }],
  ['withdraw 2000 from BDO', { type: 'Transfer', amount: 2000, account: 'BDO', toAccount: 'Cash' }],
  ['lipat 300 gcash maya', { type: 'Transfer', account: 'GCash', toAccount: 'Maya' }]
];

for (const [said, want] of CASES) {
  test(JSON.stringify(said), () => {
    const got = P.parse(said);
    const picked = Object.fromEntries(Object.keys(want).map((k) => [k, got[k]]));
    assert.deepEqual(picked, want);
  });
}

test('no amount gives null', () => {
  assert.equal(P.parse('minus for coffee').amount, null);
});

test('only your accounts are matched', () => {
  const p = P.parse('minus 50 for snack from gcash', { accounts: ['BDO', 'Cash'], defaultAccount: 'Cash' });
  assert.equal(p.account, 'Cash');
});

test('default account is used when none is said', () => {
  const p = P.parse('minus 50 for snack', { accounts: ['BDO', 'GCash'], defaultAccount: 'GCash' });
  assert.equal(p.account, 'GCash');
});

test('withdraw without a Cash account is a plain expense', () => {
  const p = P.parse('withdraw 500 from bdo', { accounts: ['BDO', 'GCash'] });
  assert.equal(p.type, 'Expense');
});

test('nicknames from Settings', () => {
  const opts = { accounts: ['BDO', 'BPI', 'Cash'], aliases: P.parseAliases('bpi family = BPI, ewallet=Cash') };
  assert.equal(P.parse('minus 99 for netflix bpi family', opts).account, 'BPI');
  assert.equal(P.parse('minus 99 for netflix BPI', opts).account, 'BPI');
});

test('learned corrections beat built-in keywords', () => {
  const learned = { 'ulam': 'Shopping', 'bday ni mama': 'Other' };
  assert.equal(P.parse('minus 250 for ulam', { learned }).category, 'Shopping');
  assert.equal(P.parse('minus 250 for ulam ni lola', { learned }).category, 'Shopping');
  assert.equal(P.parse('minus 250 for coffee', { learned }).category, 'Food');
});

test('learnKey normalises the note', () => {
  assert.equal(P.learnKey('Grab-Food'), 'grab food');
});

test('pickBest keeps the guess that makes sense', () => {
  const p = P.pickBest(['minus twenty nine for coffee', 'minus 29 for coffee', 'minus to nine for coffee'], {});
  assert.equal(p.amount, 29);
  assert.equal(P.pickBest(['my nose', 'minus 50 for jeep'], {}).raw, 'minus 50 for jeep');
  assert.equal(P.pickBest(['', '  '], {}), null);
});

test('wordsToDigits leaves ordinary words alone', () => {
  assert.equal(P.wordsToDigits('a coffee and a donut'), 'a coffee and a donut');
  assert.equal(P.wordsToDigits('minus a thousand'), 'minus 1000');
});
