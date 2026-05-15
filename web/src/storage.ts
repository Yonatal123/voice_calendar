import type { CalendarEvent } from './types'

const KEY = 'voice-calendar-events-v1'

export function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEvent)
  } catch {
    return []
  }
}

export function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(KEY, JSON.stringify(events))
}

function isEvent(x: unknown): x is CalendarEvent {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.description === 'string' &&
    typeof o.start === 'string' &&
    typeof o.end === 'string'
  )
}
