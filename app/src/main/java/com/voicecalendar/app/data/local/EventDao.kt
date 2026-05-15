package com.voicecalendar.app.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update

@Dao
interface EventDao {
    @Query(
        """
        SELECT * FROM events
        WHERE startEpochMilli < :rangeEndExclusive
        AND endEpochMilli > :rangeStartInclusive
        ORDER BY startEpochMilli ASC
        """,
    )
    suspend fun getEventsOverlappingRange(
        rangeStartInclusive: Long,
        rangeEndExclusive: Long,
    ): List<LocalEventEntity>

    @Insert
    suspend fun insert(entity: LocalEventEntity): Long

    @Update
    suspend fun update(entity: LocalEventEntity)

    @Delete
    suspend fun delete(entity: LocalEventEntity)

    @Query("SELECT * FROM events WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): LocalEventEntity?
}
