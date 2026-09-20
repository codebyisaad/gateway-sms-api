package com.vernu.sms.helpers

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RecoveryPollTest {
    private val now = 10_000_000L

    @Test
    fun neverPollsWhenTheServerHasNotSwitchedItOn() {
        assertFalse(RecoveryPoll.shouldPoll(enabled = false, lastPollMs = 0, nowMs = now))
    }

    @Test
    fun pollsAtMostOnceInTheInterval() {
        assertTrue(RecoveryPoll.shouldPoll(true, 0, now))
        assertFalse(RecoveryPoll.shouldPoll(true, now - RecoveryPoll.MIN_INTERVAL_MS + 1, now))
        assertTrue(RecoveryPoll.shouldPoll(true, now - RecoveryPoll.MIN_INTERVAL_MS, now))
    }

    @Test
    fun clockMovedBackwardsDoesNotBlockPolling() {
        assertTrue(RecoveryPoll.shouldPoll(true, lastPollMs = now + 60_000, nowMs = now))
    }
}
