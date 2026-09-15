import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/services/watch_log_service.dart';
import 'package:flutter_app/src/router.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Must run before the first build: the whole layout switches between the
  // touch UI and the 10-foot TV UI based on this.
  await Device.init();


  if (Device.isTv) {
    // A remote is a keyboard as far as Flutter is concerned, so keep the focus
    // highlight permanently visible.
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
  }

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // The device id and the on-device history must be ready before the first
  // episode can be logged; this is a single SharedPreferences read.
  await WatchLogService().init();

  runApp(const MyApp());

  // Firebase is optional: the app ships without google-services.json, so this
  // throws on a plain build. Doing it after runApp keeps a failure that can
  // take seconds off the path to the first frame; watch logging simply stays
  // local until it succeeds.
  _initFirebaseInBackground();
}

Future<void> _initFirebaseInBackground() async {
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase not configured, watch logs stay on-device: $e');
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'HuyTeHuy Movies',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(textScale: Device.isTv ? 1.15 : 1.0),
      routerConfig: router,
      builder: (context, child) {
        // Ignore an oversized system font setting; the layouts are tuned for
        // a fixed scale and a TV has no per-app font control anyway.
        return MediaQuery.withClampedTextScaling(
          minScaleFactor: 1.0,
          maxScaleFactor: Device.isTv ? 1.0 : 1.2,
          // Animates the scroll that brings a newly focused widget into view,
          // instead of the default instant jump.
          child: TvFocusTraversal(child: child ?? const SizedBox()),
        );
      },
    );
  }
}
