/** Web Speech API — Hebrew works best in Chromium (Chrome, Edge). */

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorLike {
  readonly error: string
  readonly message?: string
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechCtor = new () => SpeechRecognitionLike

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor
    webkitSpeechRecognition?: SpeechCtor
  }
  return w.webkitSpeechRecognition || w.SpeechRecognition || null
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && getSpeechCtor() !== null
}

export function listenHebrew(
  onPartial: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (message: string) => void,
): () => void {
  const SR = getSpeechCtor()
  if (!SR) {
    onError('Speech recognition not supported in this browser.')
    return () => {}
  }
  const rec = new SR()
  rec.lang = 'he-IL'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1

  rec.onresult = (ev: SpeechRecognitionEventLike) => {
    let interim = ''
    let final = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i]
      if (!r) continue
      const t = r[0]?.transcript?.trim() ?? ''
      if (r.isFinal) final += t
      else interim += t
    }
    if (interim) onPartial(interim)
    if (final) onFinal(final)
  }
  rec.onerror = (ev: SpeechRecognitionErrorLike) => {
    onError(ev.error === 'not-allowed' ? 'Microphone permission denied' : ev.message || ev.error)
  }
  rec.onend = () => {}
  try {
    rec.start()
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Could not start microphone')
  }
  return () => {
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
  }
}
