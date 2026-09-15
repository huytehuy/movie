import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_detail_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_app/src/services/watch_log_service.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/states.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

/// Injected into the embed page (and its same-origin frames) so Flutter can
/// drive the HTML5 `<video>` element directly.
///
/// This is what makes the web embed usable with a remote: the page's own
/// controls are mouse-oriented and a TV D-pad cannot reach them, but the video
/// element itself is scriptable. Play/pause and seek therefore go through here
/// instead of relying on the page UI.
const String _kPlayerBridge = r'''
window.__hv = (function () {
  function find(doc) {
    try {
      var vs = doc.getElementsByTagName('video');
      for (var i = 0; i < vs.length; i++) { if (vs[i]) return vs[i]; }
      var fr = doc.getElementsByTagName('iframe');
      for (var j = 0; j < fr.length; j++) {
        try {
          var d = fr[j].contentDocument ||
                  (fr[j].contentWindow && fr[j].contentWindow.document);
          if (d) { var r = find(d); if (r) return r; }
        } catch (e) { /* cross-origin frame: skip */ }
      }
    } catch (e) { }
    return null;
  }
  return {
    state: function () {
      var v = find(document);
      if (!v) return JSON.stringify({ ok: false });
      return JSON.stringify({
        ok: true,
        t: v.currentTime || 0,
        d: (isFinite(v.duration) && v.duration > 0) ? v.duration : 0,
        paused: !!v.paused,
        buf: (v.buffered && v.buffered.length)
              ? v.buffered.end(v.buffered.length - 1) : 0,
        w: v.videoWidth || 0
      });
    },
    toggle: function () {
      var v = find(document); if (!v) return false;
      if (v.paused) { v.play(); } else { v.pause(); }
      return true;
    },
    play: function () { var v = find(document); if (v) { v.play(); return true; } return false; },
    pause: function () { var v = find(document); if (v) { v.pause(); return true; } return false; },
    seek: function (s) {
      var v = find(document); if (!v) return false;
      var t = (v.currentTime || 0) + s;
      if (t < 0) t = 0;
      if (isFinite(v.duration) && v.duration > 0 && t > v.duration - 1) {
        t = v.duration - 1;
      }
      v.currentTime = t;
      return true;
    },
    seekTo: function (t) {
      var v = find(document); if (!v) return false;
      v.currentTime = t; return true;
    }
  };
})();
''';

/// Snapshot of the embedded video's state, read over the JS bridge.
class _VideoState {
  const _VideoState({
    this.ready = false,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.buffered = Duration.zero,
    this.paused = true,
  });

  final bool ready;
  final Duration position;
  final Duration duration;
  final Duration buffered;
  final bool paused;

  double get progress => duration.inMilliseconds == 0
      ? 0
      : (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0);

  double get bufferedFraction => duration.inMilliseconds == 0
      ? 0
      : (buffered.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0);
}

enum _Stage {
  /// Fetching the movie record.
  loading,

  /// Embed page is up.
  ready,

  /// This episode has no embed link on any server.
  noSource,

  /// The movie record itself could not be loaded.
  failed,
}

/// Full-screen player built on the site's web embed, driven by a JS bridge.
class WatchScreen extends StatefulWidget {
  const WatchScreen({
    super.key,
    required this.slug,
    this.serverIndex = 0,
    this.episodeIndex = 0,
  });

  final String slug;
  final int serverIndex;
  final int episodeIndex;

  @override
  State<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends State<WatchScreen> {
  final MovieService _service = MovieService();

  MovieDetail? _movie;
  _Stage _stage = _Stage.loading;
  String? _message;

  int _serverIndex = 0;
  int _episodeIndex = 0;

  /// Tập vừa ghi log, để bấm tải lại không sinh ra bản ghi trùng.
  String? _lastLoggedKey;

  InAppWebViewController? _web;
  bool _pageLoaded = false;

  /// Driven by the polling timer; only the small widgets that show time and
  /// progress listen to it, so a tick does not rebuild the screen.
  final ValueNotifier<_VideoState> _videoState =
      ValueNotifier(const _VideoState());
  Timer? _pollTimer;

  bool _controlsVisible = true;
  bool _episodePanelOpen = false;
  Timer? _hideTimer;

  /// Fires the auto-advance at most once per episode.
  bool _advanced = false;

  /// Last known play state, used to schedule the control auto-hide once the
  /// video really starts.
  bool _lastPaused = true;

  String? _toast;
  IconData? _toastIcon;
  Timer? _toastTimer;

  /// Holding a seek key accelerates from 10s to 30s per step.
  int _seekRepeats = 0;

  /// Bumped to force the WebView to rebuild when retrying the same episode.
  int _reloadToken = 0;

  final FocusNode _playerFocus = FocusNode(debugLabel: 'player');

  @override
  void initState() {
    super.initState();
    _serverIndex = widget.serverIndex;
    _episodeIndex = widget.episodeIndex;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    WakelockPlus.enable();
    if (!Device.isTv) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
    // Registered globally rather than on a Focus node: transport control must
    // keep working no matter which widget (or the WebView) holds focus. This is
    // why pause and seek did nothing before.
    HardwareKeyboard.instance.addHandler(_handleGlobalKey);
    _loadMovie();
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_handleGlobalKey);
    _pollTimer?.cancel();
    _hideTimer?.cancel();
    _toastTimer?.cancel();
    _videoState.dispose();
    _playerFocus.dispose();
    WakelockPlus.disable();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.manual,
        overlays: SystemUiOverlay.values);
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  // ------------------------------------------------------------------- data

  EpisodeServer? get _server {
    final movie = _movie;
    if (movie == null || movie.episodes.isEmpty) return null;
    return movie.episodes[_serverIndex.clamp(0, movie.episodes.length - 1)];
  }

  Episode? get _episode {
    final server = _server;
    if (server == null || server.items.isEmpty) return null;
    return server.items[_episodeIndex.clamp(0, server.items.length - 1)];
  }

  String get _embedUrl => _episode?.playableEmbed ?? '';

  Future<void> _loadMovie() async {
    setState(() {
      _stage = _Stage.loading;
      _message = null;
    });
    try {
      final movie = await _service.fetchMovieDetail(widget.slug);
      if (!mounted) return;
      _movie = movie;
      _serverIndex = _serverIndex.clamp(0, movie.episodes.length - 1);
      final items = movie.episodes[_serverIndex].items;
      _episodeIndex =
          _episodeIndex.clamp(0, items.isEmpty ? 0 : items.length - 1);

      // Land on a server that actually has a link for this episode.
      final better = _serverWithSourceFor(_episodeIndex, from: _serverIndex);
      if (better != null && better != _serverIndex) {
        _serverIndex = better;
      }

      if (_embedUrl.isEmpty) {
        setState(() {
          _stage = _Stage.noSource;
          _message = 'Tập này chưa có link phát trên server nào.';
        });
        return;
      }
      setState(() => _stage = _Stage.ready);
      _logCurrentEpisode();
      _startPolling();
      _showControls();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _stage = _Stage.failed;
        _message = e.toString();
      });
    }
  }

  int? _serverWithSourceFor(int episodeIndex, {int? from}) {
    final movie = _movie;
    if (movie == null) return null;

    bool has(int s) {
      final items = movie.episodes[s].items;
      return episodeIndex < items.length &&
          items[episodeIndex].playableEmbed.isNotEmpty;
    }

    if (from != null && from < movie.episodes.length && has(from)) return from;
    for (var s = 0; s < movie.episodes.length; s++) {
      if (has(s)) return s;
    }
    return null;
  }

  // ------------------------------------------------------------- JS bridge

  Future<void> _inject() async {
    final web = _web;
    if (web == null) return;
    try {
      await web.evaluateJavascript(source: _kPlayerBridge);
    } catch (_) {
      // Page may still be navigating; the poll loop re-injects.
    }
  }

  Future<dynamic> _call(String expression) async {
    final web = _web;
    if (web == null) return null;
    try {
      return await web.evaluateJavascript(
        source: 'window.__hv ? window.__hv.$expression : null',
      );
    } catch (_) {
      return null;
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    var tick = 0;
    _pollTimer = Timer.periodic(const Duration(milliseconds: 600), (_) async {
      if (!mounted) return;
      tick++;
      // Controls hidden: only the end-of-episode check still matters, so drop
      // to one bridge call every ~3s instead of two a second.
      if (!_controlsVisible && tick % 5 != 0) return;
      final raw = await _call('state()');
      if (!mounted) return;

      if (raw == null) {
        // Bridge missing (fresh navigation): put it back.
        await _inject();
        return;
      }
      Map<String, dynamic>? map;
      if (raw is String && raw.isNotEmpty) {
        try {
          map = jsonDecode(raw) as Map<String, dynamic>;
        } catch (_) {
          map = null;
        }
      } else if (raw is Map) {
        map = raw.cast<String, dynamic>();
      }
      if (map == null || map['ok'] != true) {
        _videoState.value = const _VideoState();
        return;
      }

      Duration secs(dynamic v) => Duration(
          milliseconds: (((v as num?)?.toDouble() ?? 0) * 1000).round());

      final state = _VideoState(
        ready: true,
        position: secs(map['t']),
        duration: secs(map['d']),
        buffered: secs(map['buf']),
        paused: map['paused'] == true,
      );
      _videoState.value = state;

      // The controls come up before the bridge reports anything, so at that
      // point the state still says "paused" and no auto-hide gets scheduled.
      // Schedule it the moment playback actually starts.
      if (_lastPaused != state.paused) {
        _lastPaused = state.paused;
        if (!state.paused) _showControls();
      }

      // Auto-advance at the end.
      if (!_advanced &&
          state.duration > Duration.zero &&
          state.duration - state.position < const Duration(seconds: 2) &&
          state.paused) {
        _advanced = true;
        _next(auto: true);
      }
    });
  }

  // --------------------------------------------------------------- controls

  void _showToast(String text, IconData icon) {
    _toastTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _toast = text;
      _toastIcon = icon;
    });
    _toastTimer = Timer(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _toast = null);
    });
  }

  void _showControls({bool autoHide = true}) {
    _hideTimer?.cancel();
    if (!_controlsVisible) setState(() => _controlsVisible = true);
    if (autoHide && !_videoState.value.paused) {
      _hideTimer = Timer(const Duration(seconds: 4), () {
        if (mounted && !_episodePanelOpen) {
          setState(() => _controlsVisible = false);
        }
      });
    }
  }

  Future<void> _togglePlay() async {
    final ok = await _call('toggle()');
    if (ok == null) {
      _showToast('Chưa nhận được video, thử lại sau vài giây',
          Icons.hourglass_empty_rounded);
      return;
    }
    // The poll loop will pick up the new paused state; keep the controls up so
    // the user sees what happened.
    _showControls(autoHide: false);
  }

  Future<void> _seek(int seconds) async {
    final ok = await _call('seek($seconds)');
    if (ok == null) return;
    _showToast(
      '${seconds > 0 ? '+' : '−'}${seconds.abs()} giây',
      seconds > 0 ? Icons.fast_forward_rounded : Icons.fast_rewind_rounded,
    );
    _showControls();
  }

  /// Ghi lại "máy này, lúc này, phim gì, tập mấy".
  ///
  /// Bấm tải lại cùng một tập thì không ghi thêm dòng nữa — chỉ đổi tập hoặc
  /// đổi server mới tính là một lượt xem mới.
  void _logCurrentEpisode() {
    final movie = _movie;
    final episode = _episode;
    if (movie == null || episode == null) return;

    final key = '${widget.slug}|${episode.name}|${_server?.serverName ?? ''}';
    if (key == _lastLoggedKey) return;
    _lastLoggedKey = key;

    WatchLogService().logWatch(
      filmId: widget.slug,
      filmName: movie.name,
      episodeName: episode.name,
      serverName: _server?.serverName ?? '',
      image: movie.thumbUrl,
    );
  }

  void _reopen() {
    _logCurrentEpisode();
    _advanced = false;
    _lastPaused = true;
    _videoState.value = const _VideoState();
    _pageLoaded = false;
    setState(() => _reloadToken++);
  }

  void _next({bool auto = false}) {
    final server = _server;
    if (server == null) return;
    if (_episodeIndex + 1 >= server.items.length) {
      if (auto) {
        _showControls(autoHide: false);
        _showToast('Đã hết tập cuối', Icons.done_all_rounded);
      }
      return;
    }
    setState(() => _episodeIndex += 1);
    _reopen();
  }

  void _previous() {
    if (_episodeIndex == 0) return;
    setState(() => _episodeIndex -= 1);
    _reopen();
  }

  void _selectEpisode(int serverIndex, int episodeIndex) {
    setState(() {
      _serverIndex = serverIndex;
      _episodeIndex = episodeIndex;
      _episodePanelOpen = false;
      if (_embedUrl.isEmpty) {
        _stage = _Stage.noSource;
        _message = 'Tập này chưa có link phát.';
      } else {
        _stage = _Stage.ready;
      }
    });
    _reopen();
    _playerFocus.requestFocus();
  }

  void _openPanel() {
    setState(() => _episodePanelOpen = true);
    _showControls(autoHide: false);
  }

  void _closePanel() {
    setState(() => _episodePanelOpen = false);
    _playerFocus.requestFocus();
  }

  // ------------------------------------------------------------ key handling

  bool _handleGlobalKey(KeyEvent event) {
    if (!mounted) return false;
    // The picker needs normal focus traversal.
    if (_episodePanelOpen || _stage != _Stage.ready) return false;

    if (event is KeyUpEvent) {
      _seekRepeats = 0;
      return false;
    }
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) return false;

    final key = event.logicalKey;
    final repeat = event is KeyRepeatEvent;

    if (key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.mediaRewind) {
      _seekRepeats = repeat ? _seekRepeats + 1 : 0;
      _seek(_seekRepeats >= 3 ? -30 : -10);
      return true;
    }
    if (key == LogicalKeyboardKey.arrowRight ||
        key == LogicalKeyboardKey.mediaFastForward) {
      _seekRepeats = repeat ? _seekRepeats + 1 : 0;
      _seek(_seekRepeats >= 3 ? 30 : 10);
      return true;
    }
    if (repeat) return true; // Only seeking repeats.

    if (key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.numpadEnter ||
        key == LogicalKeyboardKey.space ||
        key == LogicalKeyboardKey.gameButtonA ||
        key == LogicalKeyboardKey.mediaPlayPause) {
      _togglePlay();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaPlay) {
      _call('play()');
      _showControls();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaPause) {
      _call('pause()');
      _showControls(autoHide: false);
      return true;
    }
    if (key == LogicalKeyboardKey.mediaTrackNext) {
      _next();
      return true;
    }
    if (key == LogicalKeyboardKey.mediaTrackPrevious) {
      _previous();
      return true;
    }
    if (key == LogicalKeyboardKey.arrowDown) {
      _openPanel();
      return true;
    }
    if (key == LogicalKeyboardKey.arrowUp) {
      _showControls(autoHide: false);
      return true;
    }
    return false;
  }

  bool _handlePop() {
    if (_episodePanelOpen) {
      _closePanel();
      return false;
    }
    if (_stage == _Stage.ready && _controlsVisible && !_videoState.value.paused) {
      setState(() => _controlsVisible = false);
      return false;
    }
    return true;
  }

  // ------------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_handlePop() && mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Focus(
          focusNode: _playerFocus,
          autofocus: true,
          skipTraversal: true,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _buildStage(),
              if (_stage == _Stage.ready) ...[
                // Touch users: tap to reveal controls, double-tap a side to
                // skip. On a TV this layer also keeps the WebView from taking
                // focus away from Flutter, which would swallow the D-pad.
                Positioned.fill(
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _toggleControlsByTap,
                          onDoubleTap: () => _seek(-10),
                          child: const SizedBox.expand(),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _toggleControlsByTap,
                          onDoubleTap: () => _seek(10),
                          child: const SizedBox.expand(),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!_pageLoaded)
                  const Center(
                    child: SizedBox(
                      width: 46,
                      height: 46,
                      child: CircularProgressIndicator(strokeWidth: 3),
                    ),
                  ),
                if (_controlsVisible) _buildControlsOverlay(),
              ],
              if (_toast != null) _buildToast(),
              if (_episodePanelOpen) _buildEpisodePanel(),
            ],
          ),
        ),
      ),
    );
  }

  void _toggleControlsByTap() {
    if (_controlsVisible) {
      setState(() => _controlsVisible = false);
    } else {
      _showControls();
    }
  }

  Widget _buildStage() {
    switch (_stage) {
      case _Stage.loading:
        return const LoadingState(message: 'Đang mở phim...');

      case _Stage.failed:
        return ErrorState(
          message: _message ?? 'Không tải được phim.',
          onRetry: _loadMovie,
        );

      case _Stage.noSource:
        return _buildNoSourcePanel();

      case _Stage.ready:
        final url = _embedUrl;
        if (url.isEmpty) return _buildNoSourcePanel();
        return InAppWebView(
          key: ValueKey('$url|$_serverIndex|$_episodeIndex|$_reloadToken'),
          initialUrlRequest: URLRequest(url: WebUri(url)),
          initialUserScripts: UnmodifiableListView<UserScript>([
            UserScript(
              source: _kPlayerBridge,
              injectionTime: UserScriptInjectionTime.AT_DOCUMENT_END,
              forMainFrameOnly: false,
            ),
          ]),
          initialSettings: InAppWebViewSettings(
            useHybridComposition: true,
            allowsInlineMediaPlayback: true,
            javaScriptEnabled: true,
            mediaPlaybackRequiresUserGesture: false,
            transparentBackground: true,
            iframeAllowFullscreen: true,
            // Embed pages like to open ad tabs on any click.
            supportMultipleWindows: false,
            javaScriptCanOpenWindowsAutomatically: false,
            useShouldOverrideUrlLoading: true,
          ),
          onWebViewCreated: (controller) => _web = controller,
          onLoadStop: (controller, _) async {
            await _inject();
            if (!mounted) return;
            setState(() => _pageLoaded = true);
            // The page may have grabbed focus; take it back so the remote keeps
            // reaching Flutter.
            _playerFocus.requestFocus();
            _showControls();
          },
          onReceivedError: (controller, request, error) {
            if (!mounted || request.isForMainFrame != true) return;
            setState(() {
              _stage = _Stage.noSource;
              _message = 'Không mở được trang phát (${error.description}).';
            });
          },
          shouldOverrideUrlLoading: (controller, action) async {
            // Block only user-initiated link clicks that leave the player host:
            // that is how these embeds open ad tabs, and on a TV an accidental
            // OK press must not navigate away from the movie. Programmatic
            // redirects are left alone so the player can still do its job.
            final target = action.request.url;
            final host = Uri.tryParse(url)?.host;
            if (action.navigationType == NavigationType.LINK_ACTIVATED &&
                host != null &&
                target != null &&
                target.host != host) {
              return NavigationActionPolicy.CANCEL;
            }
            return NavigationActionPolicy.ALLOW;
          },
        );
    }
  }

  Widget _buildNoSourcePanel() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accent.withValues(alpha: 0.14),
              ),
              child: const Icon(Icons.videocam_off_rounded,
                  color: AppColors.accent, size: 32),
            ),
            const SizedBox(height: 18),
            Text('Không phát được tập này',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: Text(
                _message ?? 'Tập này chưa có link phát.',
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            const SizedBox(height: 26),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              children: [
                TvButton(
                  label: 'Chọn tập / server khác',
                  icon: Icons.playlist_play_rounded,
                  filled: true,
                  autofocus: true,
                  onPressed: _openPanel,
                ),
                TvButton(
                  label: 'Thử lại',
                  icon: Icons.refresh_rounded,
                  onPressed: () {
                    if (_embedUrl.isNotEmpty) {
                      setState(() => _stage = _Stage.ready);
                      _reopen();
                    } else {
                      _loadMovie();
                    }
                  },
                ),
                TvButton(
                  label: 'Quay lại',
                  icon: Icons.arrow_back_rounded,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToast() {
    return Align(
      alignment: const Alignment(0, -0.55),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_toastIcon ?? Icons.info_outline_rounded,
                color: Colors.white, size: 24),
            const SizedBox(width: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Text(
                _toast!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlsOverlay() {
    final movie = _movie;
    final episode = _episode;
    final tv = Device.isTv;
    final pad = tv ? 44.0 : 20.0;
    final hasNext = (_server?.items.length ?? 0) > _episodeIndex + 1;

    return GestureDetector(
      onTap: _toggleControlsByTap,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xCC000000), Color(0x11000000), Color(0xE6000000)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: pad, vertical: 16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TvIconButton(
                      icon: Icons.arrow_back_rounded,
                      tooltip: 'Quay lại',
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            movie?.name ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (episode != null)
                            Text(
                              '${_server?.serverName ?? ''} • ${episode.name}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                _Timeline(state: _videoState),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _Clock(state: _videoState),
                    const Spacer(),
                    if (tv)
                      Text(
                        'OK phát/dừng · ◀ ▶ tua 10s · giữ để tua 30s · ▼ danh sách tập · Back thoát',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TvIconButton(
                      icon: Icons.skip_previous_rounded,
                      tooltip: 'Tập trước',
                      onPressed: _episodeIndex > 0 ? _previous : null,
                    ),
                    const SizedBox(width: 12),
                    TvIconButton(
                      icon: Icons.replay_10_rounded,
                      tooltip: 'Lùi 10 giây',
                      onPressed: () => _seek(-10),
                    ),
                    const SizedBox(width: 12),
                    _PlayButton(state: _videoState, onPressed: _togglePlay),
                    const SizedBox(width: 12),
                    TvIconButton(
                      icon: Icons.forward_10_rounded,
                      tooltip: 'Tiến 10 giây',
                      onPressed: () => _seek(10),
                    ),
                    const SizedBox(width: 12),
                    TvIconButton(
                      icon: Icons.skip_next_rounded,
                      tooltip: 'Tập sau',
                      onPressed: hasNext ? _next : null,
                    ),
                    const SizedBox(width: 12),
                    TvIconButton(
                      icon: Icons.playlist_play_rounded,
                      tooltip: 'Danh sách tập',
                      onPressed: _openPanel,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEpisodePanel() {
    final movie = _movie;
    if (movie == null) return const SizedBox();

    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.9),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(Device.isTv ? 40 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Chọn server & tập',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                    TvIconButton(
                      icon: Icons.close_rounded,
                      tooltip: 'Đóng',
                      onPressed: _closePanel,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView(
                    children: [
                      for (var s = 0; s < movie.episodes.length; s++) ...[
                        Text(
                          movie.episodes[s].serverName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 10),
                        EpisodePicker(
                          episodes: movie.episodes[s].items,
                          selectedIndex:
                              s == _serverIndex ? _episodeIndex : null,
                          autofocusSelected: s == _serverIndex,
                          onSelect: (e) => _selectEpisode(s, e),
                        ),
                        const SizedBox(height: 22),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _format(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return hours > 0 ? '$hours:$minutes:$seconds' : '$minutes:$seconds';
  }
}

/// Episode chooser that stays usable for a 200-episode series: episodes are
/// bucketed into ranges and only the selected range is expanded, so reaching
/// episode 150 costs a handful of presses instead of 150.
class EpisodePicker extends StatefulWidget {
  const EpisodePicker({
    super.key,
    required this.episodes,
    required this.onSelect,
    this.selectedIndex,
    this.autofocusSelected = false,
    this.bucketSize = 30,
  });

  final List<Episode> episodes;
  final ValueChanged<int> onSelect;
  final int? selectedIndex;
  final bool autofocusSelected;
  final int bucketSize;

  @override
  State<EpisodePicker> createState() => _EpisodePickerState();
}

class _EpisodePickerState extends State<EpisodePicker> {
  late int _bucket = (widget.selectedIndex ?? 0) ~/ widget.bucketSize;

  @override
  void didUpdateWidget(EpisodePicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedIndex != widget.selectedIndex &&
        widget.selectedIndex != null) {
      _bucket = widget.selectedIndex! ~/ widget.bucketSize;
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.episodes.length;
    if (total == 0) {
      return Text('Server này chưa có tập nào',
          style: Theme.of(context).textTheme.bodySmall);
    }

    final bucketCount = (total / widget.bucketSize).ceil();
    final start = _bucket * widget.bucketSize;
    final end = (start + widget.bucketSize).clamp(0, total);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (bucketCount > 1) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var b = 0; b < bucketCount; b++)
                TvButton(
                  label:
                      '${b * widget.bucketSize + 1}–${((b + 1) * widget.bucketSize).clamp(0, total)}',
                  compact: true,
                  selected: b == _bucket,
                  onPressed: () => setState(() => _bucket = b),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (var i = start; i < end; i++)
              TvButton(
                label: widget.episodes[i].displayName,
                compact: true,
                selected: i == widget.selectedIndex,
                autofocus:
                    widget.autofocusSelected && i == widget.selectedIndex,
                onPressed: () => widget.onSelect(i),
              ),
          ],
        ),
      ],
    );
  }
}

/// Seek bar. Listens to the shared state notifier so a tick repaints six pixels
/// of bar instead of the whole player screen.
class _Timeline extends StatelessWidget {
  const _Timeline({required this.state});

  final ValueListenable<_VideoState> state;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<_VideoState>(
      valueListenable: state,
      builder: (context, value, _) => ClipRRect(
        borderRadius: BorderRadius.circular(3),
        child: Stack(
          children: [
            Container(height: 6, color: Colors.white24),
            FractionallySizedBox(
              widthFactor: value.bufferedFraction,
              child: Container(height: 6, color: Colors.white38),
            ),
            FractionallySizedBox(
              widthFactor: value.progress,
              child: Container(height: 6, color: AppColors.accent),
            ),
          ],
        ),
      ),
    );
  }
}

class _Clock extends StatelessWidget {
  const _Clock({required this.state});

  final ValueListenable<_VideoState> state;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodySmall;
    return ValueListenableBuilder<_VideoState>(
      valueListenable: state,
      builder: (context, value, _) => Text(
        '${_WatchScreenState._format(value.position)}'
        ' / ${_WatchScreenState._format(value.duration)}',
        style: style,
      ),
    );
  }
}

class _PlayButton extends StatelessWidget {
  const _PlayButton({required this.state, required this.onPressed});

  final ValueListenable<_VideoState> state;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Focusable(
      onTap: onPressed,
      scale: 1.1,
      borderRadius: BorderRadius.circular(999),
      builder: (context, focused) => Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.accentGradient,
        ),
        child: ValueListenableBuilder<_VideoState>(
          valueListenable: state,
          builder: (context, value, _) => Icon(
            value.paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
            color: Colors.white,
            size: 30,
          ),
        ),
      ),
    );
  }
}
