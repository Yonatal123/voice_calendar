package com.voicecalendar.app.ui.voice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voicecalendar.app.data.SpeechRecognitionRepository
import com.voicecalendar.app.data.VoiceRecognitionState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VoiceUiState(
    val state: VoiceRecognitionState = VoiceRecognitionState.Idle,
    val partialText: String = "",
    val hebrewAvailable: Boolean = true,
)

@HiltViewModel
class VoiceInputViewModel @Inject constructor(
    private val speechRepository: SpeechRecognitionRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VoiceUiState())
    val uiState: StateFlow<VoiceUiState> = _uiState.asStateFlow()

    private var listeningJob: Job? = null

    init {
        val available = speechRepository.isSpeechRecognitionAvailable()
        val locale = speechRepository.resolveHebrewLocale()
        _uiState.update {
            it.copy(
                hebrewAvailable = available && locale != null,
            )
        }
    }

    fun startListening(prompt: String) {
        if (!speechRepository.isSpeechRecognitionAvailable()) {
            _uiState.update {
                it.copy(state = VoiceRecognitionState.Error("unavailable"))
            }
            return
        }
        listeningJob?.cancel()
        listeningJob = viewModelScope.launch {
            speechRepository.startListening(prompt).collect { recognitionState ->
                _uiState.update { current ->
                    when (recognitionState) {
                        is VoiceRecognitionState.Partial -> current.copy(
                            state = recognitionState,
                            partialText = recognitionState.text,
                        )
                        is VoiceRecognitionState.Success -> current.copy(
                            state = recognitionState,
                            partialText = recognitionState.text,
                        )
                        else -> current.copy(state = recognitionState)
                    }
                }
            }
        }
    }

    fun stopListening() {
        listeningJob?.cancel()
        listeningJob = null
        _uiState.update {
            VoiceUiState(hebrewAvailable = it.hebrewAvailable)
        }
    }

    fun reset() {
        stopListening()
    }
}
