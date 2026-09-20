package com.vernu.sms.helpers

import org.junit.Assert.assertEquals
import org.junit.Test

class SendSlotSchedulerTest {
    private val now = 1_000_000L

    @Test
    fun noGapMeansEveryMessageRunsNow() {
        val first = SendSlotScheduler.next(0, 0, now, 0)
        assertEquals(0, first.initialDelayMs)
        val second = SendSlotScheduler.next(first.nextSlotMs, now, now, 0)
        assertEquals(0, second.initialDelayMs)
    }

    @Test
    fun defaultGapSpacesABurst() {
        val gap = 5_000L
        val first = SendSlotScheduler.next(0, 0, now, gap)
        val second = SendSlotScheduler.next(first.nextSlotMs, now, now, gap)
        val third = SendSlotScheduler.next(second.nextSlotMs, now, now, gap)
        assertEquals(0, first.initialDelayMs)
        assertEquals(5_000, second.initialDelayMs)
        assertEquals(10_000, third.initialDelayMs)
    }

    @Test
    fun aMessageArrivingAfterTheSlotRunsNow() {
        val gap = 5_000L
        val first = SendSlotScheduler.next(0, 0, now, gap)
        val later = SendSlotScheduler.next(first.nextSlotMs, now, now + 60_000, gap)
        assertEquals(0, later.initialDelayMs)
        assertEquals(now + 65_000, later.nextSlotMs)
    }

    @Test
    fun maximumGapStillPaces() {
        val gap = 3_600_000L
        val first = SendSlotScheduler.next(0, 0, now, gap)
        val second = SendSlotScheduler.next(first.nextSlotMs, now, now, gap)
        assertEquals(3_600_000, second.initialDelayMs)
    }

    @Test
    fun legitimateBacklogIsKept() {
        // 2 hours of pacing ahead is a real queue, not corruption
        val slot = SendSlotScheduler.next(now + 2 * 3_600_000L, now, now, 5_000)
        assertEquals(2 * 3_600_000L, slot.initialDelayMs)
    }

    @Test
    fun clockMovedBackwardsResetsTheSlot() {
        val slot = SendSlotScheduler.next(now + 30_000, lastReservedAtMs = now + 10_000, nowMs = now, gapMs = 5_000)
        assertEquals(0, slot.initialDelayMs)
        assertEquals(now + 5_000, slot.nextSlotMs)
    }

    private class MemoryStore(vararg pairs: Pair<String, Long>) : SendSlotScheduler.SlotStore {
        val map = mutableMapOf(*pairs)
        override fun get(key: String) = map[key] ?: 0L
        override fun set(key: String, value: Long) { map[key] = value }
    }

    @Test
    fun aWaitBeyondTheCapIsNotReservedAndChangesNothing() {
        val keys = SendSlotScheduler.EXECUTION
        val store = MemoryStore(keys.slotKey to now + 300_000, keys.lastReservedKey to now)
        val before = store.map.toMap()

        assertEquals(null, SendSlotScheduler.reserveIfWithin(store, keys, 5_000, 120_000, now))
        assertEquals(before, store.map)
    }

    @Test
    fun aWaitWithinTheCapIsReservedAndAdvancesTheSlot() {
        val keys = SendSlotScheduler.EXECUTION
        val store = MemoryStore(keys.slotKey to now + 30_000, keys.lastReservedKey to now)

        assertEquals(30_000L, SendSlotScheduler.reserveIfWithin(store, keys, 5_000, 120_000, now))
        assertEquals(now + 35_000, store.map[keys.slotKey])
        assertEquals(now, store.map[keys.lastReservedKey])
    }

    @Test
    fun slotTooFarAheadResets() {
        val slot = SendSlotScheduler.next(now + SendSlotScheduler.MAX_SLOT_AHEAD_MS + 1, now, now, 5_000)
        assertEquals(0, slot.initialDelayMs)
    }
}
