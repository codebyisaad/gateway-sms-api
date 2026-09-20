package com.vernu.sms.helpers

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LogEntry(val timeMs: Long, val event: String, val detail: String, val smsId: String?)

// A short record of what the app did, kept on the phone for the Activity
// screen and the diagnostics export. Never holds message text or the API
// key, and long digit runs are masked before they are written.
object DeviceLog {
    private const val TAG = "DeviceLog"
    const val MAX_ENTRIES = 500
    private const val FILE_NAME = "device-log.txt"
    private const val REWRITE_EVERY = 100

    private val lock = Any()
    private val _entries = MutableStateFlow<List<LogEntry>>(emptyList())
    val entries: StateFlow<List<LogEntry>> = _entries.asStateFlow()
    private var loaded = false
    private var appendsSinceRewrite = 0

    private val digitRun = Regex("\\d{7,}")

    fun redact(text: String): String =
        digitRun.replace(text) { m -> "…" + m.value.takeLast(4) }

    fun trim(list: List<LogEntry>): List<LogEntry> =
        if (list.size <= MAX_ENTRIES) list else list.takeLast(MAX_ENTRIES)

    fun formatLine(e: LogEntry): String =
        listOf(e.timeMs.toString(), e.event, e.smsId ?: "", e.detail.replace('\t', ' ').replace('\n', ' '))
            .joinToString("\t")

    fun parseLine(line: String): LogEntry? {
        val parts = line.split('\t', limit = 4)
        if (parts.size < 2) return null
        val time = parts[0].toLongOrNull() ?: return null
        return LogEntry(time, parts[1], parts.getOrElse(3) { "" }, parts.getOrNull(2)?.takeIf { it.isNotEmpty() })
    }

    fun log(context: Context, event: String, detail: String = "", smsId: String? = null) {
        val entry = LogEntry(System.currentTimeMillis(), event, redact(detail), smsId)
        try {
            synchronized(lock) {
                ensureLoaded(context)
                val next = trim(_entries.value + entry)
                _entries.value = next
                val file = file(context)
                if (++appendsSinceRewrite >= REWRITE_EVERY) {
                    file.writeText(next.joinToString("\n", postfix = "\n") { formatLine(it) })
                    appendsSinceRewrite = 0
                } else {
                    file.appendText(formatLine(entry) + "\n")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not write log entry: ${e.message}")
        }
    }

    fun load(context: Context): List<LogEntry> = synchronized(lock) {
        ensureLoaded(context)
        _entries.value
    }

    fun export(context: Context, header: String): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        val lines = load(context).map { e ->
            "${fmt.format(Date(e.timeMs))}  ${e.event}${e.smsId?.let { "  [$it]" } ?: ""}  ${e.detail}"
        }
        return header + "\n\n" + lines.joinToString("\n")
    }

    private fun file(context: Context) = File(context.filesDir, FILE_NAME)

    private fun ensureLoaded(context: Context) {
        if (loaded) return
        loaded = true
        try {
            val f = file(context)
            if (f.exists()) {
                _entries.value = trim(f.readLines().mapNotNull { parseLine(it) })
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not read log: ${e.message}")
        }
    }
}
