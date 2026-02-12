import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/features/home/home_screen.dart';
import 'package:flutter_app/src/features/movie_detail/movie_detail_screen.dart';
import 'package:flutter_app/src/features/search/search_screen.dart';
import 'package:flutter_app/src/features/history/history_screen.dart';
import 'package:flutter_app/src/features/category/category_screen.dart';

// Placeholder screens for now
class PlaceholderScreen extends StatelessWidget {
  final String title;
  const PlaceholderScreen({super.key, required this.title});
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(title));
  }
}

final router = GoRouter(
  initialLocation: '/',
  routes: [
    ShellRoute(
      builder: (context, state, child) {
        return AppShell(child: child);
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/phim_le',
          builder: (context, state) => const CategoryScreen(title: 'Phim Lẻ', category: 'phim-le'),
        ),
        GoRoute(
          path: '/phim_bo',
          builder: (context, state) => const CategoryScreen(title: 'Phim Bộ', category: 'phim-bo'),
        ),
        GoRoute(
          path: '/phim_dang_chieu',
          builder: (context, state) => const CategoryScreen(title: 'Phim Đang Chiếu', category: 'phim-dang-chieu'),
        ),
        GoRoute(
          path: '/detail/:slug',
          builder: (context, state) {
            final slug = state.pathParameters['slug'];
            if (slug == null) return const PlaceholderScreen(title: "Error: No slug");
            return MovieDetailScreen(slug: slug);
          },
        ),
        GoRoute(
          path: '/search/:query',
          builder: (context, state) {
             final query = state.pathParameters['query'];
             if (query == null) return const PlaceholderScreen(title: "Error: No query");
             return SearchScreen(query: query);
          },
        ),
        GoRoute(
            path: '/history',
            builder: (context, state) => const HistoryScreen()
        )
      ],
    ),
  ],
);
