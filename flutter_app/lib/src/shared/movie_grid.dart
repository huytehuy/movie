import 'package:flutter/material.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/shared/movie_card.dart';

/// Responsive poster grid: 2 columns on a phone up to 6 on a television.
class MovieGrid extends StatelessWidget {
  const MovieGrid({
    super.key,
    required this.movies,
    required this.onSelect,
    this.autofocusFirst = false,
    this.padding,
  });

  final List<Movie> movies;
  final ValueChanged<Movie> onSelect;
  final bool autofocusFirst;
  final EdgeInsets? padding;

  static int columnsFor(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (Device.isTv) return width >= 1500 ? 6 : 5;
    if (width < 420) return 2;
    if (width < 700) return 3;
    if (width < 1000) return 4;
    if (width < 1400) return 5;
    return 6;
  }

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final columns = columnsFor(context);
    final spacing = tv ? 22.0 : 14.0;

    return SliverPadding(
      padding: padding ??
          EdgeInsets.fromLTRB(tv ? 44 : 16, 8, tv ? 44 : 16, 28),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          crossAxisSpacing: spacing,
          mainAxisSpacing: spacing + 6,
          // 2:3 poster plus the two-line caption.
          childAspectRatio: 1 / (1.5 + (tv ? 0.30 : 0.36)),
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final movie = movies[index];
            return MovieCard(
              movie: movie,
              autofocus: autofocusFirst && index == 0,
              onTap: () => onSelect(movie),
            );
          },
          childCount: movies.length,
        ),
      ),
    );
  }
}
