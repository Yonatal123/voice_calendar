# Voice Calendar

Browser-based calendar with **Supabase** (free-tier PostgreSQL): sign in by email magic link, events stored in the cloud. See **[SUPABASE.md](../SUPABASE.md)** to create a project, run the SQL schema, and add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to **GitHub Actions secrets** (and `web/.env.local` for local dev). Without those variables the app only shows setup instructions.

Hebrew voice uses the **Web Speech API** (Chrome / Edge recommended).

## Run locally

```bash
cd web
npm install
npm run dev
```

## Deploy (GitHub Pages)

See **[GITHUB.md](GITHUB.md)** — enable **Settings → Pages → Source: GitHub Actions**, then push to `main` or `master`.

## Project layout

| Path | Purpose |
|------|---------|
| `web/` | Vite + TypeScript app |
| `supabase/schema.sql` | Postgres table + RLS (run in Supabase SQL editor) |

More detail: **[web/README.md](web/README.md)** and **[SUPABASE.md](SUPABASE.md)**.

## Privacy & data

- With **Supabase** configured: events live in **your** Supabase Postgres database (encrypted in transit). The app never sends them to GitHub beyond the static JavaScript bundle.
- **Auth**: email magic link via Supabase Auth; session tokens stay in the browser until sign-out.

More setup: **[SUPABASE.md](../SUPABASE.md)**.
