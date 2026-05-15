import type { CalendarEvent } from './types'

const KEY_V3 = 'voice-calendar-events-v3'
const KEY_V2 = 'voice-calendar-events-v2'
const KEY_V1 = 'voice-calendar-events-v1'

export function loadEvents(): CalendarEvent[] {
  try {
    const raw3 = localStorage.getItem(KEY_V3)
    if (raw3) {
      const parsed = JSON.parse(raw3) as unknown
      if (Array.isArray(parsed)) return parsed.filter(isEventV3)
    }
    const raw2 = localStorage.getItem(KEY_V2)
    if (raw2) {
      const migrated = migrateFromV2(raw2)
      if (migrated.length) {
        saveEvents(migrated)
        localStorage.removeItem(KEY_V2)
      }
      return migrated
    }
    const raw1 = localStorage.getItem(KEY_V1)
    if (raw1) {
      const migrated = migrateFromV1(raw1)
      if (migrated.length) {
        saveEvents(migrated)
        localStorage.removeItem(KEY_V1)
      }
      return migrated
    }
  } catch {
    /* ignore */
  }
  return []
}

export function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(KEY_V3, JSON.stringify(events))
}

function migrateFromV2(raw: string): CalendarEvent[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateOneV2).filter((e): e is CalendarEvent => e !== null)
  } catch {
    return []
  }
}

function migrateOneV2(x: unknown): CalendarEvent | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.start !== 'string' || typeof o.end !== 'string') return null
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const description = typeof o.description === 'string' ? o.description.trim() : ''
  return { id: o.id, title, description, start: o.start, end: o.end }
}

function migrateFromV1(raw: string): CalendarEvent[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateOneV1).filter((e): e is CalendarEvent => e !== null)
  } catch {
    return []
  }
}

function migrateOneV1(x: unknown): CalendarEvent | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.start !== 'string' || typeof o.end !== 'string') return null
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const desc = typeof o.description === 'string' ? o.description.trim() : ''
  return { id: o.id, title, description: desc, start: o.start, end: o.end }
}

function isEventV3(x: unknown): x is CalendarEvent {
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
