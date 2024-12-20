package com.quietmobile.Backend;

import android.content.Context
import android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.quietmobile.BuildConfig
import com.quietmobile.Communication.CommunicationModule
import com.quietmobile.MainApplication
import com.quietmobile.Notification.NotificationHandler
import com.quietmobile.R
import com.quietmobile.Utils.Const
import com.quietmobile.Utils.Utils
import com.quietmobile.Utils.isAppOnForeground
import io.socket.client.IO
import io.socket.emitter.Emitter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONException
import org.json.JSONObject
import java.util.concurrent.ThreadLocalRandom


class BackendWorker(private val context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {

    private var running: Boolean = false

    private var nodeProject = NodeProjectManager(applicationContext)

    // Use dedicated class for composing and displaying notifications
    private lateinit var notificationHandler: NotificationHandler

    companion object {
        init {
            System.loadLibrary("own-native-lib")
            System.loadLibrary("node")
        }
    }

    private fun createForegroundInfo(): ForegroundInfo {

        // This PendingIntent can be used to cancel the worker
        // val intent = WorkManager.getInstance(applicationContext)
        //     .createCancelPendingIntent(id)

        val title = if (!BuildConfig.DEBUG) {
            applicationContext.getString(R.string.app_name)
        } else {
            applicationContext.getString(R.string.debug_app_name)
        }

        val icon = if (!BuildConfig.DEBUG) {
            R.drawable.ic_notification
        } else {
            R.drawable.ic_notification_dev
        }

        val notification = NotificationCompat.Builder(applicationContext,
            Const.FOREGROUND_SERVICE_NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setTicker("Quiet")
            .setContentText("Backend is running")
            .setSmallIcon(icon)
            // Add the cancel action to the notification which can
            // be used to cancel the worker
            // .addAction(android.R.drawable.ic_delete, "cancel", intent)
            .build()

        val id = ThreadLocalRandom.current().nextInt(0, 9000 + 1)

        val foregroundInfo: ForegroundInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(id, notification, FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(id, notification)
        }

        return foregroundInfo
    }

    override suspend fun doWork(): Result {
        /* This is a simple workaround for the problem of firing doWork() method twice
           I see people on the internet have similar problems but it seems like there's no official solution
           https://stackoverflow.com/questions/59724922/workmanager-dowork-getting-fired-twice */
        if (running) return Result.success()
        running = true

        setForegroundAsync(createForegroundInfo())

        withContext(Dispatchers.IO) {

            // Get and store data port for usage in methods across the app
            val socketPort = Utils.getOpenPort(11000)
            val socketIOSecret = Utils.generateRandomString(20)

            (applicationContext as MainApplication).setSocketPort(socketPort)
            (applicationContext as MainApplication).setSocketIOSecret(socketIOSecret)

            // Init nodejs project
            launch {
                nodeProject.init()
            }

            launch {
                notificationHandler = NotificationHandler(context)
                subscribePushNotifications(socketPort, socketIOSecret)
            }

            val dataPath = Utils.createDirectory(context)

            val appInfo = context.packageManager.getApplicationInfo(context.packageName, 0)
            val torBinary = appInfo.nativeLibraryDir + "/libtor.so"
            
            val platform = "mobile"

            launch {
                /*
                 * The point of this delay is to prevent startup race condition
                 * which occurs particularly often when running Detox tests
                 * https://github.com/TryQuiet/quiet/issues/2214
                 */
                delay(500)
                startNodeProjectWithArguments("bundle.cjs --torBinary $torBinary --dataPath $dataPath --dataPort $socketPort --platform $platform --socketIOSecret $socketIOSecret")
            }
        }

        println("FINISHING BACKEND WORKER")

        CommunicationModule.handleIncomingEvents(
            CommunicationModule.BACKEND_CLOSED_CHANNEL,
            "",
            ""
        )

        // Indicate whether the work finished successfully with the Result
        return Result.success()
    }

    private external fun startNodeWithArguments(
        arguments: Array<String?>?,
        modulesPath: String?
    ): Int?

    @Throws(Exception::class)
    fun startNodeProjectWithArguments(input: String) {
        val args: MutableList<String> = ArrayList(listOf(*input.split(" ").toTypedArray()))

        val scriptPath = nodeProject.projectPath + '/' + args[0]

        // Remove script file name from arguments list
        args.removeAt(0)

        val command: MutableList<String> = ArrayList()
        command.add("node")
        command.add("--experimental-global-customevent")
        command.add(scriptPath)
        command.addAll(args)

        // Do not continue if nodejs project codebase is not yet accessible
        nodeProject.waitForInit()

        startNodeWithArguments(
            command.toTypedArray(),
            "${nodeProject.projectPath}/${nodeProject.builtinModulesPath}"
        )
    }

    private fun subscribePushNotifications(port: Int, secret: String) {
        val encodedSecret = Base64.encodeToString(secret.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        val options = IO.Options()
        val headers = mutableMapOf<String, List<String>>()
        headers["Authorization"] = listOf("Basic $encodedSecret")
        options.extraHeaders = headers

        val webSocketClient = IO.socket("http://127.0.0.1:$port", options)
        // Listen for events sent from nodejs
        webSocketClient.on("pushNotification", onPushNotification)
        // Client won't connect by itself (`connect()` method has to be called manually)
        webSocketClient.connect()
    }

    private val onPushNotification =
        Emitter.Listener { args ->
            var message = ""
            var username = ""
            try {
                val data = args[0] as JSONObject
                message = data.getString("message")
                username = data.getString("username")
            } catch (e: JSONException) {
                Log.e("ON_PUSH_NOTIFICATION", "unexpected JSON exception", e)
            }
            if (context.isAppOnForeground()) return@Listener // If application is in foreground, let redux be in charge of displaying notifications
            notificationHandler.notify(message, username)
        }

    fun handleNodeMessages(channelName: String, msg: String?) {
        print("handle node message - channel name $channelName")
        print("handle node message - msg $msg")
    }
}
