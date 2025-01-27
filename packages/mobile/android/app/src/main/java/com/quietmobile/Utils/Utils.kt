package com.quietmobile.Utils

import android.content.Context
import android.util.Log
import com.quietmobile.Utils.Const.TAG_NOTICE
import java.io.*
import java.net.ConnectException
import java.net.InetSocketAddress
import java.net.Socket
import java.security.SecureRandom
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

object Utils {
    fun writeToFile(file: String, data: String, context: Context) {
        try {
            val outputStreamWriter =
                OutputStreamWriter(context.openFileOutput(file, Context.MODE_APPEND))
            outputStreamWriter.append("$data \n")
            outputStreamWriter.close()
        } catch (e: IOException) {
            Log.e("Worker", "File write failed at: $e")
        }
    }

    fun createDirectory(context: Context): String {
        val dataDirectory = File(context.filesDir, "backend/files3")
        dataDirectory.mkdirs()

        return dataDirectory.absolutePath
    }

    @JvmStatic
    fun generateRandomString(length: Int): String {
        val CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        val secureRandom = SecureRandom()
        val randomString = StringBuilder(length)

        repeat(length) {
            val randomIndex = secureRandom.nextInt(CHARACTERS.length)
            randomString.append(CHARACTERS[randomIndex])
        }

        return randomString.toString()
    }

    @JvmStatic
    suspend fun getOpenPort(starting: Int) = suspendCoroutine<Int> { continuation ->
        val port = checkPort(starting)
        continuation.resume(port)
    }

    private fun checkPort(port: Int): Int {
        var isPortUsed = true
        var _port = port
        while (isPortUsed) {
            isPortUsed = isPortOpen("127.0.0.1", _port, 500)
            if (isPortUsed) {
                _port++
            }
        }
        return _port
    }

    private fun isPortOpen(ip: String?, port: Int, timeout: Int): Boolean {
        return try {
            val socket = Socket()
            socket.connect(InetSocketAddress(ip, port), timeout)
            socket.close()
            true
        } catch (ce: ConnectException) {
            false
        } catch (ex: java.lang.Exception) {
            false
        }
    }

    @JvmStatic
    fun truncate(message: String, length: Int): String? {
        return if (message.length > length) {
            String.format("%s...", message.substring(0, length))
        } else {
            message
        }
    }

}
