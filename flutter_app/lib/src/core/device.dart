import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Whether the app is running on an Android TV / set-top box.
///
/// Resolved once at startup through a platform channel (see MainActivity.kt)
/// because a TV cannot be told apart from a large tablet using screen metrics
/// alone. On any non-Android platform this stays `false`.
class Device {
  Device._();

  static const MethodChannel _channel =
      MethodChannel('com.huytehuy.movie/device');

  static bool _isTv = false;

  /// True on Android TV. Drives the "10-foot UI": bigger type, always-visible
  /// focus rings, autofocus so the remote always has something to move.
  static bool get isTv => _isTv;

  /// Lets the TV layout be previewed on a phone or desktop:
  /// `flutter run --dart-define=FORCE_TV=true`.
  static const bool _forceTv = bool.fromEnvironment('FORCE_TV');

  static Future<void> init() async {
    if (_forceTv) {
      _isTv = true;
      return;
    }
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      _isTv = await _channel.invokeMethod<bool>('isTv') ?? false;
    } catch (_) {
      _isTv = false;
    }
  }

  /// Debug-only override so the TV layout can be exercised on a phone/desktop.
  @visibleForTesting
  static set isTvOverride(bool value) => _isTv = value;
}

/// Layout breakpoints. TVs land in [ScreenSize.tv] regardless of pixel width.
enum ScreenSize { phone, tablet, desktop, tv }

extension ScreenSizeX on BuildContext {
  ScreenSize get screen {
    if (Device.isTv) return ScreenSize.tv;
    final width = MediaQuery.sizeOf(this).width;
    if (width < 700) return ScreenSize.phone;
    if (width < 1100) return ScreenSize.tablet;
    return ScreenSize.desktop;
  }

  bool get isTv => Device.isTv;

  /// True when the layout should use the side navigation rail.
  bool get isWide => Device.isTv || MediaQuery.sizeOf(this).width >= 900;

  bool get isPhone => !Device.isTv && MediaQuery.sizeOf(this).width < 700;
}
