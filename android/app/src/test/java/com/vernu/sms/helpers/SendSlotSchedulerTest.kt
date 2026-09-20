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

    @Test
    fun aWaitBeyondTheCapIsNotReserved() {
        // The pure math behind reserveIfWithin: a slot 5 minutes out must not
        // be taken by a job that may only wait 2 minutes
        val slot = SendSlotScheduler.next(now + 300_000, now, now, 5_000)
        assertEquals(300_000, slot.initialDelayMs)
        assertEquals(true, slot.initialDelayMs > 120_000)
    }

    @Test
    fun slotTooFarAheadResets() {
        val slot = SendSlotScheduler.next(now + SendSlotScheduler.MAX_SLOT_AHEAD_MS + 1, now, now, 5_000)
        assertEquals(0, slot.initialDelayMs)
    }
}
