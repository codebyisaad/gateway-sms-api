package com.vernu.sms.helpers

import android.Manifest
import com.vernu.sms.AppConstants
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeliveryHealthTest {
    private class FakeProbe(
        override val sdkInt: Int = 34,
        private val granted: Set<String> = emptySet(),
        private val prefs: Map<String, Boolean> = emptyMap(),
    ) : DeliveryHealthProbe {
        override fun isPermissionGranted(permission: String) = permission in granted
        override fun prefBoolean(key: String, default: Boolean) = prefs[key] ?: default
    }

    @Test
    fun reportsEachSmsPermission() {
        val snapshot = DeliveryHealth.evaluate(
            FakeProbe(granted = setOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE))
        )
        assertTrue(snapshot.hasSendSmsPermission)
        assertFalse(snapshot.hasReceiveSmsPermission)
        assertTrue(snapshot.hasReadPhoneStatePermission)
    }

    @Test
    fun notificationPermissionIsImpliedBelowAndroid13() {
        assertTrue(DeliveryHealth.evaluate(FakeProbe(sdkInt = 32)).hasPostNotificationsPermission)
        assertFalse(DeliveryHealth.evaluate(FakeProbe(sdkInt = 33)).hasPostNotificationsPermission)
        assertTrue(
            DeliveryHealth.evaluate(
                FakeProbe(sdkInt = 33, granted = setOf("android.permission.POST_NOTIFICATIONS"))
            ).hasPostNotificationsPermission
        )
    }

    @Test
    fun stickyNotificationDefaultsOff() {
        assertFalse(DeliveryHealth.evaluate(FakeProbe()).stickyNotificationEnabled)
        assertTrue(
            DeliveryHealth.evaluate(
                FakeProbe(prefs = mapOf(AppConstants.SHARED_PREFS_STICKY_NOTIFICATION_ENABLED_KEY to true))
            ).stickyNotificationEnabled
        )
    }

    @Test
    fun legacyUiIsOffUnlessTheUserSwitchedToIt() {
        assertFalse(DeliveryHealth.evaluate(FakeProbe()).usingLegacyUi)
        assertTrue(
            DeliveryHealth.evaluate(
                FakeProbe(prefs = mapOf(AppConstants.SHARED_PREFS_USE_NEW_UI_KEY to false))
            ).usingLegacyUi
        )
    }
}
