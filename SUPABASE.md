# Supabase setup (free cloud database + login)

The web app stores events in **your** [Supabase](https://supabase.com/) project (PostgreSQL). The browser uses a **publishable** (or legacy **anon**) key; it is meant to be public. Who can read which rows is enforced with **Row Level Security (RLS)** so each signed-in user only sees their own events.

## 1. Create a project

1. Sign up at [supabase.com](https://supabase.com/) (free tier is enough for personal use).
2. **New project** → pick region → set a database password → create.

## 2. Create the table and policies

1. Open **SQL** → **New query**.
2. Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and **Run**.

## 3. Auth URLs (required for magic links)

1. **Authentication** → **URL configuration**.
2. **Site URL**: your production app root, e.g. `https://YOURNAME.github.io/YOUR_REPO/`
3. **Redirect URLs**: add the same URL (and `http://localhost:5173/**` for local Vite if you use magic links locally).

Without this, email magic links will fail after redirect.

## 4. Project URL and API key (for the app)

Supabase moved things around in the dashboard. Use this mapping:

### Project URL → `VITE_SUPABASE_URL`

1. Open **Settings** (gear) → **Data API** (or **General** on some layouts).
2. Copy the **Project URL** — it looks like `https://YOUR_PROJECT_REF.supabase.co`  
   Use that **exact host** (no trailing path required). This is what `createClient` expects.

If **Data API** only shows **API URL** as a full REST endpoint, for example:

`https://abcdefghijklmnop.supabase.co/rest/v1`

then for **`VITE_SUPABASE_URL`** use **only** the origin (scheme + host), **without** `/rest/v1`:

`https://abcdefghijklmnop.supabase.co`

Paste that into:

- **Local:** `web/.env.local` as `VITE_SUPABASE_URL=...` (see `web/.env.example`).
- **GitHub Pages:** repository secret **`VITE_SUPABASE_URL`** (same value), then redeploy so the build picks it up.

### “Anon public” key → `VITE_SUPABASE_ANON_KEY`

1. Open **Settings** → **API Keys**.
2. Prefer the **Publishable** key (`sb_publishable_...`) — this is the modern replacement for the old “anon” key and is what you should use in browsers. Copy it into `VITE_SUPABASE_ANON_KEY`.
3. If you don’t see Publishable keys yet, open the **Legacy** / **JWT keys** subsection on the same page and copy the **`anon` `public`** JWT instead — it works the same way for this app.

**Do not** put **Secret** / **service_role** keys in the web app or GitHub Actions for this frontend — those bypass RLS and must stay server-side only.

The env name stays `VITE_SUPABASE_ANON_KEY` for compatibility; the value can be either the **publishable** string or the legacy **anon** JWT.

### Local development

In `web/`:

```bash
cp .env.example .env.local
# Edit .env.local — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### GitHub Pages (production build)

Your deploy workflow reads **`secrets.VITE_SUPABASE_URL`** and **`secrets.VITE_SUPABASE_ANON_KEY`**. Put them in **Repository secrets** (simplest). You do **not** need the **Variables** tab for these values.

#### Step-by-step in GitHub

1. Open your repo on GitHub → **Settings** (repo settings, not your global account).
2. In the left sidebar: **Secrets and variables** → **Actions**.
3. Open the **Secrets** tab (not **Variables**).
4. Under **Repository secrets**, click **New repository secret** (twice — once per secret).

**Secret 1**

| Field | What to enter |
|--------|----------------|
| **Name** | `VITE_SUPABASE_URL` (copy this name exactly) |
| **Secret** | From Supabase **Settings → Data API**: your **API URL** stripped to the host only, e.g. `https://YOUR_REF.supabase.co` (remove `/rest/v1` if present) |

**Secret 2**

| Field | What to enter |
|--------|----------------|
| **Name** | `VITE_SUPABASE_ANON_KEY` (copy this name exactly) |
| **Secret** | From Supabase **Settings → API Keys**: your **Publishable** key (`sb_publishable_…`), or legacy **`anon` `public`** JWT |

5. Save each secret. Go to **Actions** → open the latest **Deploy web to GitHub Pages** workflow → **Re-run all jobs** (or push a commit) so a new build runs with the secrets.

#### Environment secrets vs repository secrets

- **Repository secrets** (what you use above): available to Actions workflows in this repo, including the Pages deploy job. **Use this unless you know you need otherwise.**
- **Environment secrets** (under **Environments** → e.g. `github-pages`): optional extra layer. This repo’s workflow uses the `github-pages` **environment** for deployment, but **repository secrets still work** for `secrets.VITE_*`. Only add **environment** secrets if your org requires it or repository secrets are not visible to the job.
- **Variables** tab: for non-sensitive config. **Do not** put your Supabase keys there; use **Secrets** so values stay masked in logs.

The workflow passes these into `npm run build`. Redeploy after adding or changing secrets.

## 5. Email sign-in

The app uses **email magic links** (`signInWithOtp`). Under **Authentication** → **Providers** → **Email**, keep Email enabled.

For testing you can temporarily turn off **Confirm email** (Auth → Providers → Email); turn it back on for production if you want confirmed addresses only.

## Limits (free tier)

Supabase free tier includes a shared Postgres instance with monthly quotas (database size, auth MAUs, egress). For a small personal calendar this is typically plenty; see [Supabase pricing](https://supabase.com/pricing) for current numbers.

## Import old browser-only data

After you sign in, use **Import from this browser** once if you still have events in IndexedDB / localStorage from before cloud sync.
