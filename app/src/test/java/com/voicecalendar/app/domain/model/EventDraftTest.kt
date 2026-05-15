package com.voicecalendar.app.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class EventDraftTest {

    @Test
    fun newDraft_hasDefaultOneHourDuration() {
        val date = LocalDate.of(2026, 5, 15)
        val draft = EventDraft(
            start = date.atTime(9, 0),
            end = date.atTime(10, 0),
        )
        assertNull(draft.id)
        assertEquals("", draft.title)
        assertEquals(date.atTime(9, 0), draft.start)
        assertEquals(date.atTime(10, 0), draft.end)
    }
}
