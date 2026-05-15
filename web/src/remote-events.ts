import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalendarEvent } from './types'

type Row = {
  id: string
  title: string
  description: string
  start_at: string
  end_at: string
}

function rowToEvent(row: Row): CalendarEvent {
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    start: row.start_at,
    end: row.end_at,
  }
}

export async function fetchRemoteEvents(sb: SupabaseClient): Promise<CalendarEvent[]> {
  const { data, error } = await sb
    .from('calendar_events')
    .select('id, title, description, start_at, end_at')
    .order('start_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(rowToEvent)
}

export async function upsertRemoteEvent(
  sb: SupabaseClient,
  userId: string,
  ev: CalendarEvent,
): Promise<void> {
  const { error } = await sb.from('calendar_events').upsert(
    {
      id: ev.id,
      user_id: userId,
      title: ev.title,
      description: ev.description,
      start_at: ev.start,
      end_at: ev.end,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function deleteRemoteEvent(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from('calendar_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
