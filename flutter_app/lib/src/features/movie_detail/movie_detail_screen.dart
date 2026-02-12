import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/src/features/home/movie_detail_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:cached_network_image/cached_network_image.dart';

class MovieDetailScreen extends StatefulWidget {
  final String slug;

  const MovieDetailScreen({super.key, required this.slug});

  @override
  State<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends State<MovieDetailScreen> {
  final MovieService _movieService = MovieService();
  MovieDetail? _movie;
  bool _isLoading = true;
  String? _currentEmbedUrl;
  InAppWebViewController? _webViewController;
  String? _selectedServer;
  String? _selectedEpisodeSlug;
  String? _errorMessage;
  double _aspectRatio = 16 / 9;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final movie = await _movieService.fetchMovieDetail(widget.slug);
      if (mounted) {
        if (movie != null) {
          setState(() {
            _movie = movie;
            _isLoading = false;
            // Auto-select first episode if available
            if (movie.episodes.isNotEmpty) {
               _selectEpisode(movie.episodes[0].serverName, movie.episodes[0].items[0]);
            }
          });
        } else {
           setState(() {
             _isLoading = false;
             _errorMessage = "Movie data is null (API might have returned null)";
           });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _selectEpisode(String serverName, Episode episode) {
    setState(() {
      _selectedServer = serverName;
      _selectedEpisodeSlug = episode.slug;
      _currentEmbedUrl = episode.embed;
    });

    if (_webViewController != null) {
      _webViewController!.loadUrl(urlRequest: URLRequest(url: WebUri(episode.embed)));
    }
  }

  // Seek Overlay State
  bool _showSeekOverlay = false;
  bool _isForward = true;
  int _seekAmount = 15;

  Future<void> _seekVideo(bool forward) async {
    if (_webViewController == null) return;
    
    final seconds = forward ? 15 : -15;
    // Inject JS to seek. Works for standard HTML5 video tags.
    // We try multiple selectors to catch common players.
    final script = """
      (function() {
        var v = document.querySelector('video') || document.querySelector('iframe').contentWindow.document.querySelector('video');
        if (v) {
           v.currentTime += $seconds;
           return true;
        }
        return false;
      })();
    """;
    
    try {
       await _webViewController!.evaluateJavascript(source: script);
    } catch (_) {
      // Ignore security errors (cross-origin iframe)
    }

    setState(() {
      _showSeekOverlay = true;
      _isForward = forward;
    });
    
    // Hide overlay after delay
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _showSeekOverlay = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text("Error")),
        body: Center(child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text("Error loading movie: $_errorMessage", textAlign: TextAlign.center),
              Text("Slug: ${widget.slug}", style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchDetail, child: const Text("Retry"))
            ],
          ),
        )),
      );
    }

    if (_movie == null) {
       return Scaffold(
           appBar: AppBar(title: const Text("Loading...")),
           body: const Center(child: CircularProgressIndicator())
       );
    }

    return Scaffold(
      appBar: AppBar(title: Text(_movie!.name)),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Video Player Area
            // Video Player Area
            AspectRatio(
              aspectRatio: _aspectRatio,
              child: _currentEmbedUrl != null 
                ? Stack(
                    alignment: Alignment.center,
                    children: [
                      InAppWebView(
                        initialUrlRequest: URLRequest(url: WebUri(_currentEmbedUrl!)),
                        initialSettings: InAppWebViewSettings(
                          useHybridComposition: true,
                          allowsInlineMediaPlayback: true,
                          javaScriptEnabled: true,
                          mediaPlaybackRequiresUserGesture: false,
                          iframeAllow: "camera; microphone",
                          iframeAllowFullscreen: true,
                        ),
                        onWebViewCreated: (controller) {
                          _webViewController = controller;
                        },
                        onEnterFullscreen: (controller) {
                          SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
                        },
                        onExitFullscreen: (controller) {
                          SystemChrome.setEnabledSystemUIMode(SystemUiMode.manual, overlays: SystemUiOverlay.values);
                        },
                      ),
                      // Gesture Overlay
                      Positioned.fill(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 50.0), // Leave space for controls
                          child: Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  behavior: HitTestBehavior.translucent,
                                  onDoubleTap: () => _seekVideo(false),
                                  child: Container(color: Colors.transparent),
                                ),
                              ),
                              // Center area for standard controls (pass-through)
                              const Expanded(
                                flex: 2,
                                child: IgnorePointer(child: SizedBox()), 
                              ),
                              Expanded(
                                child: GestureDetector(
                                  behavior: HitTestBehavior.translucent,
                                  onDoubleTap: () => _seekVideo(true),
                                  child: Container(color: Colors.transparent),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (_showSeekOverlay) 
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _isForward ? Icons.fast_forward : Icons.fast_rewind,
                                  color: Colors.white,
                                  size: 32,
                                ),
                                Text(
                                  "${_isForward ? '+' : '-'}$_seekAmount s",
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                )
                              ],
                            ),
                          ),
                        ),
                    ],
                  )
                : Container(
                    color: Colors.black,
                    child: const Center(
                        child: Icon(Icons.play_circle_outline,
                            color: Colors.white, size: 60)),
                  ),
            ),
            
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: _movie!.thumbUrl,
                          width: 100,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _movie!.name,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text("Thời lượng: ${_movie!.time}"),
                            Text("Ngôn ngữ: ${_movie!.language}"),
                            Text("Năm: ${_movie!.year}"),
                            Text("Quốc gia: ${_movie!.country}"),
                          ],
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text("Danh sách tập:", style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  ..._movie!.episodes.map((server) {
                     return Column(
                       crossAxisAlignment: CrossAxisAlignment.start,
                       children: [
                         Padding(
                           padding: const EdgeInsets.symmetric(vertical: 8.0),
                           child: Chip(label: Text(server.serverName), backgroundColor: Colors.blue.shade100,),
                         ),
                         Wrap(
                           spacing: 8,
                           runSpacing: 8,
                           children: server.items.map((ep) {
                             final isSelected = _selectedServer == server.serverName && _selectedEpisodeSlug == ep.slug;
                             return ActionChip(
                               label: Text(ep.name),
                               backgroundColor: isSelected ? Colors.blue : null,
                               labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black),
                               onPressed: () => _selectEpisode(server.serverName, ep),
                             );
                           }).toList(),
                         )
                       ],
                     );
                  }).toList(),
                  const SizedBox(height: 20),
                  const Text("Nội dung:", style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(_movie!.description),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
