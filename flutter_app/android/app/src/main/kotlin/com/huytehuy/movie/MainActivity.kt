package com.huytehuy.movie

import android.app.UiModeManager
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val channelName = "com.huytehuy.movie/device"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "isTv" -> result.success(isRunningOnTv())
                    else -> result.notImplemented()
                }
            }
    }

    /**
     * Android TV boxes / dongles are detected three ways because no single check
     * covers every device: the leanback feature, the UI mode, and the absence of
     * a touchscreen.
     */
    private fun isRunningOnTv(): Boolean {
        val pm = packageManager
        if (pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK) ||
            pm.hasSystemFeature("android.hardware.type.television")
        ) {
            return true
        }

        val uiModeManager = getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        if (uiModeManager?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION) {
            return true
        }

        return !pm.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN)
    }
}
