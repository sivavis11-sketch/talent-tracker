# Talent Tracker

Coach Siva's football talent app. You mark points by domain (Daily, Juggling, Flexibility, Core, Crossbar, Foot tennis, Special and any domain you add). The app shows leaderboards and player report cards, and downloads PDF reports. You can install it on your phone and computer like an app.

- **The app** is the files in this repo, served free by GitHub Pages.
- **Players** are read straight from the Players tab of your sports app sheet. Only name, admission number, group, gender and date of birth are read. Contacts, medical notes and fees are never read.
- **Points, setup, coach notes and player changes** are saved in a new Google Sheet called **Talent Tracker Data**. A small Google Apps Script in `apps-script/` reads and writes it.
- **Offline:** points you type without signal stay on the phone and are sent when you're back online.

## One-time setup

### 1. Create the Apps Script

1. Go to [script.google.com](https://script.google.com) and click **New project**. Name it `Talent Tracker API`.
2. Open **Project Settings** (gear icon) and tick **Show "appsscript.json" manifest file in editor**.
3. Back in the editor:
   - Replace everything in `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
   - Replace everything in `appsscript.json` with [`apps-script/appsscript.json`](apps-script/appsscript.json).
   - Save.
4. Choose the `setup` function at the top and click **Run**. Allow the permissions Google asks for. These are your own sheets.
5. Open **Execution log**. It shows:
   - the link to your new **Talent Tracker Data** sheet;
   - **your app key**. Keep it private.

If you use clasp, do this from the `apps-script` folder instead: `clasp create --type standalone --title "Talent Tracker API"`, then `clasp push`, then run `setup` in the editor.

### 2. Deploy it as a web app

1. Click **Deploy**, then **New deployment**, then the gear icon, then **Web app**.
2. Set **Execute as:** Me, and **Who has access:** Anyone.
3. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

"Anyone" only means the address answers. Every request must carry your key, so nobody can read or change anything without it.

### 3. Turn on the website

GitHub Pages is free only for public repositories. This repo contains only the app's code and pictures; no player data and no key are stored in it.

1. Go to **Settings**, then **General**, then **Danger Zone**, then **Change visibility**, and choose **Public**.
2. Go to **Settings**, then **Pages**. Under **Source**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
3. After a minute the app is at **https://sivavis11-sketch.github.io/talent-tracker/**.

### 4. Connect and install

1. Open the app address on your phone and paste the **Web app URL** and **key**, then tap **Connect**.
2. Install it:
   - **Android, or Chrome on a computer:** tap **Install** on the Home screen, or use the browser menu's **Install app**.
   - **iPhone:** in Safari, tap **Share**, then **Add to Home Screen**.

**Tip:** to connect another device in one tap, open this link once on it (fill in your own URL and key):
`https://sivavis11-sketch.github.io/talent-tracker/#api=WEB_APP_URL&key=YOUR_KEY`

## Updating the Apps Script later

1. Paste the new code.
2. Go to **Deploy**, then **Manage deployments**, then the pencil icon.
3. Set **Version** to **New version** and click **Deploy**.

This keeps the same web address. Run `showKey` any time you need the key again.

## What's in the data sheet

| Tab | What it holds |
| --- | --- |
| Days | One row per date: every point given that day (used by the app) |
| Points | The same points, one row per player per activity (easy to read or filter) |
| Settings | Your domains, activities and "out of" points |
| Notes | Coach notes for report cards |
| PlayerChanges | Players you hid or added by hand |

## Files

- `index.html`, `app.css`, `js/`: the app.
  - `core.js`: scoring and ranks.
  - `views.js`: screens.
  - `store.js`: saving to the sheet.
  - `actions.js`: buttons and PDFs.
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes it installable and work offline.
- `apps-script/`: the Google Apps Script backend.
- `dev/e2e.cjs`: test that runs the real app in Chromium against the backend code on a fake Google Sheet.
  - Run: `NODE_PATH=$(npm root -g) LIBDIR=<folder with jspdf and jspdf-autotable installed> node dev/e2e.cjs`.
