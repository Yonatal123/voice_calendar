package com.voicecalendar.app.ui.event

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.voicecalendar.app.R
import com.voicecalendar.app.domain.model.CalendarEvent
import com.voicecalendar.app.ui.voice.VoiceInputButton
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventEditorSheet(
    selectedDate: LocalDate,
    existingEvent: CalendarEvent?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    viewModel: EventEditorViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showDeleteDialog by remember { mutableStateOf(false) }
    var micGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> micGranted = granted }

    LaunchedEffect(selectedDate, existingEvent) {
        if (existingEvent != null) {
            viewModel.initForEdit(existingEvent)
        } else {
            viewModel.initForCreate(selectedDate)
        }
    }

    LaunchedEffect(uiState.saved, uiState.deleted) {
        if (uiState.saved || uiState.deleted) {
            onSaved()
            onDismiss()
        }
    }

    val dateTimeFormatter = remember {
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.getDefault())
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(
                text = stringResource(
                    if (uiState.isEditMode) R.string.event_edit else R.string.event_new,
                ),
                style = MaterialTheme.typography.titleLarge,
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = uiState.draft.title,
                onValueChange = viewModel::updateTitle,
                label = { Text(stringResource(R.string.event_title)) },
                isError = uiState.titleError != null,
                supportingText = if (uiState.titleError != null) {
                    { Text(stringResource(R.string.event_title_required)) }
                } else {
                    null
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = uiState.draft.description,
                onValueChange = viewModel::updateDescription,
                label = { Text(stringResource(R.string.event_description)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                minLines = 3,
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (!micGranted) {
                    OutlinedButton(
                        onClick = {
                            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        },
                    ) {
                        Text(stringResource(R.string.voice_start))
                    }
                } else {
                    VoiceInputButton(
                        onTranscription = { text, append ->
                            if (append) viewModel.appendDescription(text)
                            else viewModel.replaceDescription(text)
                        },
                    )
                }
            }

            if (!micGranted) {
                Text(
                    text = stringResource(R.string.voice_permission_denied),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            DateTimePickerRow(
                label = stringResource(R.string.event_start),
                dateTime = uiState.draft.start,
                onDateTimeSelected = viewModel::updateStart,
                formatter = dateTimeFormatter,
            )
            Spacer(modifier = Modifier.height(12.dp))
            DateTimePickerRow(
                label = stringResource(R.string.event_end),
                dateTime = uiState.draft.end,
                onDateTimeSelected = viewModel::updateEnd,
                formatter = dateTimeFormatter,
            )

            if (uiState.errorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.event_error),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.event_cancel))
                }
                Spacer(modifier = Modifier.weight(1f))
                if (uiState.isEditMode) {
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = stringResource(R.string.event_delete),
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                Button(
                    onClick = viewModel::save,
                    enabled = !uiState.isSaving,
                ) {
                    Text(stringResource(R.string.event_save))
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.event_delete_confirm)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.delete()
                    },
                ) {
                    Text(stringResource(R.string.yes))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(stringResource(R.string.no))
                }
            },
        )
    }
}

@Composable
private fun DateTimePickerRow(
    label: String,
    dateTime: LocalDateTime,
    onDateTimeSelected: (LocalDateTime) -> Unit,
    formatter: DateTimeFormatter,
) {
    val context = LocalContext.current

    OutlinedButton(
        onClick = {
            val dateListener = DatePickerDialog.OnDateSetListener { _, year, month, day ->
                val updatedDate = LocalDate.of(year, month + 1, day)
                TimePickerDialog(
                    context,
                    { _, hour, minute ->
                        onDateTimeSelected(updatedDate.atTime(hour, minute))
                    },
                    dateTime.hour,
                    dateTime.minute,
                    true,
                ).show()
            }
            DatePickerDialog(
                context,
                dateListener,
                dateTime.year,
                dateTime.monthValue - 1,
                dateTime.dayOfMonth,
            ).show()
        },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.labelMedium)
            Text(formatter.format(dateTime), style = MaterialTheme.typography.bodyLarge)
        }
    }
}
