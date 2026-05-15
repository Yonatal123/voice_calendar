package com.voicecalendar.app.ui.event

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voicecalendar.app.data.CalendarRepository
import com.voicecalendar.app.domain.model.CalendarEvent
import com.voicecalendar.app.domain.model.EventDraft
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import javax.inject.Inject

data class EventEditorUiState(
    val draft: EventDraft = EventDraft(),
    val isEditMode: Boolean = false,
    val isSaving: Boolean = false,
    val titleError: String? = null,
    val errorMessage: String? = null,
    val saved: Boolean = false,
    val deleted: Boolean = false,
)

@HiltViewModel
class EventEditorViewModel @Inject constructor(
    private val calendarRepository: CalendarRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(EventEditorUiState())
    val uiState: StateFlow<EventEditorUiState> = _uiState.asStateFlow()

    fun initForCreate(selectedDate: LocalDate) {
        val start = selectedDate.atTime(9, 0)
        _uiState.update {
            EventEditorUiState(
                draft = EventDraft(start = start, end = start.plusHours(1)),
                isEditMode = false,
            )
        }
    }

    fun initForEdit(event: CalendarEvent) {
        _uiState.update {
            EventEditorUiState(
                draft = EventDraft(
                    id = event.id,
                    title = event.title,
                    description = event.description,
                    start = event.start,
                    end = event.end,
                ),
                isEditMode = true,
            )
        }
    }

    fun updateTitle(title: String) {
        _uiState.update { it.copy(draft = it.draft.copy(title = title), titleError = null) }
    }

    fun updateDescription(description: String) {
        _uiState.update { it.copy(draft = it.draft.copy(description = description)) }
    }

    fun appendDescription(text: String) {
        _uiState.update { state ->
            val current = state.draft.description
            val updated = if (current.isBlank()) text else "$current\n$text"
            state.copy(draft = state.draft.copy(description = updated))
        }
    }

    fun replaceDescription(text: String) {
        _uiState.update { it.copy(draft = it.draft.copy(description = text)) }
    }

    fun updateStart(dateTime: LocalDateTime) {
        _uiState.update { state ->
            val end = if (state.draft.end.isBefore(dateTime)) {
                dateTime.plusHours(1)
            } else {
                state.draft.end
            }
            state.copy(draft = state.draft.copy(start = dateTime, end = end))
        }
    }

    fun updateEnd(dateTime: LocalDateTime) {
        _uiState.update { it.copy(draft = it.draft.copy(end = dateTime)) }
    }

    fun save() {
        val draft = _uiState.value.draft
        if (draft.title.isBlank()) {
            _uiState.update { it.copy(titleError = "required") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            val result = if (draft.id != null) {
                calendarRepository.updateEvent(draft)
            } else {
                calendarRepository.createEvent(draft).map { }
            }
            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isSaving = false, saved = true) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isSaving = false, errorMessage = error.message)
                    }
                },
            )
        }
    }

    fun delete() {
        val eventId = _uiState.value.draft.id ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            calendarRepository.deleteEvent(eventId).fold(
                onSuccess = {
                    _uiState.update { it.copy(isSaving = false, deleted = true) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(isSaving = false, errorMessage = error.message)
                    }
                },
            )
        }
    }

    fun consumeSaved() {
        _uiState.update { it.copy(saved = false) }
    }

    fun consumeDeleted() {
        _uiState.update { it.copy(deleted = false) }
    }
}
