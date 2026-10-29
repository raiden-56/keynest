# KeyNest — personal password manager backed by Excel

KeyNest is a single-user password manager that runs entirely in the browser and keeps every credential in **one Excel workbook that you own**. There is no server and no database. The workbook is encrypted field-by-field with AES-256-GCM; the key is derived from your master password and never leaves memory.

Stack: React 19 · Vite · TypeScript (strict) · Material UI 9 · Framer Motion · SheetJS · Web Crypto · MSAL (optional, for OneDrive/SharePoint) · Lucide icons · Vitest.

---

## 1. Quick start

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev                     # http://localhost:5173
```

`.env.local` already contains a **demo** master login:

| Field    | Value          |
| -------- | -------------- |
| Username | `admin`        |
| Password | `KeyNest!demo` |

Change it before storing anything real:

```bash
npm run hash -- "my new master password"
# paste the printed VITE_MASTER_PASSWORD_HASH line into .env.local, set VITE_MASTER_USERNAME, restart `npm run dev`
```

Other scripts:

| Script              | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `npm run build`     | Type-check and build to `dist/`                      |
| `npm run preview`   | Serve the production build locally                   |
| `npm test`          | Run unit tests (encryption, Excel parsing, generator) |
| `npm run lint`      | Lint with oxlint                                     |
| `npm run template`  | Regenerate `public/keynest-template.xlsx`            |

Requirements: Node 20+ and a modern browser. **Chrome or Edge** are recommended because they support the File System Access API, which lets KeyNest re-read and write your workbook directly. Firefox and Safari fall back to upload/download.

---

## 2. First run

1. Sign in with the master credentials.
2. The dashboard shows *Connect your Excel workbook*. Choose one of:
   - **Choose existing file** – pick an `.xlsx` you already maintain (use `public/keynest-template.xlsx` or *Download Excel template* as a starting point).
   - **Create new workbook** – KeyNest writes an empty encrypted workbook where you choose.
   - **OneDrive / SharePoint** – see section 5.
3. Add passwords. Every add/edit/delete is written back to the workbook within half a second. The sidebar shows the sync status and last sync time.

On every later launch KeyNest re-reads the workbook automatically (after you unlock). If the browser requires it, a *Grant access* button appears first — browsers never allow silent access to a local file without a user gesture after a restart.

---

## 3. Excel workbook format

KeyNest reads **two layouts** and writes one of them depending on *Settings → Excel integration → Workbook format* (encrypted by default).

### 3.1 Plaintext layout (import/template/export)

Sheet `Credentials` with a header row:

| Column           | Required | Notes                                                        |
| ---------------- | -------- | ------------------------------------------------------------ |
| ID               | no       | Generated if blank; duplicates are re-assigned with a warning |
| Application Name | **yes**  |                                                              |
| URL              | no       | Invalid URLs are kept but flagged                            |
| Username         | **yes**  |                                                              |
| Password         | **yes**  |                                                              |
| Category         | no       | Defaults to `Other`                                          |
| Notes            | no       |                                                              |
| Created At       | no       | Excel date or ISO-8601 text                                  |
| Updated At       | no       | Excel date or ISO-8601 text                                  |
| Favorite         | no       | `Yes`/`No`, `true`/`false`, `1`/`0`, `x`                      |

Header matching is forgiving (`App Name`, `Website`, `Login`, `E-mail`, `Pass`, `Modified`… all work). Blank rows are skipped. A row without an application name is skipped with a warning.

### 3.2 Encrypted layout (what KeyNest writes by default)

Sheet `Credentials`:

`ID · Application Name · URL · Encrypted Username · Encrypted Password · Category · Encrypted Notes · Encryption Version · Created At · Updated At · Favorite`

Encrypted cells look like `KN1:<iv-base64>:<ciphertext-base64>` (AES-256-GCM, fresh 96-bit nonce per cell).

Sheet `KeyNest Meta` holds the non-secret key-derivation parameters: `Salt`, `Iterations` (PBKDF2-SHA256, 600 000), `Encryption Version`, and a `Verifier` (an encrypted known string used to check that a key matches before decrypting rows). **The key itself is never stored anywhere.**

You can still edit the encrypted workbook by hand:

- Application Name, URL, Category, Favorite are plain and editable in Excel.
- To add a row by hand, add `Username`, `Password` (and optionally `Notes`) columns and fill them. KeyNest reads those plaintext cells and encrypts them on the next save.

### 3.3 Validation messages

KeyNest reports, without ever showing credential values: unreadable file, empty workbook, missing required columns (with the headers it found), generated/duplicate IDs, invalid URLs, unreadable dates, skipped rows, and rows that failed to decrypt.

---

## 4. Mode A — local Excel file

| Browser                         | Behaviour                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome, Edge (and other Chromium) | A `FileSystemFileHandle` is stored in IndexedDB. On launch KeyNest checks permission, re-reads the file, and writes changes directly. External edits are detected on focus. |
| Firefox, Safari                 | Upload fallback. After each change KeyNest downloads an updated workbook; replace your original with it. Encrypted workbooks are cached in IndexedDB so you don't re-upload every visit. Plaintext workbooks are never cached. |

External-change handling: when the file's modification time changes while KeyNest has no unsaved edits, it reloads silently. If you *do* have unsaved edits, a conflict dialog lets you **Merge** (newest wins per record), **Keep mine**, or **Use file**. Nothing is written until you choose.

---

## 5. Mode B — OneDrive / SharePoint (Microsoft Graph)

1. In [Microsoft Entra admin center](https://entra.microsoft.com) register an application → *Single-page application* platform → redirect URI `http://localhost:5173` (and your deployed origin).
2. API permissions → Microsoft Graph → delegated `Files.ReadWrite` and `User.Read`.
3. Put the Application (client) ID in `.env.local`:

   ```
   VITE_MS_CLIENT_ID=00000000-0000-0000-0000-000000000000
   VITE_MS_AUTHORITY=https://login.microsoftonline.com/common   # or your tenant id
   ```

4. In KeyNest choose *OneDrive / SharePoint* and enter one of:
   - a OneDrive path: `Documents/keynest-vault.xlsx`
   - a sharing link to the file
   - a Graph item path: `/drives/{driveId}/items/{itemId}` or `/sites/{siteId}/drive/items/{itemId}`

   The file must already exist (upload the template first).

KeyNest uses MSAL popup sign-in, `acquireTokenSilent` for refresh, downloads via the item's pre-authenticated download URL, and uploads with `If-Match: <eTag>` so a concurrent edit returns a conflict instead of being overwritten. Expired sessions show *Reconnect to Microsoft*; going offline shows *Offline* and retries when the connection returns.

---

## 6. Security model and its limits

What KeyNest does:

- Verifies the master login against a PBKDF2-SHA256 hash (`pbkdf2:iterations:salt:hash`) from `VITE_MASTER_PASSWORD_HASH`. Five failures trigger an escalating lockout.
- Derives the vault key with PBKDF2-SHA256 (600 000 iterations, random 128-bit salt) and keeps it as a **non-extractable** Web Crypto key in memory. The master password is discarded immediately after derivation.
- Encrypts usernames, passwords and notes with AES-256-GCM, unique nonce per cell, authenticated (tampering is detected).
- Masks passwords by default, allows one revealed row at a time, re-masks after a configurable timeout, clears the clipboard after a configurable timeout (best effort), locks after inactivity, and clears decrypted data from memory on lock/sign-out. Unsaved edits at lock time are parked **encrypted** in memory and restored after unlock.
- Never logs credentials, never puts them in URLs, notifications or error messages, never writes plaintext backups without explicit confirmation.

What KeyNest **cannot** do — please read:

- **The login is not a security boundary.** `VITE_*` variables are compiled into the JavaScript bundle. Anyone with the built files can read the hash and attempt to crack it offline, and anyone who can modify the files can bypass the login screen. The *encryption* of the workbook is what protects the data at rest, and it is only as strong as your master password.
- A compromised browser, extension, OS or device can read decrypted data from memory.
- Clipboard clearing cannot remove entries from clipboard-history tools or synced clipboards.
- **Losing the master password makes the encrypted workbook and every encrypted backup unrecoverable.** There is no reset.

For stronger guarantees package the app as a desktop application (e.g. Tauri/Electron) so authentication and key handling stay inside a local application boundary, or put it behind a real authentication service.

### Changing the master password

1. *Settings → Backup & recovery → Export plaintext* (confirm the warning), or keep the current workbook.
2. Generate a new hash (`npm run hash`) and update `.env.local`; restart.
3. Sign in with the new password. When the old workbook is opened, KeyNest asks for the **old** passphrase, decrypts it, and offers *Re-encrypt now* with the new master password.

### Moving to another browser/device

The salt lives in the workbook's `KeyNest Meta` sheet, so opening the same workbook elsewhere just asks for your master password once and then adopts the workbook's key settings.

---

## 7. Backup and recovery

- **Export encrypted backup** (default) – same format as the vault; safe to store anywhere you would store the vault.
- **Export plaintext** – requires ticking an explicit acknowledgement; the file name contains `PLAINTEXT`.
- **Restore from file** – validates the file, shows record counts and issues, then lets you *Merge* (newest wins per ID) or *Replace*. Encrypted backups made with another passphrase prompt for it.
- **Validate workbook** – re-reads the source and lists structural issues without changing anything.

---

## 8. Settings

General (name, default category/sort, table/cards, page size) · Security (auto-lock, clipboard timeout, reveal timeout, default visibility, session) · Excel integration (current file, mode, change source, reconnect, last sync, sync now, validate, workbook format, disconnect) · Backup & recovery · Appearance (light/dark/system, comfortable/compact). All settings persist in `localStorage`; no secrets are stored there.

---

## 9. Project structure

```
src/
  app/            App.tsx (providers), router.tsx (protected routes)
  components/
    common/       buttons, dialogs, empty/error states, shimmer, toasts, logo
    layout/       AppLayout, Sidebar, Header, MobileNavigation
    dashboard/    StatsCard, CategoryCard, RecentAccounts
    credentials/  table, cards, list, form, details drawer, filters, generator
    sync/         status indicator, banner, source setup, conflict/key/import dialogs
  pages/          Login, Dashboard, AllPasswords, Favorites, Categories, RecentlyUpdated, Settings
  services/       encryption, auth, excel, keyring, clipboard, generator, settings
    storage/      FileHandleAdapter, UploadAdapter, GraphAdapter, IndexedDB store
  store/          Settings, Auth, Vault (sync engine), UI, CredentialActions contexts
  hooks/          useAuth, useCredentials, useExcelSync, useIdleLock, useClipboard, useListFilters
  types/ utils/ theme/ styles/ test/
scripts/          hash-password.mjs, make-template.mjs
public/           keynest-template.xlsx
```

---

## 10. Troubleshooting

| Symptom                                         | What to do                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "Master credentials are not configured"         | Create `.env.local` from `.env.example`; restart the dev server (env changes need a restart).       |
| "Permission needed for …" after restart         | Click *Grant access* — browsers require a click before re-opening a local file.                     |
| "Workbook not found"                            | The file was moved/renamed/deleted. *Settings → Change source file*.                               |
| "Workbook passphrase needed"                    | The file was encrypted with another master password or on another device; enter that password.     |
| "Changes could not be written"                  | The file is probably open in Excel (Windows locks it). Close it and click *Retry*.                 |
| Cloud: "Reconnect to Microsoft"                 | Token expired; click the button. Check the app registration's redirect URI if the popup fails.      |
| Firefox/Safari: changes keep downloading        | That is the fallback mode. Replace the original file with the download, or use Chrome/Edge.         |

---

## 11. Tests

```bash
npm test
```

Covers AES-GCM round-trips, tamper detection, unique nonces, PBKDF2 key separation, password-generator policy guarantees and distribution, strength scoring, plaintext/encrypted workbook parsing, header aliases, missing-column errors, duplicate IDs, hand-added plaintext cells in encrypted workbooks, template generation, and URL validation.
