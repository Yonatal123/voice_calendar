# GitHub: web app (recommended) and optional Android APK

The **web** calendar lives in the `web/` folder: responsive, stores events in **localStorage** in the browser, and Hebrew voice input uses the **Web Speech API** (best in Chrome / Edge).

## Web app on GitHub Pages (free URL)

Your site will be:

`https://<your-username>.github.io/<repository-name>/`

Example: repo `voice_calendar` → `https://you.github.io/voice_calendar/`

### 1. Push this repository to GitHub

```powershell
cd C:\voice_calendar
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Turn on GitHub Pages (first time only)

1. Repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**: choose **GitHub Actions** (not “Deploy from a branch”).

### 3. Deploy

- Every push to `main` or `master` runs **Deploy web to GitHub Pages** (see `.github/workflows/deploy-pages.yml`).
- After a green run, open the URL above. The workflow job summary may also show **page_url**.

**Custom domain (optional, still free with GitHub Pages):** same Settings → Pages → **Custom domain**. DNS must point to GitHub as [documented](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

**If your repo is `username.github.io`:** the site is served from the site root. Set repository variable `VITE_BASE_PATH` to `/` in **Settings → Secrets and variables → Actions → Variables**, or adjust the workflow env (default uses `/<repo>/`).

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
