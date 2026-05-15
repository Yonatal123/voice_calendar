# Voice Calendar

Browser-based calendar: month view, day list, create/edit/delete events. Data stays in **`localStorage`**. Hebrew voice input uses the **Web Speech API** (Chrome / Edge recommended).

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
| `web/` | Vite + TypeScript app (`npm run build` → `dist/`) |

More detail: **[web/README.md](web/README.md)**.

## Privacy

Events never leave your browser unless you sync the device another way; this repo does not include a backend.
