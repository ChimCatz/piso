/**
 * Piso parser: turns what you said ("minus 29 for coffee") into an entry.
 * Used by index.html (as window.PisoParser) and by the Node tests.
 */
(function (root) {
  'use strict';

  /* ---------- Config you can edit ---------- */
  const DEFAULT_ACCOUNTS = ['BDO', 'GCash', 'Maya', 'Cash'];
  const ACCOUNT_ALIASES = {            // spoken form -> account name
    'bdo': 'BDO', 'b d o': 'BDO', 'bee dee oh': 'BDO', 'bdo unibank': 'BDO',
    'gcash': 'GCash', 'g cash': 'GCash', 'gee cash': 'GCash', 'ji cash': 'GCash',
    'maya': 'Maya', 'maia': 'Maya', 'paymaya': 'Maya', 'pay maya': 'Maya',
    'cash': 'Cash', 'wallet': 'Cash', 'pitaka': 'Cash'
  };
  const CATEGORIES = ['Food', 'Transport', 'Load/Bills', 'Shopping', 'Health', 'Entertainment', 'Savings', 'Salary', 'Other Income', 'Other'];
  const INCOME_CATEGORIES = ['Salary', 'Other Income'];
  const CATEGORY_KEYWORDS = {          // category -> words that trigger it (longest match wins)
    'Food': ['coffee', 'kape', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks', 'food', 'milk tea', 'jollibee', 'mcdo', 'mcdonalds', 'kfc', 'chowking', 'starbucks', 'grab food', 'foodpanda', 'grocery', 'groceries', 'rice', 'bigas', 'water', 'ulam', 'kain', 'kumain', 'merienda', 'meryenda', 'pagkain', 'almusal', 'tanghalian', 'hapunan', 'palengke', 'bread', 'pandesal'],
    'Transport': ['jeep', 'jeepney', 'taxi', 'grab', 'grab car', 'angkas', 'joyride', 'fare', 'pamasahe', 'pasahe', 'gas', 'gasoline', 'diesel', 'bus', 'tricycle', 'trike', 'lrt', 'mrt', 'parking', 'toll'],
    'Load/Bills': ['load', 'dito', 'globe', 'smart', 'internet', 'wifi', 'pldt', 'converge', 'electric', 'electricity', 'kuryente', 'meralco', 'water bill', 'maynilad', 'manila water', 'bill', 'bills', 'rent', 'upa', 'renta', 'subscription'],
    'Shopping': ['shopee', 'lazada', 'tiktok shop', 'shein', 'ukay', 'clothes', 'shoes', 'shopping', 'mall'],
    'Health': ['medicine', 'gamot', 'botika', 'pharmacy', 'mercury drug', 'doctor', 'clinic', 'checkup', 'check up', 'dentist', 'vitamins', 'hospital'],
    'Entertainment': ['game', 'games', 'netflix', 'youtube premium', 'disney', 'movie', 'sine', 'spotify', 'steam', 'top up', 'topup'],
    'Savings': ['savings', 'save', 'ipon'],
    'Salary': ['salary', 'sweldo', 'sahod', 'payroll', 'payday'],
    'Other Income': ['refund', 'gift', 'regalo', 'bonus', 'allowance', 'padala', 'remittance', 'cashback', 'sold', 'sale', 'freelance']
  };
  const INCOME_WORDS = ['plus', 'add', 'added', 'income', 'received', 'receive', 'deposit', 'deposited', 'earned', 'got', 'salary', 'sweldo', 'sahod', 'natanggap'];
  const EXPENSE_WORDS = ['minus', 'less', 'spent', 'spend', 'expense', 'paid', 'pay', 'bought', 'buy', 'deduct', 'gastos', 'gumastos', 'bayad', 'binayad', 'nagbayad', 'bumili', 'binili'];
  const TRANSFER_WORDS = ['transfer', 'transferred', 'lipat', 'inilipat'];
  const WITHDRAW_WORDS = ['withdraw', 'withdrew', 'withdrawal', 'withdrawn']; // ATM: account -> Cash
  const FROM_WORDS = ['from', 'galing'];
  const TO_WORDS = ['to', 'into', 'sa', 'papunta'];
  const PREPOSITIONS = ['from', 'galing', 'to', 'into', 'in', 'on', 'using', 'via', 'with', 'at', 'sa', 'papunta', 'thru', 'through'];
  const FILLER = PREPOSITIONS.concat(['for', 'the', 'a', 'an', 'and', 'my', 'of', 'ng', 'po', '+', '-', '−', '–']);

  /* ---------- Helpers ---------- */
  const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRe = (p) => new RegExp('(^|\\s)' + escapeRe(p) + '(?=\\s|$)');
  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  // "G-Cash" -> "g cash", "B.D.O." -> "b d o"
  function simplify(s) {
    return String(s || '').toLowerCase()
      .replace(/['’]/g, '')
      .replace(/([a-z])[.\-]+(?=[a-z])/g, '$1 ')
      .replace(/([a-z])\.(?=\s|$)/g, '$1')
      .replace(/\s+/g, ' ').trim();
  }

  function levenshtein(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  // Every keyword, longest first, so "water bill" beats "water"
  const KEYWORDS = Object.entries(CATEGORY_KEYWORDS)
    .flatMap(([cat, kws]) => kws.map((kw) => [kw, cat]))
    .sort((a, b) => b[0].length - a[0].length);
  // Words that should never be fuzzy-matched to an account name
  const KNOWN_WORDS = new Set([].concat(INCOME_WORDS, EXPENSE_WORDS, TRANSFER_WORDS, WITHDRAW_WORDS, FILLER,
    KEYWORDS.map((k) => k[0]).filter((k) => !k.includes(' '))));

  /* ---------- Spoken numbers ---------- */
  const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const SCALES = { hundred: 100, thousand: 1000, million: 1000000 };
  const isNumWord = (w) => has(UNITS, w) || has(TENS, w) || has(SCALES, w);

  function runToNumber(run) {
    const v = run.map((w) => (has(UNITS, w) ? UNITS[w] : has(TENS, w) ? TENS[w] : null));
    // How prices are said: "one fifty" = 150, "two twenty five" = 225
    if (run.length >= 2 && run.length <= 3 && v.every((x) => x !== null) &&
        v[0] >= 1 && v[0] <= 9 && v[1] >= 10 &&
        (run.length === 2 || (has(TENS, run[1]) && v[2] >= 1 && v[2] <= 9))) {
      return v[0] * 100 + v[1] + (v[2] || 0);
    }
    let total = 0, current = 0;
    for (const w of run) {
      if (has(UNITS, w)) current += UNITS[w];
      else if (has(TENS, w)) current += TENS[w];
      else if (w === 'hundred') current = (current || 1) * 100;
      else { total += (current || 1) * SCALES[w]; current = 0; }
    }
    return total + current;
  }

  // "minus twenty nine" -> "minus 29", "a thousand" -> "1000"
  function wordsToDigits(text) {
    const words = text.split(' ');
    const out = [];
    let i = 0;
    while (i < words.length) {
      const run = [];
      let j = i;
      while (j < words.length) {
        const w = words[j], next = words[j + 1];
        if (isNumWord(w)) { run.push(w); j++; continue; }
        if (w === 'a' && !run.length && next && has(SCALES, next)) { run.push('one'); j++; continue; }
        if (w === 'and' && run.length && next && isNumWord(next)) { j++; continue; }
        break;
      }
      if (run.length && !(run.length === 1 && has(SCALES, run[0]))) { out.push(String(runToNumber(run))); i = j; }
      else { out.push(words[i]); i++; }
    }
    return out.join(' ');
  }

  function normalize(raw) {
    const t = simplify(String(raw || '')
      .replace(/₱/g, ' ')
      .replace(/\b(php|pesos?|piso)\b/gi, ' '))
      .replace(/[!?;:"“”]/g, ' ')
      .replace(/,(?!\d)/g, ' ')
      .replace(/\s+/g, ' ').trim();
    return wordsToDigits(t);
  }

  /* ---------- Accounts ---------- */
  function aliasTable(accounts, userAliases) {
    const table = {};
    Object.entries(ACCOUNT_ALIASES).forEach(([a, acc]) => { table[a] = acc; });
    accounts.forEach((acc) => { table[simplify(acc)] = acc; });
    Object.entries(userAliases || {}).forEach(([a, acc]) => { table[simplify(a)] = acc; });
    Object.keys(table).forEach((k) => { if (!k || !accounts.includes(table[k])) delete table[k]; });
    return table;
  }

  const wordBefore = (text, idx) => text.slice(0, idx).trim().split(' ').pop() || '';

  // All account mentions with their positions, in spoken order
  function findAccounts(text, accounts, userAliases) {
    const table = aliasTable(accounts, userAliases);
    const keys = Object.keys(table).sort((a, b) => b.length - a.length);
    let masked = text;
    const found = [];
    for (const k of keys) {
      const re = new RegExp('(^|\\s)(' + escapeRe(k) + ')(?=\\s|$)', 'g');
      let m;
      while ((m = re.exec(masked))) {
        const start = m.index + m[1].length, end = start + m[2].length;
        found.push({ account: table[k], start, end });
        masked = masked.slice(0, start) + ' '.repeat(end - start) + masked.slice(end);
        re.lastIndex = end;
      }
    }
    if (!found.length) {
      // Misheard names: "gkash" -> GCash, "mayah" -> Maya (one letter off, same first letter)
      const single = keys.filter((k) => !k.includes(' ') && k.length >= 4);
      const re = /\S+/g;
      let m;
      while ((m = re.exec(text))) {
        const w = m[0];
        if (w.length < 4 || /\d/.test(w) || KNOWN_WORDS.has(w)) continue;
        const k = single.find((s) => s[0] === w[0] && Math.abs(s.length - w.length) <= 1 && levenshtein(s, w) <= 1);
        if (k) { found.push({ account: table[k], start: m.index, end: m.index + w.length, fuzzy: true }); break; }
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }

  /* ---------- Main ---------- */
  function parse(raw, opts) {
    opts = opts || {};
    const accounts = (opts.accounts && opts.accounts.length) ? opts.accounts : DEFAULT_ACCOUNTS;
    const defaultAccount = accounts.includes(opts.defaultAccount) ? opts.defaultAccount
      : (accounts.includes('Cash') ? 'Cash' : accounts[0]);
    const text = normalize(raw);
    const words = text.split(' ');

    // type
    let type = 'Expense', typeFound = false, withdraw = false;
    if (words.some((w) => TRANSFER_WORDS.includes(w))) { type = 'Transfer'; typeFound = true; }
    else if (words.some((w) => WITHDRAW_WORDS.includes(w)) && accounts.includes('Cash')) { type = 'Transfer'; typeFound = true; withdraw = true; }
    else if (/(^|\s)\+\s*\d/.test(text)) { type = 'Income'; typeFound = true; }       // Chrome: "plus 500" -> "+ 500"
    else if (/(^|\s)[-−–]\s*\d/.test(text)) { type = 'Expense'; typeFound = true; }   // Chrome: "minus 29" -> "-29"
    else {
      for (const w of words) {
        if (INCOME_WORDS.includes(w)) { type = 'Income'; typeFound = true; break; }
        if (EXPENSE_WORDS.includes(w)) { type = 'Expense'; typeFound = true; break; }
      }
    }

    // amount: "6,890.90", "29", "1.5k", "5 thousand", "p500"
    let amount = null, amountSpan = null;
    const am = /(^|[^\w.,])p?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s*(k|thousand|hundred|million)\b)?(?![\w-])/.exec(text);
    if (am) {
      amount = parseFloat(am[2].replace(/,/g, '') + (am[3] || ''));
      if (am[4]) amount *= { k: 1000, thousand: 1000, hundred: 100, million: 1000000 }[am[4]];
      amount = Math.round(amount * 100) / 100;
      amountSpan = [am.index + am[1].length, am.index + am[0].length];
    }

    // accounts
    const found = findAccounts(text, accounts, opts.aliases);
    let account, toAccount = '';
    if (type === 'Transfer') {
      let from = found.find((f) => FROM_WORDS.includes(wordBefore(text, f.start)));
      let to = found.find((f) => f !== from && TO_WORDS.includes(wordBefore(text, f.start)));
      const rest = found.filter((f) => f !== from && f !== to);
      if (!from && rest.length) from = rest.shift();
      if (!to && rest.length) to = rest.shift();
      if (withdraw && !to && (!from || from.account !== 'Cash')) to = { account: 'Cash' };
      toAccount = to ? to.account : '';
      account = from ? from.account : (defaultAccount !== toAccount ? defaultAccount : accounts.find((a) => a !== toAccount));
      if (!toAccount || toAccount === account) toAccount = accounts.find((a) => a !== account) || '';
    } else {
      account = found.length ? found[0].account : defaultAccount;
    }

    // note: blank out the amount and "<preposition> <account>", then keep what's left
    let cleaned = text;
    const blank = (s, e) => { cleaned = cleaned.slice(0, s) + ' '.repeat(e - s) + cleaned.slice(e); };
    if (amountSpan) blank(amountSpan[0], amountSpan[1]);
    found.forEach((f) => {
      const prev = wordBefore(text, f.start);
      const s = PREPOSITIONS.includes(prev) ? text.lastIndexOf(prev, f.start - 1) : f.start;
      blank(s, f.end);
    });
    const forIdx = cleaned.search(/(^|\s)for(?=\s|$)/);
    let noteWords;
    if (forIdx >= 0) {
      noteWords = cleaned.slice(forIdx).trim().split(/\s+/).slice(1);
      while (noteWords.length && FILLER.includes(noteWords[0])) noteWords.shift();
      while (noteWords.length && FILLER.includes(noteWords[noteWords.length - 1])) noteWords.pop();
    } else {
      const typeWords = [].concat(INCOME_WORDS, EXPENSE_WORDS, TRANSFER_WORDS, WITHDRAW_WORDS);
      noteWords = cleaned.split(/\s+/).filter((w) => w && !FILLER.includes(w) && !typeWords.includes(w) && !/^[\d.,]+$/.test(w));
    }
    const note = noteWords.join(' ');

    // category: your own corrections first, then built-in keywords
    const hay = note || text;
    let category = null;
    const learned = opts.learned || {};
    const learnedKeys = Object.keys(learned).filter((k) => k && CATEGORIES.includes(learned[k])).sort((a, b) => b.length - a.length);
    for (const k of learnedKeys) { if (phraseRe(k).test(hay)) { category = learned[k]; break; } }
    if (!category) {
      for (const [kw, cat] of KEYWORDS) { if (phraseRe(kw).test(hay)) { category = cat; break; } }
    }
    if (type === 'Transfer') category = 'Transfer';
    else if (type === 'Income') { if (!INCOME_CATEGORIES.includes(category)) category = 'Other Income'; }
    else if (!category || INCOME_CATEGORIES.includes(category)) category = 'Other';

    return {
      type, typeFound, amount, account, accountFound: found.length > 0, toAccount,
      category, note: titleCase(note), raw: String(raw || '')
    };
  }

  // Chrome can return several guesses of what you said; keep the one that makes the most sense
  function score(p) {
    return (p.amount ? 4 : 0) + (p.typeFound ? 2 : 0) + (p.accountFound ? 1 : 0) +
      (['Other', 'Other Income'].includes(p.category) ? 0 : 1);
  }
  function pickBest(transcripts, opts) {
    let best = null, bestScore = -1;
    for (const t of transcripts || []) {
      if (!t || !String(t).trim()) continue;
      const p = parse(t, opts);
      const s = score(p);
      if (s > bestScore) { best = p; bestScore = s; }
    }
    return best;
  }

  // "maia=Maya, bpi = BPI" -> { maia: 'Maya', bpi: 'BPI' }
  function parseAliases(str) {
    const out = {};
    String(str || '').split(',').forEach((pair) => {
      const [a, acc] = pair.split('=').map((s) => (s || '').trim());
      if (a && acc) out[a] = acc;
    });
    return out;
  }

  const learnKey = (note) => simplify(note);

  const api = { parse, pickBest, normalize, wordsToDigits, parseAliases, learnKey, DEFAULT_ACCOUNTS, CATEGORIES };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PisoParser = api;
})(typeof self !== 'undefined' ? self : this);
