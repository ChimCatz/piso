# Piso: voice income & expense tracker

Say "Minus 29 for coffee" or "Plus 6890.90 into BDO" and it lands in your Google Sheet.

```
Phone (PWA)  →  Google Apps Script  →  Google Sheet
```

All free. No Zapier, no Play Store.

## Files
- `Code.gs`, `appsscript.json`: the backend (Apps Script, pushed with clasp)
- `.clasp.json`, `.claspignore`: link this folder to the Apps Script project bound to the Piso sheet
- `index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`: the app

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
- **GitHub Pages**: create a repo, upload the 5 app files, then Settings → Pages → deploy from `main`.
- **Cloudflare Pages / Netlify**: drag-and-drop the folder.

Your token is **not** stored in these files. You type it into the app's Settings on your phone, so a public repo is fine.

### 3. Install on the Samsung A54
1. Open your hosted URL in **Chrome**.
2. In Piso's Settings, paste the **Web app URL** and your **token**, check your accounts, then Save.
3. Chrome menu (⋮) → **Add to Home screen / Install app**.
4. Allow microphone access when asked.

## Using it
- Tap the mic, speak, check the confirm card, tap **Save**.
- Wrong entry? **Undo last** removes the newest row.
- No signal? Entries are queued on the phone and sent when you're back online.
- No mic? Use the text box or your Samsung keyboard's mic button.

## Customising
At the top of the `<script>` in `index.html`:
- `DEFAULT_ACCOUNTS` and `ACCOUNT_ALIASES`: how spoken names map to accounts
- `CATEGORIES` and `CATEGORY_KEYWORDS`: add your own words (e.g. add `'ukay'` under Shopping)
- `INCOME_WORDS` / `EXPENSE_WORDS`: words that set the type

After editing `index.html`, re-upload it. Because of the offline cache, close and reopen the app once to get the new version.

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
- Amounts like "1.5k" are understood. Spelled-out numbers ("one hundred fifty") are not. Chrome usually returns digits anyway.

## Later: migrating to a full app
The `{type, amount, account, category, note}` shape and the parser are reusable. Swap the Apps Script URL for Supabase or Firebase when you outgrow Sheets.
