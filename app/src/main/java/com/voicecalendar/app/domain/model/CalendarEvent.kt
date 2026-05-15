package com.voicecalendar.app.domain.model

import java.time.LocalDate
import java.time.LocalDateTime

data class CalendarEvent(
    val id: Long,
    val title: String,
    val description: String,
    val start: LocalDateTime,
    val end: LocalDateTime,
    val calendarId: Long,
)

data class EventDraft(
    val id: Long? = null,
    val title: String = "",
    val description: String = "",
    val start: LocalDateTime = LocalDate.now().atTime(9, 0),
    val end: LocalDateTime = LocalDate.now().atTime(10, 0),
)
