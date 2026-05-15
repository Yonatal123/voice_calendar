package com.voicecalendar.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.voicecalendar.app.ui.calendar.CalendarScreen

object Routes {
    const val CALENDAR = "calendar"
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Routes.CALENDAR,
    ) {
        composable(Routes.CALENDAR) {
            CalendarScreen()
        }
    }
}
