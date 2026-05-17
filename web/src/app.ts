import type { Session } from '@supabase/supabase-js'
import type { CalendarEvent } from './types'
import { fetchRemoteEvents, upsertRemoteEvent, deleteRemoteEvent } from './remote-events'
import { getSupabase, isRemoteConfigured } from './supabase'
import {
  calendarCells,
  endOfDay,
  formatDayHeader,
  monthTitle,
  sameDay,
  startOfDay,
} from './calendar'
import { listenHebrew, speechAvailable } from './speech'

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const MIC_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 18.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/></svg>'

type Draft = {
  id?: string
  title: string
  description: string
  startLocal: string
  endLocal: string
}

type AppPhase = 'loading' | 'unconfigured' | 'auth' | 'app'

const state = {
  phase: 'loading' as AppPhase,
  session: null as Session | null,
  viewMonth: startOfMonth(new Date()),
  selected: stripTime(new Date()),
  events: [] as CalendarEvent[],
  editorOpen: false,
  draft: null as Draft | null,
  listeningStop: null as null | (() => void),
  voiceStatus: '' as string,
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): string {
  return new Date(s).toISOString()
}

function eventsForDay(day: Date): CalendarEvent[] {
  const s0 = startOfDay(day).getTime()
  const e0 = endOfDay(day).getTime()
  return state.events
    .filter((ev) => {
      const a = new Date(ev.start).getTime()
      const b = new Date(ev.end).getTime()
      return a <= e0 && b >= s0
    })
    .sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime())
}

async function refreshRemoteEvents(): Promise<void> {
  const sb = getSupabase()
  state.events = await fetchRemoteEvents(sb)
}

function openCreate(): void {
  const base = stripTime(state.selected)
  const start = new Date(base)
  start.setHours(9, 0, 0, 0)
  const end = new Date(base)
  end.setHours(10, 0, 0, 0)
  state.draft = {
    title: '',
    description: '',
    startLocal: toDatetimeLocalValue(start),
    endLocal: toDatetimeLocalValue(end),
  }
  state.editorOpen = true
  state.voiceStatus = ''
  render()
}

function openEdit(ev: CalendarEvent): void {
  state.draft = {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    startLocal: toDatetimeLocalValue(new Date(ev.start)),
    endLocal: toDatetimeLocalValue(new Date(ev.end)),
  }
  state.editorOpen = true
  state.voiceStatus = ''
  render()
}

function closeEditor(): void {
  state.listeningStop?.()
  state.listeningStop = null
  state.editorOpen = false
  state.draft = null
  state.voiceStatus = ''
  render()
}

async function saveDraft(): Promise<void> {
  const d = state.draft
  if (!d) return
  const title = d.title.trim()
  const desc = d.description.trim()
  if (!title && !desc) {
    alert('הזן כותרת או תיאור')
    return
  }
  const start = fromDatetimeLocal(d.startLocal)
  const end = fromDatetimeLocal(d.endLocal)
  if (new Date(end) < new Date(start)) {
    alert('שעת הסיום חייבת להיות אחרי שעת ההתחלה')
    return
  }

  let saved: CalendarEvent
  if (d.id) {
    const i = state.events.findIndex((e) => e.id === d.id)
    if (i < 0) return
    saved = {
      ...state.events[i]!,
      title,
      description: desc,
      start,
      end,
    }
    state.events[i] = saved
  } else {
    saved = {
      id: crypto.randomUUID(),
      title,
      description: desc,
      start,
      end,
    }
    state.events.push(saved)
  }

  const uid = state.session?.user?.id
  if (!uid) {
    alert('לא מחובר.')
    return
  }
  try {
    await upsertRemoteEvent(getSupabase(), uid, saved)
  } catch (e) {
    try {
      await refreshRemoteEvents()
    } catch {
      /* ignore */
    }
    alert(e instanceof Error ? e.message : 'לא ניתן לשמור בשרת.')
    return
  }
  closeEditor()
}

async function deleteDraft(): Promise<void> {
  const d = state.draft
  if (!d?.id) return
  if (!confirm('למחוק את האירוע?')) return
  const id = d.id
  state.events = state.events.filter((e) => e.id !== id)
  try {
    await deleteRemoteEvent(getSupabase(), id)
  } catch (e) {
    try {
      await refreshRemoteEvents()
    } catch {
      /* ignore */
    }
    alert(e instanceof Error ? e.message : 'לא ניתן למחוק בשרת.')
    return
  }
  closeEditor()
}

async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}

async function sendMagicLink(emailRaw: string): Promise<void> {
  const email = emailRaw.trim()
  if (!email) {
    alert('הזן את כתובת האימייל.')
    return
  }
  const base = import.meta.env.BASE_URL || '/'
  const redirectTo = new URL(base, window.location.origin).href
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) {
    alert(error.message)
    return
  }
  alert('בדוק את האימייל לקישור ההתחברות.')
}

function startVoice(field: 'title' | 'description', append: boolean): void {
  state.listeningStop?.()
  state.voiceStatus = 'מאזין…'
  render()
  state.listeningStop = listenHebrew(
    (partial) => {
      state.voiceStatus = partial || 'מאזין…'
      render()
    },
    (final) => {
      state.listeningStop = null
      state.voiceStatus = ''
      if (state.draft) {
        const t = final.trim()
        if (!t) return
        if (field === 'title') {
          state.draft.title = append
            ? state.draft.title
              ? `${state.draft.title}\n${t}`
              : t
            : t
        } else {
          state.draft.description = append
            ? state.draft.description
              ? `${state.draft.description}\n${t}`
              : t
            : t
        }
      }
      render()
    },
    (err) => {
      state.listeningStop = null
      state.voiceStatus = err
      render()
    },
  )
}

function h(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

function btn(label: string, cls: string | undefined, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = label
  if (cls) b.className = cls
  b.addEventListener('click', onClick)
  return b
}

function micBtn(ariaLabel: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'btn micBtn'
  b.setAttribute('aria-label', ariaLabel)
  b.innerHTML = MIC_SVG
  b.addEventListener('click', onClick)
  return b
}

function renderEditor(): HTMLElement {
  const d = state.draft!
  const backdrop = h('div', 'backdrop')
  const sheet = h('div', 'sheet')
  sheet.setAttribute('role', 'dialog')

  const h3 = h('h3', 'sheetTitle')
  h3.textContent = d.id ? 'עריכת אירוע' : 'אירוע חדש'
  sheet.append(h3)

  const titleLbl = h('label', 'lbl')
  titleLbl.textContent = 'כותרת (אופציונלי)'
  const titleRow = h('div', 'fieldRow')
  const titleIn = document.createElement('input')
  titleIn.className = 'input'
  titleIn.type = 'text'
  titleIn.placeholder = 'תווית קצרה'
  titleIn.value = d.title
  titleIn.addEventListener('input', () => {
    d.title = titleIn.value
  })
  titleRow.append(titleIn)
  if (speechAvailable()) {
    titleRow.append(micBtn('הוספת כותרת בקול', () => startVoice('title', true)))
  }
  sheet.append(titleLbl, titleRow)

  if (!speechAvailable()) {
    const w = h('p', 'warn')
    w.textContent =
      'קלט קולי עובד הכי טוב ב-Chrome או Edge. זמינות עברית תלויה בדפדפן ובמערכת.'
    sheet.append(w)
  }

  const descLbl = h('label', 'lbl')
  descLbl.textContent = 'תיאור'
  const descRow = h('div', 'fieldRow')
  const desc = document.createElement('textarea')
  desc.className = 'textarea'
  desc.placeholder = 'מהות האירוע'
  desc.rows = 6
  desc.value = d.description
  desc.addEventListener('input', () => {
    d.description = desc.value
  })
  descRow.append(desc)
  if (speechAvailable()) {
    descRow.append(micBtn('הוספת תיאור בקול', () => startVoice('description', true)))
  }
  sheet.append(descLbl, descRow)

  if (state.voiceStatus) {
    const vs = h('p', 'voiceStatus')
    vs.textContent = state.voiceStatus
    sheet.append(vs)
  }

  const actions = h('div', 'actions')
  actions.append(btn('ביטול', 'btn ghost', () => closeEditor()))
  if (d.id) actions.append(btn('מחיקה', 'btn danger', () => void deleteDraft()))
  actions.append(btn('שמירה', 'btn primary', () => void saveDraft()))
  sheet.append(actions)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeEditor()
  })
  backdrop.append(sheet)
  return backdrop
}

function renderUnconfigured(root: HTMLElement): void {
  const wrap = h('div', 'authCard')
  const t = h('h1', 'authTitle')
  t.textContent = 'לוח שנה קולי'
  const p = h('p', 'authBlurb')
  p.textContent =
    'מסד הנתונים בענן לא הוגדר. הוסף כתובת Supabase ומפתח anon בזמן הבנייה (ראה SUPABASE.md), או השתמש ב-.env.local לפיתוח מקומי.'
  wrap.append(t, p)
  root.append(wrap)
}

function renderAuth(root: HTMLElement): void {
  const wrap = h('div', 'authCard')
  const t = h('h1', 'authTitle')
  t.textContent = 'לוח שנה קולי'
  const p = h('p', 'authBlurb')
  p.textContent = 'התחברות באימייל. נשלח קישור קסם — בלי סיסמה.'
  const email = document.createElement('input')
  email.type = 'email'
  email.className = 'input authInput'
  email.placeholder = 'you@example.com'
  email.autocomplete = 'email'
  email.dir = 'ltr'
  const row = h('div', 'authRow')
  row.append(
    btn('שליחת קישור התחברות', 'btn primary', () => {
      void sendMagicLink(email.value)
    }),
  )
  wrap.append(t, p, email, row)
  root.append(wrap)
}

function renderCalendarApp(root: HTMLElement): void {
  const shell = h('div', 'shell')
  const header = h('header', 'top')
  const titleRow = h('div', 'titleRow')
  const title = h('h1', 'title')
  title.textContent = 'לוח שנה קולי'
  titleRow.append(title)
  const who = h('span', 'signedInAs')
  const em = state.session?.user?.email ?? 'מחובר'
  who.textContent = em
  who.dir = 'ltr'
  titleRow.append(who)
  const out = btn('יציאה', 'btn ghost smallBtn', () => void signOut())
  titleRow.append(out)
  header.append(titleRow)

  const monthNav = h('div', 'monthNav')
  monthNav.append(
    btn('‹', 'iconBtn', () => {
      state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() - 1, 1)
      render()
    }),
    (() => {
      const s = h('span', 'monthLabel')
      s.textContent = monthTitle(state.viewMonth)
      return s
    })(),
    btn('›', 'iconBtn', () => {
      state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() + 1, 1)
      render()
    }),
  )
  header.append(monthNav)
  shell.append(header)

  const todayBtn = btn('היום', 'todayBtn', () => {
    const n = new Date()
    state.viewMonth = startOfMonth(n)
    state.selected = stripTime(n)
    render()
  })
  shell.append(todayBtn)

  const gridWrap = h('div', 'gridWrap')
  const row = h('div', 'weekdays')
  for (const w of WEEKDAYS) {
    const wd = h('div', 'wd')
    wd.textContent = w
    row.append(wd)
  }
  gridWrap.append(row)

  const grid = h('div', 'grid')
  const cells = calendarCells(state.viewMonth)
  const today = stripTime(new Date())
  for (const { date, inMonth } of cells) {
    const has = inMonth && eventsForDay(date).length > 0
    const selected = sameDay(date, state.selected)
    const isToday = sameDay(date, today)
    const cell = btn(String(date.getDate()), 'cell', () => {
      state.selected = stripTime(date)
      if (inMonth) state.viewMonth = startOfMonth(date)
      render()
    })
    if (!inMonth) cell.classList.add('out')
    if (selected) cell.classList.add('sel')
    if (isToday) cell.classList.add('today')
    if (has) {
      const dot = h('span', 'dot')
      cell.append(dot)
    }
    grid.append(cell)
  }
  gridWrap.append(grid)
  shell.append(gridWrap)

  const dayHead = h('h2', 'dayHead')
  dayHead.textContent = formatDayHeader(state.selected)
  shell.append(dayHead)

  const dayEvents = eventsForDay(state.selected)
  if (dayEvents.length === 0) {
    const p = h('p', 'muted')
    p.textContent = 'אין אירועים ביום זה'
    shell.append(p)
  } else {
    const list = h('div', 'evList')
    for (const ev of dayEvents) {
      const card = btn('', 'evCard', () => openEdit(ev))
      const body = h('div', 'evTitle')
      body.textContent = ev.title.trim() || ev.description.trim() || 'ללא פרטים'
      card.append(body)
      list.append(card)
    }
    shell.append(list)
  }

  const fab = btn('+', 'fab', () => openCreate())
  fab.setAttribute('aria-label', 'הוספת אירוע')
  shell.append(fab)

  if (state.editorOpen && state.draft) {
    shell.append(renderEditor())
  }

  root.append(shell)
}

function renderLoading(root: HTMLElement): void {
  const wrap = h('div', 'authCard')
  const p = h('p', 'authBlurb')
  p.textContent = 'טוען…'
  root.append(wrap)
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = ''

  if (state.phase === 'unconfigured') {
    renderUnconfigured(app)
    return
  }
  if (state.phase === 'loading') {
    renderLoading(app)
    return
  }
  if (state.phase === 'auth') {
    renderAuth(app)
    return
  }
  renderCalendarApp(app)
}

export async function init(): Promise<void> {
  if (!isRemoteConfigured()) {
    state.phase = 'unconfigured'
    render()
    return
  }

  state.phase = 'loading'
  render()

  const sb = getSupabase()

  const { data: sessionData } = await sb.auth.getSession()
  state.session = sessionData.session
  if (state.session) {
    try {
      state.events = await fetchRemoteEvents(sb)
    } catch {
      state.events = []
    }
    state.phase = 'app'
  } else {
    state.phase = 'auth'
  }
  render()

  sb.auth.onAuthStateChange(async (event, sess) => {
    if (event === 'INITIAL_SESSION') return

    state.session = sess

    if (event === 'SIGNED_OUT') {
      state.events = []
      state.editorOpen = false
      state.draft = null
      state.phase = 'auth'
      render()
      return
    }

    if (event === 'SIGNED_IN') {
      try {
        state.events = await fetchRemoteEvents(sb)
      } catch {
        state.events = []
      }
      state.phase = 'app'
      render()
    }
  })
}
