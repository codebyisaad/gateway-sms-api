package com.vernu.sms.helpers

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateNotifierTest {
    @Test
    fun notifiesOnceForANewerRelease() {
        assertTrue(UpdateNotifier.shouldNotify(enabled = true, latestCode = 20, installedCode = 19, lastNotifiedCode = 0))
        assertFalse(UpdateNotifier.shouldNotify(enabled = true, latestCode = 20, installedCode = 19, lastNotifiedCode = 20))
    }

    @Test
    fun staysQuietWhenUpToDateOrSwitchedOff() {
        assertFalse(UpdateNotifier.shouldNotify(enabled = true, latestCode = 19, installedCode = 19, lastNotifiedCode = 0))
        assertFalse(UpdateNotifier.shouldNotify(enabled = true, latestCode = 18, installedCode = 19, lastNotifiedCode = 0))
        assertFalse(UpdateNotifier.shouldNotify(enabled = false, latestCode = 20, installedCode = 19, lastNotifiedCode = 0))
    }
}
