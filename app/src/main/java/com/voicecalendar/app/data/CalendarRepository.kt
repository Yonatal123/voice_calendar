package com.voicecalendar.app.data

import com.voicecalendar.app.data.local.AppDatabase
import com.voicecalendar.app.data.local.LocalEventEntity
import com.voicecalendar.app.domain.model.CalendarEvent
import com.voicecalendar.app.domain.model.EventDraft
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
    database: AppDatabase,
) {
    private val dao = database.eventDao()
    private val zoneId: ZoneId = ZoneId.systemDefault()

    suspend fun getEventsInRange(
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<CalendarEvent> = withContext(Dispatchers.IO) {
        val rangeStart = startDate.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val rangeEnd = endDate.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli()
        dao.getEventsOverlappingRange(rangeStart, rangeEnd).map { it.toCalendarEvent() }
    }

    suspend fun getEventsOnDay(date: LocalDate): List<CalendarEvent> =
        getEventsInRange(date, date)

    suspend fun createEvent(draft: EventDraft): Result<Long> = withContext(Dispatchers.IO) {
        runCatching {
            val entity = LocalEventEntity(
                title = draft.title.trim(),
                description = draft.description.trim(),
                startEpochMilli = draft.start.toEpochMilli(),
                endEpochMilli = draft.end.toEpochMilli(),
            )
            dao.insert(entity)
        }
    }

    suspend fun updateEvent(draft: EventDraft): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val eventId = draft.id ?: error("Event id required for update")
            val existing = dao.getById(eventId) ?: error("Event not found")
            dao.update(
                existing.copy(
                    title = draft.title.trim(),
                    description = draft.description.trim(),
                    startEpochMilli = draft.start.toEpochMilli(),
                    endEpochMilli = draft.end.toEpochMilli(),
                ),
            )
        }
    }

    suspend fun deleteEvent(eventId: Long): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val existing = dao.getById(eventId) ?: error("Event not found")
            dao.delete(existing)
        }
    }

    private fun LocalEventEntity.toCalendarEvent(): CalendarEvent =
        CalendarEvent(
            id = id,
            title = title,
            description = description,
            start = startEpochMilli.toLocalDateTime(),
            end = endEpochMilli.toLocalDateTime(),
        )

    private fun Long.toLocalDateTime(): LocalDateTime =
        LocalDateTime.ofInstant(Instant.ofEpochMilli(this), zoneId)

    private fun LocalDateTime.toEpochMilli(): Long =
        atZone(zoneId).toInstant().toEpochMilli()
}
