package com.vernu.sms.helpers

import android.content.Context
import com.vernu.sms.AppConstants

// Hands out send times so messages keep the configured gap without any
// worker sleeping. Each enqueue reserves the next slot and gets back how
// long its job should wait before running.
object SendSlotScheduler {
    // A slot further ahead than this cannot come from real pacing
    const val MAX_SLOT_AHEAD_MS = 24 * 60 * 60 * 1000L

    data class Slot(val initialDelayMs: Long, val nextSlotMs: Long)

    fun next(storedSlotMs: Long, lastReservedAtMs: Long, nowMs: Long, gapMs: Long): Slot {
        var slot = storedSlotMs
        // A clock that moved backwards, or a corrupt slot, would stall every send
        if (nowMs < lastReservedAtMs || slot > nowMs + MAX_SLOT_AHEAD_MS) slot = nowMs
        val start = maxOf(nowMs, slot)
        return Slot(initialDelayMs = start - nowMs, nextSlotMs = start + gapMs)
    }

    private val lock = Any()

    fun reserve(context: Context, gapMs: Long): Long = synchronized(lock) {
        val now = System.currentTimeMillis()
        val slot = next(
            SharedPreferenceHelper.getSharedPreferenceLong(
                context, AppConstants.SHARED_PREFS_NEXT_SEND_SLOT_MS_KEY, 0L
            ),
            SharedPreferenceHelper.getSharedPreferenceLong(
                context, AppConstants.SHARED_PREFS_LAST_SEND_RESERVED_AT_MS_KEY, 0L
            ),
            now,
            gapMs,
        )
        SharedPreferenceHelper.setSharedPreferenceLong(
            context, AppConstants.SHARED_PREFS_NEXT_SEND_SLOT_MS_KEY, slot.nextSlotMs
        )
        SharedPreferenceHelper.setSharedPreferenceLong(
            context, AppConstants.SHARED_PREFS_LAST_SEND_RESERVED_AT_MS_KEY, now
        )
        slot.initialDelayMs
    }
}
