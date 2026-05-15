package com.voicecalendar.app.ui.voice

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.voicecalendar.app.R
import com.voicecalendar.app.data.VoiceRecognitionState

@Composable
fun VoiceInputButton(
    onTranscription: (String, append: Boolean) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: VoiceInputViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val recognitionState = uiState.state
    val voicePrompt = stringResource(R.string.voice_prompt)

    val isListening = recognitionState is VoiceRecognitionState.Listening ||
        recognitionState is VoiceRecognitionState.Partial

    LaunchedEffect(recognitionState) {
        if (recognitionState is VoiceRecognitionState.Success) {
            onTranscription(recognitionState.text, append = true)
            viewModel.reset()
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "mic_pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scale",
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val statusText = when {
            !uiState.hebrewAvailable -> stringResource(R.string.voice_hebrew_unavailable)
            recognitionState is VoiceRecognitionState.Listening -> stringResource(R.string.voice_listening)
            recognitionState is VoiceRecognitionState.Processing -> stringResource(R.string.voice_processing)
            recognitionState is VoiceRecognitionState.Partial -> uiState.partialText
            recognitionState is VoiceRecognitionState.Error -> {
                if (recognitionState.message == "unavailable") {
                    stringResource(R.string.voice_hebrew_unavailable)
                } else {
                    recognitionState.message
                }
            }
            else -> stringResource(R.string.voice_start)
        }

        FilledIconButton(
            onClick = {
                if (isListening) {
                    viewModel.stopListening()
                } else if (uiState.hebrewAvailable) {
                    viewModel.startListening(voicePrompt)
                }
            },
            modifier = Modifier
                .size(56.dp)
                .scale(if (isListening) scale else 1f),
            enabled = uiState.hebrewAvailable,
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = if (isListening) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.primary
                },
            ),
        ) {
            Icon(
                imageVector = if (isListening) Icons.Default.Stop else Icons.Default.Mic,
                contentDescription = stringResource(R.string.voice_start),
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = statusText,
            style = MaterialTheme.typography.bodySmall,
            color = if (recognitionState is VoiceRecognitionState.Error) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
    }
}
