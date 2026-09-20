package com.vernu.sms.database

import android.content.Context

interface DedupeStorage {
    fun all(): Map<String, String>
    fun put(key: String, value: String)
    fun remove(key: String)
}

// Remembers which messages this phone has handed to the radio, so a push
// delivered twice, or a message the server offers again, is sent once.
// A message that was received but never sent is not a duplicate.
class SmsDedupeStore(
    private val storage: DedupeStorage,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    companion object {
        const val TTL_MS = 7 * 24 * 60 * 60 * 1000L
        private const val PREF_FILE = "SMS_DEDUPE"

        @JvmStatic
        fun get(context: Context) = SmsDedupeStore(SharedPreferencesStorage(context))
    }

    private fun key(smsId: String, phone: String) = "$smsId:$phone"

    // value is "<firstSeen>|<sentAt or empty>"
    private fun parse(value: String?): Pair<Long, Long?>? {
        val parts = value?.split('|') ?: return null
        val firstSeen = parts.getOrNull(0)?.toLongOrNull() ?: return null
        val sentAt = parts.getOrNull(1)?.toLongOrNull()
        return firstSeen to sentAt
    }

    fun wasSent(smsId: String, phone: String): Boolean =
        parse(storage.all()[key(smsId, phone)])?.second != null

    fun markSeen(smsId: String, phone: String) {
        val k = key(smsId, phone)
        if (storage.all()[k] == null) storage.put(k, "${clock()}|")
        prune()
    }

    fun markSent(smsId: String, phone: String) {
        val k = key(smsId, phone)
        val firstSeen = parse(storage.all()[k])?.first ?: clock()
        storage.put(k, "$firstSeen|${clock()}")
    }

    fun prune() {
        val cutoff = clock() - TTL_MS
        for ((k, v) in storage.all()) {
            val firstSeen = parse(v)?.first
            if (firstSeen == null || firstSeen < cutoff) storage.remove(k)
        }
    }

    private class SharedPreferencesStorage(context: Context) : DedupeStorage {
        private val prefs = context.applicationContext.getSharedPreferences(PREF_FILE, 0)

        @Suppress("UNCHECKED_CAST")
        override fun all(): Map<String, String> = prefs.all as Map<String, String>
        override fun put(key: String, value: String) = prefs.edit().putString(key, value).apply()
        override fun remove(key: String) = prefs.edit().remove(key).apply()
    }
}
