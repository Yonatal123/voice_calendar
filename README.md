# Voice Calendar

Android app (Kotlin + Jetpack Compose) that manages Google Calendar events synced on your device, with **on-device Hebrew speech-to-text** for event descriptions.

## Features

- Month calendar view with event indicators
- Create, edit, and delete calendar events
- Events sync via the Android Calendar Provider to Google Calendar
- Voice input in Hebrew (`he-IL` / `iw-IL`) using `SpeechRecognizer`

## Requirements

- Android 8.0+ (API 26)
- Google account with calendar sync on the device
- Google app and speech services for Hebrew recognition (physical device recommended)

## Build

### GitHub Actions (no Android Studio required)

Push this repo to GitHub; the **Build APK** workflow produces a downloadable `app-debug.apk`.

See **[GITHUB.md](GITHUB.md)** for step-by-step push and download instructions.

### Local build (Android Studio)

1. Install [Android Studio](https://developer.android.com/studio) with SDK 35.
2. Open this folder in Android Studio (it will sync Gradle and create `local.properties`).
3. Run the **app** configuration on a device or emulator.

From the command line (after Android Studio generates the Gradle wrapper):

```bash
gradlew.bat assembleDebug
```

Copy `local.properties.example` to `local.properties` and set `sdk.dir` if needed.

## Permissions

| Permission | Purpose |
|------------|---------|
| `READ_CALENDAR` / `WRITE_CALENDAR` | Read and manage synced calendar events |
| `RECORD_AUDIO` | Microphone for voice transcription |

## Manual testing checklist

### Calendar sync

1. Ensure a Google account is signed in and Calendar sync is enabled.
2. Grant calendar permissions on first launch.
3. Create an event with title and description.
4. Open the Google Calendar app and confirm the event appears.
5. Edit the event in Voice Calendar and verify the change in Google Calendar.
6. Delete the event and confirm removal in Google Calendar.

### Hebrew voice input

1. Use a **physical device** (emulator STT is unreliable).
2. Install/update the Google app and Hebrew speech recognition data.
3. Create or edit an event, grant microphone permission, tap the mic.
4. Speak in Hebrew; partial text should appear, then fill the description on completion.
5. Save the event and verify the description in Google Calendar.

### RTL / Hebrew UI

1. Set device language to Hebrew (עברית).
2. Confirm UI strings and layout direction (RTL) look correct.

## Privacy

- Calendar data is read/written only through the system Calendar Provider.
- Speech recognition runs on-device via the system speech service; no custom backend is included.

## Project structure

```
app/src/main/java/com/voicecalendar/app/
├── data/           CalendarRepository, SpeechRecognitionRepository
├── domain/model/   CalendarEvent, EventDraft
├── ui/             Compose screens and ViewModels
└── navigation/     AppNavHost
```
