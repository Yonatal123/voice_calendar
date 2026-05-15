# Push to GitHub and download the APK

## 1. Create a GitHub repository

1. Go to https://github.com/new
2. Name it (e.g. `voice-calendar`)
3. Choose **Public** or **Private**
4. Do **not** add a README, .gitignore, or license (this project already has them)
5. Click **Create repository**

## 2. Push this project from your PC

Open PowerShell in the project folder:

```powershell
cd C:\Users\taly2\.cursor\projects\empty-window

git init
git add .
git commit -m "Initial commit: Voice Calendar Android app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/voice-calendar.git
git push -u origin main
```

Replace `YOUR_USERNAME/voice-calendar` with your repo URL.

If Git asks you to sign in, use a **Personal Access Token** (not your password):
https://github.com/settings/tokens → Generate new token (classic) → scope `repo`.

## 3. Wait for the build

1. Open your repo on GitHub
2. Go to the **Actions** tab
3. Open the **Build APK** workflow run (starts automatically on push)
4. Wait until it shows a green checkmark (~5–10 minutes the first time)

## 4. Download the APK

1. In the completed workflow run, scroll to **Artifacts**
2. Click **voice-calendar-debug-apk** to download a ZIP
3. Unzip it — inside is `app-debug.apk`
4. Copy `app-debug.apk` to your phone and install (allow installs from Files/Drive if prompted)

## Run the build manually

Actions → **Build APK** → **Run workflow** → **Run workflow**

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on licenses | Re-run the workflow; the workflow accepts licenses automatically |
| No Artifacts section | Open the workflow **job** (not the workflow list); artifacts are on the job summary page |
| `git` not found | Install Git: https://git-scm.com/download/win |
| Push rejected | If the remote has a README, use `git pull origin main --rebase` then push again |
