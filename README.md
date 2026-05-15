# Voice Calendar

**Web app (default):** responsive calendar in `web/` — events stay in the browser, deploy free on **GitHub Pages**. Hebrew voice uses the **Web Speech API** (Chrome / Edge recommended).

**Android:** optional Kotlin + Compose app in `app/` (local Room database).

## Web app

```bash
cd web
npm install
npm run dev
```

Deploy: see **[GITHUB.md](GITHUB.md)** (GitHub Actions → Pages).

## Android (optional)

Android app (Kotlin + Jetpack Compose) with **on-device Hebrew speech-to-text** for event descriptions.

## Features

- Month calendar view with event indicators
- Create, edit, and delete calendar events
- **Web:** data in `localStorage`; **Android:** Room SQLite on device
- Voice: **Web** — `he-IL` via browser; **Android** — `SpeechRecognizer`

## Requirements (Android only)

- Android 8.0+ (API 26)
- Physical device recommended for speech

## Build

### GitHub Actions — web (recommended)

Push to GitHub, enable **Pages → GitHub Actions**, then open  
`https://<user>.github.io/<repo>/`.

See **[GITHUB.md](GITHUB.md)**.

### GitHub Actions — Android APK (optional)

The **Build APK** workflow can produce `app-debug.apk`.

### Local build (Android Studio)

1. Install [Android Studio](https://developer.android.com/studio) with SDK 35.
2. Open this folder in Android Studio (it will sync Gradle and create `local.properties`).
3. Run the **app** configuration on a device or emulator.

From the command line (after Android Studio generates the Gradle wrapper):

```bash
gradlew.bat assembleDebug
```

Copy `local.properties.example` to `local.properties` and set `sdk.dir` if needed.

## Permissions (Android)

| Permission | Purpose |
|------------|---------|
| `RECORD_AUDIO` | Microphone for voice transcription |

The web app uses browser storage only; microphone is requested by the browser when you use voice input.

## Manual testing checklist

### Web

1. Open the deployed site or `npm run dev` locally.
2. Add an event, refresh the page — data should persist.
3. Try voice in Chrome: allow microphone, speak in Hebrew, check description updates.

### Android (optional)

1. Create and edit events; confirm they persist after app restart.
2. Grant microphone for voice; use a physical device for best STT.

### RTL / Hebrew UI (Android)

1. Set device language to Hebrew (עברית).
2. Confirm UI strings and layout direction (RTL) look correct.

## Privacy

- **Web:** Events stay in your browser (`localStorage`); no server in this repo.
- **Android:** Speech recognition uses the system speech service; calendar data is local (Room).

## Project structure

```
web/                 Vite + TypeScript PWA-style SPA (GitHub Pages)
app/src/main/java/   Android (Compose) app (optional)
```
