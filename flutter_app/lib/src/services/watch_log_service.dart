import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_app/src/core/device.dart';

/// Ghi log xem phim.
///
/// App không còn đăng nhập, nên "ai xem" được nhận diện bằng một [deviceId]
/// ngẫu nhiên sinh lần đầu rồi lưu lại trên máy, kèm loại thiết bị và IP.
///
/// Log đi vào collection `watch-logs` trên Firestore — cùng chỗ với web, để
/// trang /admin xem chung một bảng. Firebase là tuỳ chọn (app ship không kèm
/// google-services.json), nên mọi lỗi ở đây đều nuốt: xem phim không bao giờ
/// được phụ thuộc vào việc ghi log.
///
/// Lịch sử hiển thị cho chính người xem thì lưu ngay trên máy, không đọc lại
/// từ Firestore (rules chỉ cho ghi, không cho người xem đọc).
class WatchLogService {
  WatchLogService._internal();

  static final WatchLogService _instance = WatchLogService._internal();
  factory WatchLogService() => _instance;

  static const _deviceKey = 'hth_device_id';
  static const _historyKey = 'hth_watch_history';
  static const _maxHistory = 60;

  SharedPreferences? _prefs;
  String _deviceId = '';
  String? _ip;

  String get deviceId => _deviceId;

  Future<void> init() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      final saved = _prefs?.getString(_deviceKey);
      if (saved != null && saved.isNotEmpty) {
        _deviceId = saved;
      } else {
        _deviceId = _randomId();
        await _prefs?.setString(_deviceKey, _deviceId);
      }
    } catch (e) {
      debugPrint('WatchLog: không đọc được SharedPreferences: $e');
    }
  }

  static String _randomId() {
    final rand = Random.secure();
    final bytes = List<int>.generate(16, (_) => rand.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  /// 'android-tv' | 'android' | 'ios' | … — đủ để phân biệt TV với điện thoại.
  String get _platform {
    if (Device.isTv) return 'android-tv';
    if (kIsWeb) return 'web';
    try {
      return Platform.operatingSystem;
    } catch (_) {
      return 'unknown';
    }
  }

  /// IP công khai, hỏi 1 lần cho mỗi lần chạy app. Không lấy được thì bỏ trống.
  Future<String> _publicIp() async {
    if (_ip != null) return _ip!;
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 3),
        receiveTimeout: const Duration(seconds: 3),
      ));
      final res = await dio.get('https://api.ipify.org', queryParameters: {'format': 'json'});
      _ip = (res.data is Map ? res.data['ip']?.toString() : '') ?? '';
    } catch (e) {
      debugPrint('WatchLog: không lấy được IP: $e');
      _ip = '';
    }
    return _ip!;
  }

  /// Ghi lại một lượt xem: máy nào, lúc nào, phim gì, tập mấy.
  ///
  /// Trả về ngay sau khi lưu vào máy; phần gửi lên Firestore chạy nền.
  void logWatch({
    required String filmId,
    required String filmName,
    required String episodeName,
    required String serverName,
    String image = '',
  }) {
    final item = WatchHistoryItem(
      filmId: filmId,
      filmName: filmName,
      episodeName: episodeName,
      serverName: serverName,
      image: image,
      watchedAt: DateTime.now(),
    );
    _saveLocal(item);
    unawaited(_sendToFirestore(item));
  }

  Future<void> _sendToFirestore(WatchHistoryItem item) async {
    try {
      final ip = await _publicIp();
      await FirebaseFirestore.instance.collection('watch-logs').add({
        'deviceId': _deviceId,
        'device': Device.isTv ? 'Android TV' : _platform,
        'userAgent': 'HuyTeHuy Movies app ($_platform)',
        'ip': ip,
        'platform': _platform,
        'filmId': item.filmId,
        'filmName': item.filmName,
        'episodeName': item.episodeName,
        'serverName': item.serverName,
        'image': item.image,
        'timestamp': FieldValue.serverTimestamp(),
        'watchedAt': item.watchedAt.toIso8601String(),
      });
    } catch (e) {
      // Chưa cấu hình Firebase, hoặc mất mạng — không sao.
      debugPrint('WatchLog: không gửi được log: $e');
    }
  }

  void _saveLocal(WatchHistoryItem item) {
    final prefs = _prefs;
    if (prefs == null) return;
    try {
      final next = [
        item,
        ...history.where((entry) => entry.key != item.key),
      ].take(_maxHistory).toList();
      prefs.setString(
        _historyKey,
        jsonEncode(next.map((entry) => entry.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('WatchLog: không lưu được lịch sử: $e');
    }
  }

  /// Lịch sử xem của chính máy này, mới nhất trước.
  List<WatchHistoryItem> get history {
    final raw = _prefs?.getString(_historyKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .whereType<Map>()
          .map((entry) => WatchHistoryItem.fromJson(entry.cast<String, dynamic>()))
          .toList();
    } catch (e) {
      debugPrint('WatchLog: lịch sử hỏng, bỏ qua: $e');
      return const [];
    }
  }

  Future<void> clearHistory() async {
    await _prefs?.remove(_historyKey);
  }
}

class WatchHistoryItem {
  const WatchHistoryItem({
    required this.filmId,
    required this.filmName,
    required this.episodeName,
    required this.serverName,
    required this.watchedAt,
    this.image = '',
  });

  final String filmId;
  final String filmName;
  final String episodeName;
  final String serverName;
  final String image;
  final DateTime watchedAt;

  /// Dùng để chống trùng: cùng phim + cùng tập + cùng nguồn thì chỉ giữ bản mới.
  String get key => '$filmId|$episodeName|$serverName';

  Map<String, dynamic> toJson() => {
        'filmId': filmId,
        'filmName': filmName,
        'episodeName': episodeName,
        'serverName': serverName,
        'image': image,
        'watchedAt': watchedAt.toIso8601String(),
      };

  factory WatchHistoryItem.fromJson(Map<String, dynamic> json) => WatchHistoryItem(
        filmId: (json['filmId'] ?? '').toString(),
        filmName: (json['filmName'] ?? '').toString(),
        episodeName: (json['episodeName'] ?? '').toString(),
        serverName: (json['serverName'] ?? '').toString(),
        image: (json['image'] ?? '').toString(),
        watchedAt:
            DateTime.tryParse((json['watchedAt'] ?? '').toString()) ?? DateTime.now(),
      );
}
