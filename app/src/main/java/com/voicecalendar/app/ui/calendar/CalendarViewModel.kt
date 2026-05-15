package com.voicecalendar.app.ui.calendar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voicecalendar.app.data.CalendarRepository
import com.voicecalendar.app.domain.model.CalendarEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

data class CalendarUiState(
    val currentMonth: YearMonth = YearMonth.now(),
    val selectedDate: LocalDate = LocalDate.now(),
    val eventsInMonth: List<CalendarEvent> = emptyList(),
    val eventsOnSelectedDay: List<CalendarEvent> = emptyList(),
    val datesWithEvents: Set<LocalDate> = emptySet(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val calendarId: Long? = null,
    val noCalendarAvailable: Boolean = false,
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val calendarRepository: CalendarRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CalendarUiState())
    val uiState: StateFlow<CalendarUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val calendarId = calendarRepository.getWritableCalendarId()
            _uiState.update {
                it.copy(
                    calendarId = calendarId,
                    noCalendarAvailable = calendarId == null,
                )
            }
            if (calendarId != null) {
                loadMonth(_uiState.value.currentMonth)
            }
        }
    }

    fun selectDate(date: LocalDate) {
        _uiState.update { state ->
            val dayEvents = state.eventsInMonth.filter { event ->
                !event.start.toLocalDate().isAfter(date) &&
                    !event.end.toLocalDate().isBefore(date)
            }
            state.copy(selectedDate = date, eventsOnSelectedDay = dayEvents)
        }
    }

    fun goToToday() {
        val today = LocalDate.now()
        val month = YearMonth.from(today)
        _uiState.update { it.copy(currentMonth = month, selectedDate = today) }
        loadMonth(month)
    }

    fun previousMonth() {
        val month = _uiState.value.currentMonth.minusMonths(1)
        _uiState.update { it.copy(currentMonth = month) }
        loadMonth(month)
    }

    fun nextMonth() {
        val month = _uiState.value.currentMonth.plusMonths(1)
        _uiState.update { it.copy(currentMonth = month) }
        loadMonth(month)
    }

    fun refresh() {
        loadMonth(_uiState.value.currentMonth)
    }

    fun setMonth(month: YearMonth) {
        if (month == _uiState.value.currentMonth) return
        _uiState.update { it.copy(currentMonth = month) }
        loadMonth(month)
    }

    private fun loadMonth(month: YearMonth) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching {
                val start = month.atDay(1)
                val end = month.atEndOfMonth()
                calendarRepository.getEventsInRange(start, end)
            }.onSuccess { events ->
                val selected = _uiState.value.selectedDate
                val datesWithEvents = events
                    .flatMap { event ->
                        generateSequence(event.start.toLocalDate()) { date ->
                            val next = date.plusDays(1)
                            if (next.isAfter(event.end.toLocalDate())) null else next
                        }.toList()
                    }
                    .toSet()
                val dayEvents = events.filter { event ->
                    !event.start.toLocalDate().isAfter(selected) &&
                        !event.end.toLocalDate().isBefore(selected)
                }
                _uiState.update {
                    it.copy(
                        eventsInMonth = events,
                        eventsOnSelectedDay = dayEvents,
                        datesWithEvents = datesWithEvents,
                        isLoading = false,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message,
                    )
                }
            }
        }
    }
}
