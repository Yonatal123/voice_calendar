# GitHub: Voice Calendar (web)

The app lives in **`web/`**: responsive calendar, **localStorage** for events, Hebrew voice via **Web Speech API** (best in Chrome / Edge).

## GitHub Pages (free URL)

Your site will be:

`https://<your-username>.github.io/<repository-name>/`

Example: repo `voice_calendar` → `https://you.github.io/voice_calendar/`

### 1. Turn on GitHub Pages (required — fixes “404” deploy errors)

Until this is done, **`deploy-pages` fails** with errors like:

- `Creating Pages deployment failed` / `HttpError: Not Found`
- `Ensure GitHub Pages has been enabled` (link to `…/settings/pages`)

**On GitHub (you must be a repo admin):**

1. Open **Settings → Pages** (`https://github.com/<owner>/<repo>/settings/pages`).
2. Under **Build and deployment**, set **Source** to **GitHub Actions** — not “Deploy from a branch” and not “None”.
3. Re-run the failed workflow: **Actions** → failed run → **Re-run all jobs**.

| Wrong | Right |
|--------|--------|
| Source = *Deploy from a branch* | **GitHub Actions** |
| Source = *None* | **GitHub Actions** |

**Forks:** Some forks do not offer **GitHub Actions** under Pages; use a normal repo under your account or change org/fork policy.

**Noise in logs:** `(node) DeprecationWarning: punycode` is from the runner/action stack and can be ignored.

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
