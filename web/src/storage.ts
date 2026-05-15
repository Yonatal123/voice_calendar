import type { CalendarEvent } from './types'

/** Serialized JSON must stay under this size (bytes); oldest events are removed first. */
export const MAX_STORE_BYTES = 4_000_000

const KEY_V3 = 'voice-calendar-events-v3'
const KEY_V2 = 'voice-calendar-events-v2'
const KEY_V1 = 'voice-calendar-events-v1'

const DB_NAME = 'voice-calendar-idb'
const DB_VERSION = 1
const STORE = 'events'
const IDB_KEY = 'main'

function byteSize(json: string): number {
  return new Blob([json]).size
}

/** Drop events with earliest `end` until JSON fits under [maxBytes]. Preserves original order for survivors. */
export function trimEventsToByteBudget(events: CalendarEvent[], maxBytes: number): CalendarEvent[] {
  if (events.length === 0) return events
  const keep = new Map(events.map((e) => [e.id, e]))
  const removalOrder = [...events]
    .sort((a, b) => {
      const ea = new Date(a.end).getTime()
      const eb = new Date(b.end).getTime()
      if (ea !== eb) return ea - eb
      return a.id.localeCompare(b.id)
    })
    .map((e) => e.id)

  while (keep.size > 0) {
    const list = [...keep.values()]
    const json = JSON.stringify(list)
    if (byteSize(json) <= maxBytes) {
      const alive = new Set(keep.keys())
      return events.filter((e) => alive.has(e.id))
    }
    if (keep.size === 1) {
      return events.filter((e) => keep.has(e.id))
    }
    const victim = removalOrder.find((id) => keep.has(id))
    if (victim === undefined) break
    keep.delete(victim)
  }
  return []
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

async function idbGet(): Promise<unknown | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const r = tx.objectStore(STORE).get(IDB_KEY)
    r.onerror = () => reject(r.error ?? new Error('idb get'))
    r.onsuccess = () => resolve(r.result ?? null)
  })
}

async function idbPut(events: CalendarEvent[]): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    tx.oncomplete = () => resolve()
    tx.objectStore(STORE).put(events, IDB_KEY)
  })
}

async function idbAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false
    await openDb()
    return true
  } catch {
    return false
  }
}

let useIdb: boolean | null = null

async function preferIdb(): Promise<boolean> {
  if (useIdb !== null) return useIdb
  useIdb = await idbAvailable()
  return useIdb
}

function readLocalStorageChain(): CalendarEvent[] {
  try {
    const raw3 = localStorage.getItem(KEY_V3)
    if (raw3) {
      const parsed = JSON.parse(raw3) as unknown
      if (Array.isArray(parsed)) return parsed.filter(isEventV3)
    }
    const raw2 = localStorage.getItem(KEY_V2)
    if (raw2) {
      const migrated = migrateFromV2(raw2)
      return migrated
    }
    const raw1 = localStorage.getItem(KEY_V1)
    if (raw1) {
      return migrateFromV1(raw1)
    }
  } catch {
    /* ignore */
  }
  return []
}

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(KEY_V1)
    localStorage.removeItem(KEY_V2)
    localStorage.removeItem(KEY_V3)
  } catch {
    /* ignore */
  }
}

function saveToLocalStorage(events: CalendarEvent[]): void {
  const trimmed = trimEventsToByteBudget(events, MAX_STORE_BYTES)
  localStorage.setItem(KEY_V3, JSON.stringify(trimmed))
}

/**
 * Load events: prefers IndexedDB; migrates from legacy localStorage once.
 */
export async function loadEvents(): Promise<CalendarEvent[]> {
  const idbOk = await preferIdb()
  if (idbOk) {
    try {
      const raw = await idbGet()
      if (raw != null && Array.isArray(raw)) {
        const list = raw.filter(isEventV3)
        if (list.length > 0 || raw.length === 0) {
          clearLegacyLocalStorage()
          return list
        }
      }
    } catch {
      useIdb = false
    }
  }

  const fromLs = readLocalStorageChain()
  if (fromLs.length > 0 && idbOk) {
    try {
      const trimmed = trimEventsToByteBudget(fromLs, MAX_STORE_BYTES)
      await idbPut(trimmed)
      clearLegacyLocalStorage()
      return trimmed
    } catch {
      useIdb = false
    }
  }
  if (fromLs.length > 0) {
    return trimEventsToByteBudget(fromLs, MAX_STORE_BYTES)
  }
  return []
}

/**
 * Persist events (IndexedDB when available, else localStorage). Applies byte-budget trim.
 * @returns The list actually stored (after trim).
 */
export async function saveEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  const trimmed = trimEventsToByteBudget(events, MAX_STORE_BYTES)
  const idbOk = await preferIdb()
  if (idbOk) {
    try {
      await idbPut(trimmed)
      clearLegacyLocalStorage()
      return trimmed
    } catch {
      useIdb = false
    }
  }
  saveToLocalStorage(trimmed)
  return trimmed
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

/**
 * Read events stored in this browser (IndexedDB then localStorage) without migrating or clearing keys.
 * Used to optionally import legacy data after switching to cloud storage.
 */
export async function readBrowserStoredEventsForImport(): Promise<CalendarEvent[]> {
  try {
    if (typeof indexedDB !== 'undefined' && (await preferIdb())) {
      const raw = await idbGet()
      if (raw != null && Array.isArray(raw)) {
        const list = raw.filter(isEventV3)
        if (list.length > 0) return list
      }
    }
  } catch {
    /* ignore */
  }
  return readLocalStorageChain()
}
