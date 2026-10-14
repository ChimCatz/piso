# Piso: voice income & expense tracker

Say "Minus 29 for coffee" or "Plus 6890.90 into BDO" and it lands in your Google Sheet.

```
Phone (PWA)  →  Google Apps Script  →  Google Sheet
```

All free. No Zapier, no Play Store.

## Files
- `Code.gs`, `appsscript.json`: the backend (Apps Script, pushed with clasp)
- `.clasp.json`, `.claspignore`: link this folder to the Apps Script project bound to the Piso sheet
- `index.html`, `parser.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`: the app
- `tests/`, `scripts/`, `package.json`: tests and checks (see Tests)

## Setup (about 20 minutes)

### 1. Sheet + backend
The script is already bound to the Piso sheet and deployed with [clasp](https://github.com/google/clasp)
(`npm install -g @google/clasp`, `clasp login`).

1. Run `clasp open-script` (or open the sheet → **Extensions → Apps Script**).
2. Edit the `ACCOUNTS` list inside `setupSheets()` if yours differ, then `clasp push`.
3. Select `setupSheets` in the function dropdown and click **Run**. Approve the permissions prompt. This creates the *Transactions*, *Accounts* and *Summary* tabs, and generates your secret token.
4. Open **Execution log** and copy the line `Your Piso token: ...` (you'll need it in step 3). It's stored in **Project Settings → Script Properties** as `TOKEN`, never in the code, so the repo can stay public.
5. Run `clasp list-deployments` and open `https://script.google.com/macros/s/<deployment id>/exec`. It should say "Piso is alive".

### 2. Host the app (free)
Pick one:
- **GitHub Pages**: push this repo, then Settings → Pages → deploy from `main`.
- **Cloudflare Pages / Netlify**: drag-and-drop the folder.

Your token is **not** stored in these files. You type it into the app's Settings on your phone, so a public repo is fine.

### 3. Install on the Samsung A54
1. Open your hosted URL in **Chrome**.
2. In Piso's Settings, paste the **Web app URL** and your **token**, check your accounts, then Save.
3. Chrome menu (⋮) → **Add to Home screen / Install app**.
4. Allow microphone access when asked.

## Using it
- Tap the mic, speak, check the confirm card, tap **Save**.
- Things it understands:
  - "Minus 29 for coffee", "Plus 6890.90 into BDO", "spent 150 on lunch using GCash"
  - Amounts: "1.5k", "5 thousand", "twenty nine", "one fifty" (= 150), "₱1,000"
  - Taglish: "sweldo 15000 BDO", "minus 60 pamasahe", "gastos 80 kape"
  - Transfers: "transfer 1000 from BDO to GCash", "withdraw 2000 from BDO" (BDO → Cash).
    A transfer is two rows (out of one account, into the other), so your total stays the same,
    and the Summary leaves it out of income and spending.
- If you fix the category on the confirm card, Piso remembers it for that note next time.
- Wrong entry? **Undo last** removes exactly the newest entry in Recent (both rows of a transfer).
- No signal? Entries are queued on the phone and sent when you're back online. Each entry has an ID,
  so a retry never adds it twice.
- No mic? Use the text box or your Samsung keyboard's mic button.

## Customising
- In the app's **Settings**: your accounts, the default account, nicknames
  (`bpi family=BPI, ewallet=GCash`) and the speech language (English or Filipino).
- In `parser.js`, at the top: `ACCOUNT_ALIASES`, `CATEGORIES`, `CATEGORY_KEYWORDS`
  (e.g. add `'ukay'` under Shopping) and the words that set the type.

After editing, run `npm test`, then push. Because of the offline cache, close and reopen the app once to get the new version.

## Tests
Needs [Node.js](https://nodejs.org) 20+, no installs.

- `npm test`: the parser cases in `tests/parser.test.js`, plus `Code.gs` run against a fake in-memory sheet
  (`tests/backend.test.js`). GitHub runs these on every push (the **Actions** tab).
- `npm run smoke`: a live check of the deployed backend. It adds a ₱1 test entry and removes it by its ID.
  Set `PISO_URL` and `PISO_TOKEN` first (see `scripts/smoke.mjs`).
- `npm run audit -- "<Transactions.csv>"`: download the Transactions tab as CSV, and this re-parses
  everything you've said and lists every entry you had to correct. Each one is a good new test case.

## Updating the backend
After changing `Code.gs`, push it and point the existing deployment at a new version, so the URL stays the same:

```
clasp push
clasp redeploy <deployment id> --description "what changed"
```

To change the token, edit `TOKEN` in **Project Settings → Script Properties**, then update it in the app's Settings.

## Good to know
- Anyone with your Web app URL **and** token can write to your sheet. Keep both private.
- Speech recognition needs internet and occasionally mishears numbers. That's why the confirm card exists.
- Chrome writes "plus 500" as "+ 500" and "minus 29" as "-29". Piso reads both.

## Later: migrating to a full app
The `{type, amount, account, category, note}` shape and the parser are reusable. Swap the Apps Script URL for Supabase or Firebase when you outgrow Sheets.
