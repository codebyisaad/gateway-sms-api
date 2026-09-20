package com.vernu.sms.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeliveryHealthRowsTest {
    private val now = 10_000_000L
    private val allGood = DeliveryHealthSnapshot(
        hasSendSmsPermission = true, hasReceiveSmsPermission = true, hasReadPhoneStatePermission = true,
        hasPostNotificationsPermission = true, stickyNotificationEnabled = true, usingLegacyUi = false,
    )

    private fun inputs(snapshot: DeliveryHealthSnapshot = allGood, battery: Boolean? = true, lastHeartbeat: Long? = now - 60_000) =
        HealthInputs(snapshot, battery, powerSaveMode = false, deviceIdleMode = false, sendDelaySeconds = 5,
            lastHeartbeatMs = lastHeartbeat, nowMs = now, manufacturer = "Google", gatewayEnabled = true)

    @Test
    fun aHealthyPhoneHasNoIssues() {
        val rows = DeliveryHealthRows.build(inputs())
        assertEquals(0, DeliveryHealthRows.issueCount(rows))
        assertNull(rows.find { it.id == "oem" })
    }

    @Test
    fun missingSmsPermissionIsRedAndNamed() {
        val rows = DeliveryHealthRows.build(inputs(allGood.copy(hasReceiveSmsPermission = false)))
        val sms = rows.first { it.id == "sms" }
        assertEquals(HealthStatus.RED, sms.status)
        assertTrue(sms.detail.contains("Receive SMS"))
        assertEquals(HealthAction.GRANT_SMS, sms.action)
    }

    @Test
    fun batteryAndStickyAreAmberIssues() {
        val rows = DeliveryHealthRows.build(inputs(allGood.copy(stickyNotificationEnabled = false), battery = false))
        assertEquals(2, DeliveryHealthRows.issueCount(rows))
        assertEquals(HealthAction.OPEN_BATTERY_SETTINGS, rows.first { it.id == "battery" }.action)
        assertEquals(HealthAction.TOGGLE_STICKY, rows.first { it.id == "sticky" }.action)
    }

    @Test
    fun sendDelayUsesThePlaybookNumbers() {
        assertEquals(
            "At 5 seconds, about 12 messages a minute. 500 recipients takes 41 minutes.",
            DeliveryHealthRows.sendDelayRow(5).detail,
        )
        assertEquals(HealthStatus.AMBER, DeliveryHealthRows.sendDelayRow(0).status)
    }

    @Test
    fun checkInAgesFromGreenToRed() {
        assertEquals(HealthStatus.GREEN, DeliveryHealthRows.checkInRow(now - 10 * 60_000, now, true).status)
        assertEquals(HealthStatus.AMBER, DeliveryHealthRows.checkInRow(now - 2 * 3_600_000, now, true).status)
        assertEquals(HealthStatus.RED, DeliveryHealthRows.checkInRow(now - 5 * 3_600_000, now, true).status)
        assertEquals(HealthStatus.RED, DeliveryHealthRows.checkInRow(null, now, true).status)
    }

    @Test
    fun knownPhoneMakersGetTips() {
        val rows = DeliveryHealthRows.build(inputs().copy(manufacturer = "samsung"))
        val oem = rows.first { it.id == "oem" }
        assertEquals("Tips for Samsung phones", oem.title)
        assertEquals(HealthAction.COPY_TIPS, oem.action)
        assertEquals(0, DeliveryHealthRows.issueCount(rows))
    }

    @Test
    fun durationsReadNaturally() {
        assertEquals("under a minute", DeliveryHealthRows.formatDuration(30_000))
        assertEquals("1 minute", DeliveryHealthRows.formatDuration(60_000))
        assertEquals("1 hour 30 min", DeliveryHealthRows.formatDuration(90 * 60_000))
        assertEquals("2 hours", DeliveryHealthRows.formatDuration(120 * 60_000))
    }
}
