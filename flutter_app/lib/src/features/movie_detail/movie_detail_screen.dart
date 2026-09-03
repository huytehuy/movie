import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_detail_model.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/features/watch/watch_screen.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/states.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class MovieDetailScreen extends StatefulWidget {
  const MovieDetailScreen({super.key, required this.slug, this.seed});

  final String slug;

  /// The card the user came from. Lets the backdrop, title and badges paint on
  /// the first frame instead of after a network round trip.
  final Movie? seed;

  @override
  State<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends State<MovieDetailScreen> {
  final MovieService _service = MovieService();

  MovieDetail? _movie;
  String? _error;
  int _serverIndex = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final movie = await _service.fetchMovieDetail(widget.slug);
      if (!mounted) return;
      setState(() {
        _movie = movie;
        _serverIndex = _bestServer(movie);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  /// Prefer a server that has links, so "Xem ngay" works on the first press.
  int _bestServer(MovieDetail movie) {
    for (var i = 0; i < movie.episodes.length; i++) {
      if (movie.episodes[i].items.any((e) => e.playableEmbed.isNotEmpty)) {
        return i;
      }
    }
    return 0;
  }

  void _watch({int episodeIndex = 0}) {
    context.push('/watch/${widget.slug}'
        '?server=$_serverIndex&ep=$episodeIndex');
  }

  @override
  Widget build(BuildContext context) {
    final movie = _movie;
    final seed = widget.seed;

    if (movie == null && seed == null) {
      if (_error != null) {
        return Scaffold(
          backgroundColor: AppColors.background,
          body: ErrorState(message: _error!, onRetry: _load),
        );
      }
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: LoadingState(message: 'Đang tải thông tin phim...'),
      );
    }

    final tv = Device.isTv;
    final hPad = tv ? 48.0 : 16.0;
    final servers = movie?.episodes ?? const <EpisodeServer>[];
    final activeServer = servers.isEmpty
        ? null
        : servers[_serverIndex.clamp(0, servers.length - 1)];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _Backdrop(
              // Whichever we have: the full record once loaded, the card meanwhile.
              display: movie ?? seed!,
              detail: movie,
              onBack: () => Navigator.of(context).maybePop(),
              onPlay: movie == null ? null : () => _watch(),
              horizontalPadding: hPad,
            ),
          ),
          if (movie == null)
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(hPad, 30, hPad, 30),
                child: _error != null
                    ? ErrorState(message: _error!, onRetry: _load)
                    : const Center(
                        child: SizedBox(
                          width: 26,
                          height: 26,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        ),
                      ),
              ),
            )
          else
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(hPad, 8, hPad, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (movie.plainDescription.isNotEmpty) ...[
                      const SectionTitle(title: 'Nội dung'),
                      const SizedBox(height: 10),
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: tv ? 1100 : 720),
                        child: Text(
                          movie.plainDescription,
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: AppColors.textSecondary,
                                    height: 1.6,
                                  ),
                        ),
                      ),
                      const SizedBox(height: 26),
                    ],
                    if (movie.actors.isNotEmpty) ...[
                      _InfoRow(
                        label: 'Diễn viên',
                        value: movie.actors.take(8).join(', '),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (movie.director.trim().isNotEmpty) ...[
                      _InfoRow(label: 'Đạo diễn', value: movie.director),
                      const SizedBox(height: 8),
                    ],
                    if (movie.country.trim().isNotEmpty)
                      _InfoRow(label: 'Quốc gia', value: movie.country),
                    const SizedBox(height: 28),
                    if (servers.isEmpty)
                      const EmptyState(
                        message: 'Phim này hiện chưa có nguồn phát.',
                        icon: Icons.videocam_off_outlined,
                      )
                    else ...[
                      SectionTitle(
                        title: 'Chọn tập',
                        trailing: Text(
                          '${activeServer?.items.length ?? 0} tập',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (servers.length > 1) ...[
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            for (var i = 0; i < servers.length; i++)
                              TvButton(
                                label: servers[i].serverName,
                                selected: i == _serverIndex,
                                compact: true,
                                onPressed: () =>
                                    setState(() => _serverIndex = i),
                              ),
                          ],
                        ),
                        const SizedBox(height: 18),
                      ],
                      if (activeServer != null)
                        EpisodePicker(
                          episodes: activeServer.items,
                          onSelect: (i) => _watch(episodeIndex: i),
                        ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Backdrop extends StatelessWidget {
  const _Backdrop({
    required this.display,
    required this.detail,
    required this.onBack,
    required this.onPlay,
    required this.horizontalPadding,
  });

  /// Movie or MovieDetail — whatever is available for painting right now.
  final Movie display;
  final MovieDetail? detail;
  final VoidCallback onBack;
  final VoidCallback? onPlay;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final height = tv ? 470.0 : (context.isPhone ? 400.0 : 440.0);
    final width = MediaQuery.sizeOf(context).width.round();
    final d = detail;

    final chips = <String>[
      display.year,
      display.time,
      display.quality,
      display.lang,
      display.episodeCurrent,
      ...?d?.categories.take(3),
    ].where((v) => v.trim().isNotEmpty).toList();

    return SizedBox(
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (display.backdrop.isNotEmpty)
            CachedNetworkImage(
              imageUrl: display.backdrop,
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
              memCacheWidth: width,
              placeholder: (context, _) =>
                  Container(color: AppColors.surfaceHigh),
              errorWidget: (context, _, __) =>
                  Container(color: AppColors.surfaceHigh),
            )
          else
            Container(color: AppColors.surfaceHigh),
          const DecoratedBox(
            decoration: BoxDecoration(gradient: AppColors.scrim),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
                horizontalPadding, 14, horizontalPadding, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: TvIconButton(
                    icon: Icons.arrow_back_rounded,
                    tooltip: 'Quay lại',
                    onPressed: onBack,
                  ),
                ),
                const Spacer(),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (!context.isPhone && display.poster.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(right: 22),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: CachedNetworkImage(
                            imageUrl: display.poster,
                            width: tv ? 170 : 130,
                            height: tv ? 255 : 195,
                            fit: BoxFit.cover,
                            memCacheWidth: (tv ? 170 : 130) * 2,
                            errorWidget: (context, _, __) => Container(
                              width: tv ? 170 : 130,
                              height: tv ? 255 : 195,
                              color: AppColors.surfaceHigh,
                            ),
                          ),
                        ),
                      ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            display.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: (tv
                                    ? Theme.of(context).textTheme.displaySmall
                                    : Theme.of(context)
                                        .textTheme
                                        .headlineSmall)
                                ?.copyWith(
                              shadows: const [
                                Shadow(color: Colors.black87, blurRadius: 12),
                              ],
                            ),
                          ),
                          if (display.originName.trim().isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              display.originName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final chip in chips)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color:
                                        Colors.white.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(7),
                                    border: Border.all(color: Colors.white24),
                                  ),
                                  child: Text(
                                    chip,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                            color: AppColors.textPrimary),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              TvButton(
                                label: onPlay == null
                                    ? 'Đang tải...'
                                    : 'Xem ngay',
                                icon: Icons.play_arrow_rounded,
                                filled: true,
                                autofocus: true,
                                onPressed: onPlay,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textMuted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ),
      ],
    );
  }
}
