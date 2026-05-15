import type { CalendarEvent } from './types'
import { loadEvents, saveEvents } from './storage'
import {
  calendarCells,
  endOfDay,
  formatDayHeader,
  monthTitle,
  sameDay,
  startOfDay,
} from './calendar'
import { listenHebrew, speechAvailable } from './speech'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Draft = {
  id?: string
  title: string
  description: string
  startLocal: string
  endLocal: string
}

const state = {
  viewMonth: startOfMonth(new Date()),
  selected: stripTime(new Date()),
  events: loadEvents() as CalendarEvent[],
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

function persist(): void {
  saveEvents(state.events)
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

function saveDraft(): void {
  const d = state.draft
  if (!d) return
  const title = d.title.trim()
  const desc = d.description.trim()
  if (!title && !desc) {
    alert('Enter a title or a description')
    return
  }
  const start = fromDatetimeLocal(d.startLocal)
  const end = fromDatetimeLocal(d.endLocal)
  if (new Date(end) < new Date(start)) {
    alert('End must be after start')
    return
  }
  if (d.id) {
    const i = state.events.findIndex((e) => e.id === d.id)
    if (i >= 0) {
      state.events[i] = {
        ...state.events[i]!,
        title,
        description: desc,
        start,
        end,
      }
    }
  } else {
    state.events.push({
      id: crypto.randomUUID(),
      title,
      description: desc,
      start,
      end,
    })
  }
  persist()
  closeEditor()
}

function deleteDraft(): void {
  const d = state.draft
  if (!d?.id) return
  if (!confirm('Delete this event?')) return
  state.events = state.events.filter((e) => e.id !== d.id)
  persist()
  closeEditor()
}

function startVoice(field: 'title' | 'description', append: boolean): void {
  state.listeningStop?.()
  state.voiceStatus = 'Listening…'
  render()
  state.listeningStop = listenHebrew(
    (partial) => {
      state.voiceStatus = partial || 'Listening…'
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

function formatHm(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function renderEditor(): HTMLElement {
  const d = state.draft!
  const backdrop = h('div', 'backdrop')
  const sheet = h('div', 'sheet')
  sheet.setAttribute('role', 'dialog')

  const h3 = h('h3', 'sheetTitle')
  h3.textContent = d.id ? 'Edit event' : 'New event'
  sheet.append(h3)

  const titleLbl = h('label', 'lbl')
  titleLbl.textContent = 'Title (optional)'
  const titleIn = document.createElement('input')
  titleIn.className = 'input'
  titleIn.type = 'text'
  titleIn.placeholder = 'Short label'
  titleIn.value = d.title
  titleIn.addEventListener('input', () => {
    d.title = titleIn.value
  })
  sheet.append(titleLbl, titleIn)

  const voiceTitle = h('div', 'voiceRow')
  if (!speechAvailable()) {
    const w = h('p', 'warn')
    w.textContent =
      'Voice input works best in Chrome or Edge (Chromium). Hebrew availability depends on the browser/OS.'
    voiceTitle.append(w)
  } else {
    voiceTitle.append(
      btn('Title — append (Hebrew)', 'btn secondary', () => startVoice('title', true)),
      btn('Title — replace', 'btn secondary', () => startVoice('title', false)),
    )
  }
  sheet.append(voiceTitle)

  const descLbl = h('label', 'lbl')
  descLbl.textContent = 'Description'
  const desc = document.createElement('textarea')
  desc.className = 'textarea'
  desc.placeholder = 'What is this event?'
  desc.rows = 6
  desc.value = d.description
  desc.addEventListener('input', () => {
    d.description = desc.value
  })
  sheet.append(descLbl, desc)

  const voiceDesc = h('div', 'voiceRow')
  if (speechAvailable()) {
    voiceDesc.append(
      btn('Description — append (Hebrew)', 'btn secondary', () => startVoice('description', true)),
      btn('Description — replace', 'btn secondary', () => startVoice('description', false)),
    )
  }
  if (state.voiceStatus) {
    const vs = h('p', 'voiceStatus')
    vs.textContent = state.voiceStatus
    voiceDesc.append(vs)
  }
  sheet.append(voiceDesc)

  const sLbl = h('label', 'lbl')
  sLbl.textContent = 'Start'
  const sIn = document.createElement('input')
  sIn.className = 'input'
  sIn.type = 'datetime-local'
  sIn.value = d.startLocal
  sIn.addEventListener('change', () => {
    d.startLocal = sIn.value
  })
  sheet.append(sLbl, sIn)

  const eLbl = h('label', 'lbl')
  eLbl.textContent = 'End'
  const eIn = document.createElement('input')
  eIn.className = 'input'
  eIn.type = 'datetime-local'
  eIn.value = d.endLocal
  eIn.addEventListener('change', () => {
    d.endLocal = eIn.value
  })
  sheet.append(eLbl, eIn)

  const actions = h('div', 'actions')
  actions.append(btn('Cancel', 'btn ghost', () => closeEditor()))
  if (d.id) actions.append(btn('Delete', 'btn danger', () => deleteDraft()))
  actions.append(btn('Save', 'btn primary', () => saveDraft()))
  sheet.append(actions)

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeEditor()
  })
  backdrop.append(sheet)
  return backdrop
}

function render(): void {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = ''

  const shell = h('div', 'shell')
  const header = h('header', 'top')
  const title = h('h1', 'title')
  title.textContent = 'Voice Calendar'
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
  header.append(title, monthNav)
  shell.append(header)

  const todayBtn = btn('Today', 'todayBtn', () => {
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
    p.textContent = 'No events on this day'
    shell.append(p)
  } else {
    const list = h('div', 'evList')
    for (const ev of dayEvents) {
      const card = btn('', 'evCard', () => openEdit(ev))
      const body = h('div', 'evTitle')
      body.textContent = ev.title.trim() || ev.description.trim() || 'No details'
      const time = h('div', 'evTime')
      time.textContent = `${formatHm(ev.start)} – ${formatHm(ev.end)}`
      card.append(body, time)
      list.append(card)
    }
    shell.append(list)
  }

  const fab = btn('+', 'fab', () => openCreate())
  fab.setAttribute('aria-label', 'Add event')
  shell.append(fab)

  if (state.editorOpen && state.draft) {
    shell.append(renderEditor())
  }

  app.append(shell)
}

export function init(): void {
  render()
}
