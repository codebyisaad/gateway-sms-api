package com.vernu.sms.database

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsDedupeStoreTest {
    private class MemoryStorage : DedupeStorage {
        val map = LinkedHashMap<String, String>()
        override fun all(): Map<String, String> = map.toMap()
        override fun put(key: String, value: String) { map[key] = value }
        override fun remove(key: String) { map.remove(key) }
    }

    private var now = 1_000_000L
    private val storage = MemoryStorage()
    private val store = SmsDedupeStore(storage) { now }

    @Test
    fun seenButNotSentMustSendAgain() {
        store.markSeen("a", "+15550100")
        assertFalse(store.wasSent("a", "+15550100"))
    }

    @Test
    fun sentIsSkipped() {
        store.markSeen("a", "+15550100")
        store.markSent("a", "+15550100")
        assertTrue(store.wasSent("a", "+15550100"))
        assertFalse(store.wasSent("a", "+15550101"))
    }

    @Test
    fun markSentWithoutSeenStillRecords() {
        store.markSent("b", "+15550100")
        assertTrue(store.wasSent("b", "+15550100"))
    }

    @Test
    fun markSeenKeepsTheFirstSeenTime() {
        store.markSeen("a", "+15550100")
        now += 1_000
        store.markSeen("a", "+15550100")
        assertEquals("1000000|", storage.map["a:+15550100"])
    }

    @Test
    fun entriesOlderThanSevenDaysArePruned() {
        store.markSent("old", "+15550100")
        now += SmsDedupeStore.TTL_MS + 1
        store.markSeen("new", "+15550100")
        assertFalse(store.wasSent("old", "+15550100"))
        assertEquals(setOf("new:+15550100"), storage.map.keys)
    }
}
