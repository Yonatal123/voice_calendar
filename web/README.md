# Voice Calendar (web)

Mobile-friendly calendar with **Supabase** cloud storage and **email magic-link** sign-in. Voice uses **Web Speech API** with `he-IL` (works best in Chromium).

## Setup (required)

1. Create a Supabase project and run the SQL in [`../supabase/schema.sql`](../supabase/schema.sql) — full steps in **[../SUPABASE.md](../SUPABASE.md)**.
2. Copy `web/.env.example` to **`web/.env.local`** and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Supabase **Authentication → URL configuration**, add your dev URL (`http://localhost:5173/...`) and production GitHub Pages URL to **Redirect URLs**.

Without env vars the built app only shows a configuration message.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # output in dist/
npm run preview  # serve dist locally
```

## GitHub Pages

Add repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so the deploy workflow can bake them into the build.

Production builds use `VITE_BASE_PATH` so asset URLs work under `https://<user>.github.io/<repo>/`.

## Optional import

After sign-in, **Import from this browser** uploads any legacy events still in IndexedDB / localStorage from older versions of the app.
