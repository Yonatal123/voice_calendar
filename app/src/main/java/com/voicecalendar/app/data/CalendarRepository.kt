package com.voicecalendar.app.data

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.provider.CalendarContract
import com.voicecalendar.app.domain.model.CalendarEvent
import com.voicecalendar.app.domain.model.EventDraft
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CalendarRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val contentResolver get() = context.contentResolver
    private val zoneId: ZoneId get() = ZoneId.systemDefault()

    suspend fun getWritableCalendarId(): Long? = withContext(Dispatchers.IO) {
        val projection = arrayOf(
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.IS_PRIMARY,
            CalendarContract.Calendars.ACCOUNT_TYPE,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
        )
        val selection =
            "(${CalendarContract.Calendars.VISIBLE} = 1) AND " +
                "(${CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL} >= ${CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR})"
        contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            selection,
            null,
            "${CalendarContract.Calendars.IS_PRIMARY} DESC",
        )?.use { cursor ->
            var fallbackId: Long? = null
            while (cursor.moveToNext()) {
                val id = cursor.getLong(0)
                val isPrimary = cursor.getInt(1) == 1
                val accountType = cursor.getString(2) ?: ""
                if (isPrimary && accountType == "com.google") return@withContext id
                if (fallbackId == null) fallbackId = id
            }
            fallbackId
        }
    }

    suspend fun getEventsInRange(
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<CalendarEvent> = withContext(Dispatchers.IO) {
        val startMillis = startDate.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val endMillis = endDate.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli()

        val builder = CalendarContract.Instances.CONTENT_URI.buildUpon()
        ContentUris.appendId(builder, startMillis)
        ContentUris.appendId(builder, endMillis)
        val instancesUri = builder.build()

        val projection = arrayOf(
            CalendarContract.Instances.EVENT_ID,
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.DESCRIPTION,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.CALENDAR_ID,
        )

        contentResolver.query(
            instancesUri,
            projection,
            null,
            null,
            "${CalendarContract.Instances.BEGIN} ASC",
        )?.use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(cursor.toCalendarEvent())
                }
            }
        } ?: emptyList()
    }

    suspend fun getEventsOnDay(date: LocalDate): List<CalendarEvent> =
        getEventsInRange(date, date)

    suspend fun createEvent(draft: EventDraft, calendarId: Long): Result<Long> =
        withContext(Dispatchers.IO) {
            runCatching {
                val values = ContentValues().apply {
                    put(CalendarContract.Events.DTSTART, draft.start.toEpochMilli())
                    put(CalendarContract.Events.DTEND, draft.end.toEpochMilli())
                    put(CalendarContract.Events.TITLE, draft.title.trim())
                    put(CalendarContract.Events.DESCRIPTION, draft.description.trim())
                    put(CalendarContract.Events.CALENDAR_ID, calendarId)
                    put(CalendarContract.Events.EVENT_TIMEZONE, zoneId.id)
                    put(CalendarContract.Events.HAS_ALARM, 0)
                }
                val uri = contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
                    ?: error("Insert returned null URI")
                ContentUris.parseId(uri)
            }
        }

    suspend fun updateEvent(draft: EventDraft): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val eventId = draft.id ?: error("Event id required for update")
            val values = ContentValues().apply {
                put(CalendarContract.Events.DTSTART, draft.start.toEpochMilli())
                put(CalendarContract.Events.DTEND, draft.end.toEpochMilli())
                put(CalendarContract.Events.TITLE, draft.title.trim())
                put(CalendarContract.Events.DESCRIPTION, draft.description.trim())
                put(CalendarContract.Events.EVENT_TIMEZONE, zoneId.id)
            }
            val uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId)
            val updated = contentResolver.update(uri, values, null, null)
            if (updated == 0) error("No rows updated")
        }
    }

    suspend fun deleteEvent(eventId: Long): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId)
            val deleted = contentResolver.delete(uri, null, null)
            if (deleted == 0) error("No rows deleted")
        }
    }

    private fun Cursor.toCalendarEvent(): CalendarEvent {
        val eventId = getLong(getColumnIndexOrThrow(CalendarContract.Instances.EVENT_ID))
        val title = getString(getColumnIndexOrThrow(CalendarContract.Instances.TITLE)) ?: ""
        val description =
            getString(getColumnIndexOrThrow(CalendarContract.Instances.DESCRIPTION)) ?: ""
        val begin = getLong(getColumnIndexOrThrow(CalendarContract.Instances.BEGIN))
        val end = getLong(getColumnIndexOrThrow(CalendarContract.Instances.END))
        val calendarId = getLong(getColumnIndexOrThrow(CalendarContract.Instances.CALENDAR_ID))
        return CalendarEvent(
            id = eventId,
            title = title,
            description = description,
            start = begin.toLocalDateTime(),
            end = end.toLocalDateTime(),
            calendarId = calendarId,
        )
    }

    private fun Long.toLocalDateTime(): LocalDateTime =
        LocalDateTime.ofInstant(Instant.ofEpochMilli(this), zoneId)

    private fun LocalDateTime.toEpochMilli(): Long =
        atZone(zoneId).toInstant().toEpochMilli()
}
