package com.vernu.sms.ui.settings

import android.app.Application
import android.content.Context
import android.os.Build
import android.os.PowerManager
import androidx.lifecycle.AndroidViewModel
import com.vernu.sms.AppConstants
import com.vernu.sms.TextbeeUtils
import com.vernu.sms.helpers.DeliveryHealth
import com.vernu.sms.helpers.DeliveryHealthRows
import com.vernu.sms.helpers.HealthInputs
import com.vernu.sms.helpers.HealthRow
import com.vernu.sms.helpers.SharedPreferenceHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class DeliveryHealthViewModel(app: Application) : AndroidViewModel(app) {
    private val context get() = getApplication<Application>().applicationContext

    private val _rows = MutableStateFlow<List<HealthRow>>(emptyList())
    val rows: StateFlow<List<HealthRow>> = _rows.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _rows.value = DeliveryHealthRows.build(collect(context))
    }

    fun setStickyNotification(enabled: Boolean) {
        SharedPreferenceHelper.setSharedPreferenceBoolean(
            context, AppConstants.SHARED_PREFS_STICKY_NOTIFICATION_ENABLED_KEY, enabled
        )
        try {
            if (enabled) TextbeeUtils.startStickyNotificationService(context)
            else TextbeeUtils.stopStickyNotificationService(context)
        } catch (e: Exception) {
            TextbeeUtils.logException(e, "Sticky notification toggle from health screen failed")
        }
        refresh()
    }

    companion object {
        fun collect(context: Context): HealthInputs {
            val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val ignoring = try {
                power?.isIgnoringBatteryOptimizations(context.packageName)
            } catch (e: Exception) {
                null
            }
            return HealthInputs(
                snapshot = DeliveryHealth.evaluate(context),
                ignoringBatteryOptimizations = ignoring,
                powerSaveMode = power?.isPowerSaveMode ?: false,
                deviceIdleMode = power?.isDeviceIdleMode ?: false,
                sendDelaySeconds = SharedPreferenceHelper.getSharedPreferenceInt(
                    context, AppConstants.SHARED_PREFS_SMS_SEND_DELAY_SECONDS_KEY,
                    AppConstants.DEFAULT_SMS_SEND_DELAY_SECONDS
                ),
                lastHeartbeatMs = SharedPreferenceHelper.getSharedPreferenceString(
                    context, AppConstants.SHARED_PREFS_LAST_HEARTBEAT_MS_KEY, ""
                )?.toLongOrNull(),
                nowMs = System.currentTimeMillis(),
                manufacturer = Build.MANUFACTURER ?: "",
                gatewayEnabled = SharedPreferenceHelper.getSharedPreferenceBoolean(
                    context, AppConstants.SHARED_PREFS_GATEWAY_ENABLED_KEY, false
                ),
            )
        }

        fun issueCount(context: Context): Int =
            DeliveryHealthRows.issueCount(DeliveryHealthRows.build(collect(context)))
    }
}
