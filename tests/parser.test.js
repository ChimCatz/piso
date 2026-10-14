// Parser tests: run with `npm test` (Node's built-in test runner, no installs).
// Add a row to CASES whenever Piso mishears or misfiles something you said.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../app/parser.js');

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
  ['minus 1.5k for groceries from gcash', { amount: 1500, account: 'GCash', category: 'Groceries', note: 'Groceries' }],
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
  ['lipat 300 gcash maya', { type: 'Transfer', account: 'GCash', toAccount: 'Maya' }],
  ['cash in 500 to gcash', { type: 'Transfer', amount: 500, account: 'Cash', toAccount: 'GCash' }],
  ['cash out 1000 from gcash', { type: 'Transfer', account: 'GCash', toAccount: 'Cash' }],
  // opening balances for a new account
  ['plus 12,000 into BDO opening balance', { type: 'Income', amount: 12000, account: 'BDO', category: 'Opening Balance' }],
  ['GCash starting balance 3500', { type: 'Income', amount: 3500, account: 'GCash', category: 'Opening Balance' }],
  // restaurants, stores and everyday things
  ['minus 189 for chickenjoy', { category: 'Food' }],
  ['minus 250 mang inasal', { category: 'Food', note: 'Mang Inasal' }],
  ["minus 320 for max's", { category: 'Food' }],
  ['minus 95 for 7 eleven', { amount: 95, category: 'Food', note: '7-Eleven' }],
  ['minus 95 for seven eleven', { amount: 95, category: 'Food' }],
  ['minus 95 for 7/11', { amount: 95, category: 'Food' }],
  ['minus 7 for 11 candies', { amount: 7 }],
  ['minus 1,850 for groceries at puregold', { category: 'Groceries', note: 'Groceries At Puregold' }],
  ['minus 120 for itlog', { category: 'Groceries' }],
  ['minus 640 savemore', { category: 'Groceries' }],
  ['minus 99 for lucky me pancit canton', { category: 'Groceries' }],   // instant, not a restaurant pancit
  ['minus 180 for pancit', { category: 'Food' }],
  ['minus 1,100 for gasul', { category: 'Household' }],
  ['minus 85 for downy', { category: 'Household' }],
  ['minus 150 for gupit', { category: 'Personal Care' }],
  ['minus 299 shampoo at watsons', { category: 'Personal Care' }],
  ['minus 380 for rose pharmacy', { category: 'Health' }],
  ['minus 2,300 for cepalco', { category: 'Load/Bills' }],
  ['minus 199 for hbo max', { category: 'Entertainment' }],
  ['minus 140 maxim', { category: 'Transport' }],
  ['minus 1,000 for petron', { category: 'Transport' }],
  ['minus 499 for mobile legends diamonds', { category: 'Entertainment' }],
  ['minus 500 for gift for mom', { category: 'Shopping', note: 'Gift For Mom' }],
  ['plus 2000 raket', { type: 'Income', category: 'Other Income' }],
  // from real entries
  ['-31 kopiko', { type: 'Expense', amount: 31, category: 'Food', note: 'Kopiko' }],
  ['-20 jeepney', { type: 'Expense', amount: 20, category: 'Transport', note: 'Jeepney' }],
  ['minus 489 from jollibee', { amount: 489, category: 'Food', note: 'Jollibee' }],
  ['+ 8,000 into bdo', { type: 'Income', amount: 8000, account: 'BDO' }],
  ['minus 25 for c2', { amount: 25, category: 'Food' }],
  ['plus 8000 kinsenas into bdo', { type: 'Income', category: 'Salary' }]
];

// Accounts beyond the defaults, as they'd be set in Settings
const MORE = { accounts: ['BDO', 'BPI', 'GCash', 'Maya', 'GoTyme', 'SeaBank', 'UnionBank', 'Metrobank', 'ShopeePay', 'Coins.ph', 'Cash'] };
const MORE_CASES = [
  ['minus 500 for groceries using b p i', { account: 'BPI' }],
  ['plus 5000 into go tyme', { account: 'GoTyme' }],
  ['transfer 2000 from sea bank to gcash', { type: 'Transfer', account: 'SeaBank', toAccount: 'GCash' }],
  ['minus 300 union bank', { account: 'UnionBank' }],
  ['minus 400 for groceries at metro supermarket', { account: 'Cash', category: 'Groceries' }], // not Metrobank
  ['minus 250 shopee pay for lazada', { account: 'ShopeePay', category: 'Shopping' }],
  ['plus 1000 into coins ph', { account: 'Coins.ph' }],
  ['minus 50 for coins', { account: 'Cash' }]
];

for (const [said, want] of MORE_CASES) {
  test('more accounts: ' + JSON.stringify(said), () => {
    const got = P.parse(said, MORE);
    assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, got[k]])), want);
  });
}

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

test('vocabulary: no keyword is in two categories', () => {
  const V = require('../app/vocabulary.js');
  const seen = {};
  const clashes = [];
  for (const [cat, kws] of Object.entries(V.CATEGORY_KEYWORDS)) {
    assert.ok(V.CATEGORIES.includes(cat), cat + ' is not in CATEGORIES');
    for (const kw of kws) {
      if (seen[kw] && seen[kw] !== cat) clashes.push(kw + ': ' + seen[kw] + ' / ' + cat);
      seen[kw] = cat;
    }
  }
  assert.deepEqual(clashes, []);
});
