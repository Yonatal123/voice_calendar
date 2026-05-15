# GitHub: web app (recommended) and optional Android APK

The **web** calendar lives in the `web/` folder: responsive, stores events in **localStorage** in the browser, and Hebrew voice input uses the **Web Speech API** (best in Chrome / Edge).

## Web app on GitHub Pages (free URL)

Your site will be:

`https://<your-username>.github.io/<repository-name>/`

Example: repo `voice_calendar` → `https://you.github.io/voice_calendar/`

### 1. Turn on GitHub Pages (do this first)

`actions/configure-pages` (and the first deploy) call the GitHub Pages API. If Pages is not set up yet, you get **Not Found** / **Get Pages site failed**.

1. Open **Settings** → **Pages** for the repository (URL ends with `/settings/pages`).
2. Under **Build and deployment** → **Source**, select **GitHub Actions** (not “Deploy from a branch”).
3. Save if prompted.

You need **admin** access to the repo. On a **fork**, Pages from Actions may be disabled unless the upstream allows workflows.

### 2. Push this repository to GitHub

```powershell
cd C:\voice_calendar
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 3. Deploy

- Every push to `main` or `master` runs **Deploy web to GitHub Pages** (`.github/workflows/deploy-pages.yml`).
- After a green run, open the URL above. The job summary may show **page_url**.
- If a run failed **before** you completed step 1, open **Actions** → re-run the failed workflow after enabling Pages.

**Optional — auto-enable via workflow:** `configure-pages` supports `enablement: true` only when you pass a **personal access token** (not `GITHUB_TOKEN`) with repo admin scope. The UI in step 1 is simpler for most people.

**Custom domain (optional):** Settings → Pages → **Custom domain**. Follow [GitHub’s DNS guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

**If your repo is `username.github.io`:** the site is served from the site root. Add a repository variable `VITE_BASE_PATH` = `/` under **Settings → Secrets and variables → Actions → Variables**, or change the workflow `env` (defaults to `/<repo>/`).

### 4. Local web development

```powershell
cd web
npm install
npm run dev
```

Build production assets:

```powershell
npm run build
```

---

## Optional: Android APK build

The `app/` module is still an Android (Jetpack Compose) project. The **Build APK** workflow (`.github/workflows/build-apk.yml`) can produce a debug APK artifact if you keep using it.

If you only care about the web app, you can ignore or delete that workflow.
