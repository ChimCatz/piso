# Piso: voice income & expense tracker

Say "Minus 29 for coffee" or "Plus 6890.90 into BDO" and it lands in your Google Sheet.

```
Phone (PWA)  →  Google Apps Script  →  Google Sheet
```

All free. No Zapier, no Play Store.

## Files
- `Code.gs`: the backend (paste into Apps Script)
- `index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`: the app

## Setup (about 20 minutes)

### 1. Sheet + backend
1. Create a new Google Sheet named **Piso**.
2. **Extensions → Apps Script**. Delete the default code and paste in `Code.gs`.
3. Change `TOKEN` at the top to a long random string (keep a copy, you'll need it in step 3).
4. Edit the `ACCOUNTS` list inside `setupSheets()` if yours differ.
5. Select `setupSheets` in the function dropdown and click **Run**. Approve the permissions prompt. This creates the *Transactions*, *Accounts* and *Summary* tabs.
6. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Click Deploy and copy the **Web app URL**.
7. Open that URL in a browser. It should say "Piso is alive".

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
After changing `Code.gs`: **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

## Good to know
- Anyone with your Web app URL **and** token can write to your sheet. Keep both private.
- Speech recognition needs internet and occasionally mishears numbers. That's why the confirm card exists.
- Amounts like "1.5k" are understood. Spelled-out numbers ("one hundred fifty") are not. Chrome usually returns digits anyway.

## Later: migrating to a full app
The `{type, amount, account, category, note}` shape and the parser are reusable. Swap the Apps Script URL for Supabase or Firebase when you outgrow Sheets.
