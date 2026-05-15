package com.voicecalendar.app.navigation

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.voicecalendar.app.ui.calendar.CalendarScreen
import com.voicecalendar.app.ui.onboarding.PermissionsScreen
import com.voicecalendar.app.ui.onboarding.PermissionsViewModel

object Routes {
    const val ONBOARDING = "onboarding"
    const val CALENDAR = "calendar"
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    val permissionsViewModel: PermissionsViewModel = hiltViewModel()
    val onboardingComplete by permissionsViewModel.onboardingComplete
        .collectAsStateWithLifecycle()
    val context = LocalContext.current

    val calendarGranted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_CALENDAR,
    ) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.WRITE_CALENDAR,
        ) == PackageManager.PERMISSION_GRANTED

    val calendarPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        val granted = results.values.all { it }
        if (granted) {
            permissionsViewModel.completeOnboarding()
            navController.navigate(Routes.CALENDAR) {
                popUpTo(Routes.ONBOARDING) { inclusive = true }
            }
        }
    }

    val startDestination = if (onboardingComplete && calendarGranted) {
        Routes.CALENDAR
    } else {
        Routes.ONBOARDING
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {
        composable(Routes.ONBOARDING) {
            PermissionsScreen(
                calendarGranted = calendarGranted,
                onRequestCalendar = {
                    calendarPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.READ_CALENDAR,
                            Manifest.permission.WRITE_CALENDAR,
                        ),
                    )
                },
                onContinue = {
                    permissionsViewModel.completeOnboarding()
                    navController.navigate(Routes.CALENDAR) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.CALENDAR) {
            CalendarScreen()
        }
    }
}
