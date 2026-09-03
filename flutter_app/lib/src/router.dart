import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/features/category/category_screen.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/features/history/history_screen.dart';
import 'package:flutter_app/src/features/home/home_screen.dart';
import 'package:flutter_app/src/features/movie_detail/movie_detail_screen.dart';
import 'package:flutter_app/src/features/search/search_screen.dart';
import 'package:flutter_app/src/features/watch/watch_screen.dart';
import 'package:flutter_app/src/shared/app_shell.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    // The player takes over the whole screen, so it lives outside the shell.
    GoRoute(
      path: '/watch/:slug',
      builder: (context, state) => WatchScreen(
        slug: state.pathParameters['slug']!,
        serverIndex: int.tryParse(state.uri.queryParameters['server'] ?? '') ?? 0,
        episodeIndex: int.tryParse(state.uri.queryParameters['ep'] ?? '') ?? 0,
      ),
    ),
    GoRoute(
      path: '/detail/:slug',
      builder: (context, state) => MovieDetailScreen(
        slug: state.pathParameters['slug']!,
        // The card the user pressed, so the page paints immediately.
        seed: state.extra is Movie ? state.extra as Movie : null,
      ),
    ),
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/list/:slug',
          builder: (context, state) =>
              CategoryScreen(slug: state.pathParameters['slug']!),
        ),
        GoRoute(
          path: '/search',
          builder: (context, state) =>
              SearchScreen(query: state.uri.queryParameters['q'] ?? ''),
        ),
        GoRoute(
          path: '/history',
          builder: (context, state) => const HistoryScreen(),
        ),
      ],
    ),
  ],
);
