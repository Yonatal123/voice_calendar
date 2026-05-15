package com.voicecalendar.app.data

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject
import javax.inject.Singleton

sealed class VoiceRecognitionState {
    data object Idle : VoiceRecognitionState()
    data object Listening : VoiceRecognitionState()
    data object Processing : VoiceRecognitionState()
    data class Partial(val text: String) : VoiceRecognitionState()
    data class Success(val text: String) : VoiceRecognitionState()
    data class Error(val message: String) : VoiceRecognitionState()
}

@Singleton
class SpeechRecognitionRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val hebrewLocales = listOf("he-IL", "iw-IL")

    fun isSpeechRecognitionAvailable(): Boolean =
        SpeechRecognizer.isRecognitionAvailable(context)

    fun resolveHebrewLocale(): String? {
        if (!isSpeechRecognitionAvailable()) return null
        return hebrewLocales.first()
    }

    fun startListening(prompt: String): Flow<VoiceRecognitionState> = callbackFlow {
        if (!isSpeechRecognitionAvailable()) {
            trySend(VoiceRecognitionState.Error("Speech recognition unavailable"))
            close()
            return@callbackFlow
        }

        val locale = resolveHebrewLocale() ?: hebrewLocales.first()
        val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        val intent = createRecognizerIntent(locale, prompt)

        val listener = object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                trySend(VoiceRecognitionState.Listening)
            }

            override fun onBeginningOfSpeech() {
                trySend(VoiceRecognitionState.Listening)
            }

            override fun onRmsChanged(rmsdB: Float) = Unit

            override fun onBufferReceived(buffer: ByteArray?) = Unit

            override fun onEndOfSpeech() {
                trySend(VoiceRecognitionState.Processing)
            }

            override fun onError(error: Int) {
                val message = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
                    else -> "Recognition error ($error)"
                }
                trySend(VoiceRecognitionState.Error(message))
                close()
            }

            override fun onResults(results: Bundle?) {
                val matches = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                if (!matches.isNullOrEmpty()) {
                    trySend(VoiceRecognitionState.Success(matches))
                } else {
                    trySend(VoiceRecognitionState.Error("No speech recognized"))
                }
                close()
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                if (!partial.isNullOrEmpty()) {
                    trySend(VoiceRecognitionState.Partial(partial))
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        }

        recognizer.setRecognitionListener(listener)
        trySend(VoiceRecognitionState.Idle)
        recognizer.startListening(intent)

        awaitClose {
            recognizer.cancel()
            recognizer.destroy()
        }
    }.flowOn(Dispatchers.Main)

    private fun createRecognizerIntent(
        locale: String,
        prompt: String = "",
    ): Intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, locale)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        if (prompt.isNotEmpty()) {
            putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
        }
    }
}
