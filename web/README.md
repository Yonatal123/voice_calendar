# Voice Calendar (web)

Mobile-friendly calendar: month grid, day list, add/edit/delete events. Data stays in the browser (`localStorage`). Voice uses **Web Speech API** with `he-IL` (works best in Chromium).

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # output in dist/
npm run preview  # serve dist locally
```

## GitHub Pages

Production builds use `VITE_BASE_PATH` so asset URLs work under `https://<user>.github.io/<repo>/`. The GitHub Action sets this automatically from the repository name.
