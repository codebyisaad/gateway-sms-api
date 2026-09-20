package com.vernu.sms.ui.messages

import com.vernu.sms.dtos.SmsMessage
import com.vernu.sms.helpers.LogEntry
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

data class TimelineStep(val label: String, val timeMs: Long, val detail: String = "")

// One ordered story per message: what the server recorded plus what this
// phone logged for the same message id.
object ActivityTimeline {
    fun parseIso(iso: String?): Long? {
        if (iso == null) return null
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            (sdf.parse(iso.take(23).padEnd(23, '0')) ?: return null).time
        } catch (e: Exception) {
            null
        }
    }

    fun build(message: SmsMessage, events: List<LogEntry>): List<TimelineStep> {
        val steps = ArrayList<TimelineStep>()
        fun add(label: String, iso: String?) {
            parseIso(iso)?.let { steps += TimelineStep(label, it) }
        }
        if (message.isReceived) {
            add("Received on phone", message.receivedAt)
            add("Uploaded", message.createdAt)
        } else {
            add("Requested", message.requestedAt)
            add("Handed to phone", message.dispatchedAt)
            add("Push received", message.pushReceivedAt)
            add("Send attempted", message.sendAttemptedAt)
            add("Sent", message.sentAt)
            add("Delivered", message.deliveredAt)
            add("Failed", message.failedAt)
        }
        message.id?.let { id ->
            events.filter { it.smsId == id }.forEach { e ->
                steps += TimelineStep(e.event.replace('_', ' '), e.timeMs, e.detail)
            }
        }
        return steps.sortedBy { it.timeMs }
    }

    fun delta(previousMs: Long?, currentMs: Long): String {
        if (previousMs == null) return ""
        val d = (currentMs - previousMs) / 1000
        return when {
            d < 60 -> "+${d}s"
            d < 3600 -> "+${d / 60}m"
            else -> "+${d / 3600}h"
        }
    }
}
