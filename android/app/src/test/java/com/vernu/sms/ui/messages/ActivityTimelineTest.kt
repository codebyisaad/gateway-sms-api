package com.vernu.sms.ui.messages

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ActivityTimelineTest {
    @Test
    fun parsesServerTimestampsWithAndWithoutFractions() {
        val expected = 1789994096000L
        assertEquals(expected, ActivityTimeline.parseIso("2026-09-21T12:34:56Z"))
        assertEquals(expected, ActivityTimeline.parseIso("2026-09-21T12:34:56.000Z"))
        assertEquals(expected + 123, ActivityTimeline.parseIso("2026-09-21T12:34:56.123Z"))
        assertEquals(expected + 123, ActivityTimeline.parseIso("2026-09-21T12:34:56.1234567Z"))
    }

    @Test
    fun rejectsJunk() {
        assertNull(ActivityTimeline.parseIso(null))
        assertNull(ActivityTimeline.parseIso("yesterday"))
    }

    @Test
    fun deltasReadNaturally() {
        assertEquals("", ActivityTimeline.delta(null, 5_000))
        assertEquals("+2s", ActivityTimeline.delta(1_000, 3_000))
        assertEquals("+3m", ActivityTimeline.delta(0, 200_000))
        assertEquals("+2h", ActivityTimeline.delta(0, 7_200_000))
    }
}
