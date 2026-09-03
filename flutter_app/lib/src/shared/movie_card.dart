import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

/// Poster tile used by the home rails, the category grid and search results.
class MovieCard extends StatelessWidget {
  const MovieCard({
    super.key,
    required this.movie,
    required this.onTap,
    this.width,
    this.autofocus = false,
    this.showTitle = true,
    this.onFocusChange,
  });

  final Movie movie;
  final VoidCallback onTap;
  final double? width;
  final bool autofocus;
  final bool showTitle;

  /// Fired when the D-pad moves onto/off this card, so callers can update a
  /// backdrop or preview panel.
  final ValueChanged<bool>? onFocusChange;

  @override
  Widget build(BuildContext context) {
    final card = Focusable(
      autofocus: autofocus,
      onTap: onTap,
      onFocusChange: onFocusChange,
      borderRadius: BorderRadius.circular(14),
      builder: (context, focused) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                _Poster(url: movie.poster),
                // Darken the bottom so the badges stay legible on bright art.
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.transparent, Color(0xCC000000)],
                      begin: Alignment.center,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                // The year sits top-right and the episode label gets the whole
                // bottom row: "Hoàn Tất (12/12)" needs the width, and sharing a
                // row with the year truncated it to "Tậ…" on a phone.
                if (movie.year.isNotEmpty)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: _Badge(
                      label: movie.year,
                      color: Colors.black.withValues(alpha: 0.62),
                    ),
                  ),
                if (movie.episodeCurrent.isNotEmpty)
                  Positioned(
                    left: 6,
                    right: 6,
                    bottom: 6,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: _Badge(
                        label: movie.episodeCurrent,
                        color: AppColors.accent,
                      ),
                    ),
                  ),
                if (focused)
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.accentGradient,
                      ),
                      child: const Icon(Icons.play_arrow_rounded,
                          color: Colors.white, size: 26),
                    ),
                  ),
              ],
            ),
          ),
          if (showTitle) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Text(
                movie.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: focused
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                    ),
              ),
            ),
          ],
        ],
      ),
    );

    return width == null ? card : SizedBox(width: width, child: card);
  }
}

class _Poster extends StatelessWidget {
  const _Poster({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) return const _PosterFallback();
    final dpr = MediaQuery.devicePixelRatioOf(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final target = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? (constraints.maxWidth * dpr).round()
            : null;
        return CachedNetworkImage(
          imageUrl: url,
          fit: BoxFit.cover,
          // Posters arrive around 1000px wide but are drawn at ~190. Decoding
          // them at full size costs roughly 25x the memory and showed up as
          // dropped frames while the D-pad crossed a rail.
          memCacheWidth: target,
          fadeInDuration: const Duration(milliseconds: 180),
          placeholder: (context, _) => Container(color: AppColors.surfaceHigh),
          errorWidget: (context, _, __) => const _PosterFallback(),
        );
      },
    );
  }
}

class _PosterFallback extends StatelessWidget {
  const _PosterFallback();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceHigh,
      alignment: Alignment.center,
      child: const Icon(Icons.movie_outlined,
          color: AppColors.textMuted, size: 32),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
