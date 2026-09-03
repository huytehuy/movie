import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/movie_card.dart';
import 'package:flutter_app/src/shared/states.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MovieService _service = MovieService();

  final Map<String, List<Movie>> _rails = {};

  /// Rails render as they arrive instead of waiting for all five, so the first
  /// posters appear about as fast as the fastest request.
  int _pending = MovieService.homeRails.length;
  String? _error;

  /// The movie behind the hero banner: whatever the remote is pointing at.
  /// A notifier rather than setState, so moving one card repaints the banner
  /// instead of all five rails and their ~120 cards.
  final ValueNotifier<Movie?> _spotlight = ValueNotifier(null);

  /// Detail prefetch fires only after the D-pad rests on a card, so scrolling
  /// through a rail does not spray requests.
  Timer? _prefetchTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _prefetchTimer?.cancel();
    _spotlight.dispose();
    super.dispose();
  }

  void _load() {
    setState(() {
      _rails.clear();
      _error = null;
      _pending = MovieService.homeRails.length;
    });

    for (final rail in MovieService.homeRails) {
      _service.fetchList(rail.slug).then((page) {
        if (!mounted) return;
        setState(() {
          _pending--;
          if (page.items.isNotEmpty) {
            _rails[rail.slug] = page.items;
            _spotlight.value ??= page.items.first;
          }
          if (_pending == 0 && _rails.isEmpty) {
            _error = 'Không tải được danh sách phim. Kiểm tra kết nối mạng.';
          }
        });
      }).catchError((Object e) {
        if (!mounted) return;
        setState(() {
          _pending--;
          if (_pending == 0 && _rails.isEmpty) _error = e.toString();
        });
      });
    }
  }

  void _openDetail(Movie movie) =>
      context.push('/detail/${movie.slug}', extra: movie);

  void _onCardFocused(Movie movie) {
    _spotlight.value = movie;
    _prefetchTimer?.cancel();
    _prefetchTimer = Timer(const Duration(milliseconds: 700), () {
      _service.prefetchDetail(movie.slug);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return ErrorState(message: _error!, onRetry: _load);
    }
    if (_rails.isEmpty) {
      return const LoadingState(message: 'Đang tải phim...');
    }

    final tv = Device.isTv;
    final horizontal = tv ? 44.0 : 16.0;
    final railSlugs =
        MovieService.homeRails.where((r) => _rails[r.slug] != null).toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: _Hero(
            spotlight: _spotlight,
            onPlay: () {
              final movie = _spotlight.value;
              if (movie != null) _openDetail(movie);
            },
            onSearch: () => context.go('/search'),
          ),
        ),
        for (final rail in railSlugs)
          SliverToBoxAdapter(
            child: _Rail(
              title: rail.title,
              movies: _rails[rail.slug]!,
              horizontalPadding: horizontal,
              // Give the first card initial focus so the remote always has a
              // starting point.
              autofocusFirst: tv && rail.slug == railSlugs.first.slug,
              onSelect: _openDetail,
              onFocus: _onCardFocused,
              onSeeAll: rail.slug == 'phim-moi-cap-nhat'
                  ? null
                  : () => context.go('/list/${rail.slug}'),
            ),
          ),
        if (_pending > 0)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 26),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                ),
              ),
            ),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.spotlight,
    required this.onPlay,
    required this.onSearch,
  });

  final ValueListenable<Movie?> spotlight;
  final VoidCallback onPlay;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final height = tv ? 420.0 : (context.isPhone ? 300.0 : 380.0);
    final padding = tv ? 44.0 : 16.0;
    final width = MediaQuery.sizeOf(context).width.round();

    return SizedBox(
      height: height,
      child: ValueListenableBuilder<Movie?>(
        valueListenable: spotlight,
        builder: (context, m, _) => Stack(
          fit: StackFit.expand,
          children: [
            if (m != null && m.backdrop.isNotEmpty)
              CachedNetworkImage(
                key: ValueKey(m.slug),
                imageUrl: m.backdrop,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                // Decoding a 1500px source at screen width instead of full size
                // keeps a weak TV box from stalling on every focus move.
                memCacheWidth: width,
                fadeInDuration: const Duration(milliseconds: 300),
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
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xEE07080C), Color(0x0007080C)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(padding, 18, padding, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'HuyTeHuy Movies',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: AppColors.textSecondary,
                                  letterSpacing: 1.2,
                                ),
                      ),
                      const Spacer(),
                      if (!context.isWide)
                        TvIconButton(
                          icon: Icons.search_rounded,
                          tooltip: 'Tìm kiếm',
                          onPressed: onSearch,
                        ),
                    ],
                  ),
                  const Spacer(),
                  if (m != null) ...[
                    ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: tv ? 760 : 520),
                      child: Text(
                        m.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: (tv
                                ? Theme.of(context).textTheme.displaySmall
                                : Theme.of(context).textTheme.headlineMedium)
                            ?.copyWith(
                          shadows: const [
                            Shadow(color: Colors.black87, blurRadius: 12),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        for (final chip in [
                          m.year,
                          m.quality,
                          m.lang,
                          m.episodeCurrent,
                        ].where((v) => v.trim().isNotEmpty))
                          _MetaChip(label: chip),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        TvButton(
                          label: 'Xem ngay',
                          icon: Icons.play_arrow_rounded,
                          filled: true,
                          onPressed: onPlay,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(7),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .bodySmall
            ?.copyWith(color: AppColors.textPrimary),
      ),
    );
  }
}

class _Rail extends StatelessWidget {
  const _Rail({
    required this.title,
    required this.movies,
    required this.horizontalPadding,
    required this.onSelect,
    required this.onFocus,
    this.onSeeAll,
    this.autofocusFirst = false,
  });

  final String title;
  final List<Movie> movies;
  final double horizontalPadding;
  final ValueChanged<Movie> onSelect;
  final ValueChanged<Movie> onFocus;
  final VoidCallback? onSeeAll;
  final bool autofocusFirst;

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final cardWidth = tv ? 190.0 : (context.isPhone ? 132.0 : 160.0);
    // 2:3 poster + room for the two-line title, plus slack for the focus scale.
    final railHeight = cardWidth * 1.5 + (tv ? 78 : 62);

    return Padding(
      padding: const EdgeInsets.only(top: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
            child: SectionTitle(
              title: title,
              trailing: onSeeAll == null
                  ? null
                  : TvButton(
                      label: 'Tất cả',
                      compact: true,
                      onPressed: onSeeAll,
                    ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: railHeight,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
              itemCount: movies.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final movie = movies[index];
                return Padding(
                  // Vertical slack so the focus ring is not clipped.
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: MovieCard(
                    movie: movie,
                    width: cardWidth,
                    autofocus: autofocusFirst && index == 0,
                    onTap: () => onSelect(movie),
                    onFocusChange: (focused) {
                      if (focused) onFocus(movie);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
