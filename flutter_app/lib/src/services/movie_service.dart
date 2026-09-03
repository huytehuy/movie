import 'package:dio/dio.dart';

import 'package:flutter_app/src/features/home/movie_detail_model.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';

/// A page of results plus the paging info needed by the "load more" button.
class MoviePage {
  const MoviePage({
    required this.items,
    required this.page,
    required this.totalPages,
  });

  final List<Movie> items;
  final int page;
  final int totalPages;

  bool get hasMore => page < totalPages;

  static const MoviePage empty = MoviePage(items: [], page: 1, totalPages: 1);
}

/// Catalogue rails shown on the home screen.
class Rail {
  const Rail({required this.title, required this.slug});

  final String title;
  final String slug;
}

class MovieService {
  MovieService._internal() {
    _dio.options
      ..connectTimeout = const Duration(seconds: 15)
      ..receiveTimeout = const Duration(seconds: 20)
      ..headers = const {'Accept': 'application/json'};
  }

  static final MovieService _instance = MovieService._internal();
  factory MovieService() => _instance;

  final Dio _dio = Dio();

  /// Primary catalogue. Returns `link_m3u8` for every episode, which is what
  /// lets the native player (and the TV remote) work.
  static const String _primary = 'https://phimapi.com';

  /// Last-resort detail source; embed-only.
  static const String _fallbackDetail = 'https://phim.nguonc.com/api/film';

  static const List<Rail> homeRails = [
    Rail(title: 'Mới cập nhật', slug: 'phim-moi-cap-nhat'),
    Rail(title: 'Phim lẻ', slug: 'phim-le'),
    Rail(title: 'Phim bộ', slug: 'phim-bo'),
    Rail(title: 'Hoạt hình', slug: 'hoat-hinh'),
    Rail(title: 'TV Shows', slug: 'tv-shows'),
  ];

  /// Simple in-memory cache so going back to the home screen is instant.
  final Map<String, MoviePage> _listCache = {};
  final Map<String, MovieDetail> _detailCache = {};

  /// In-flight detail requests, so a prefetch and a real open share one call.
  final Map<String, Future<MovieDetail>> _pendingDetails = {};

  /// Warms the cache for a movie the user is merely pointing at. Errors are
  /// swallowed: this is opportunistic.
  void prefetchDetail(String slug) {
    if (slug.isEmpty || _detailCache.containsKey(slug)) return;
    if (_pendingDetails.containsKey(slug)) return;
    // Deliberately fire-and-forget, with the error swallowed: a prefetch that
    // fails must never surface to the user or crash the zone.
    fetchMovieDetail(slug).then((_) {}).catchError((Object _) {});
  }

  // ---------------------------------------------------------------- listings

  Future<MoviePage> fetchList(
    String slug, {
    int page = 1,
    int limit = 24,
    bool useCache = true,
  }) async {
    final cacheKey = '$slug:$page:$limit';
    if (useCache && _listCache.containsKey(cacheKey)) {
      return _listCache[cacheKey]!;
    }

    try {
      final response = await _dio.get(
        '$_primary/v1/api/danh-sach/$slug',
        queryParameters: {'page': page, 'limit': limit},
      );
      final result = _parsePage(response.data, page);
      if (result.items.isNotEmpty) _listCache[cacheKey] = result;
      return result;
    } catch (e) {
      return MoviePage(items: const [], page: page, totalPages: page);
    }
  }

  Future<MoviePage> search(String keyword, {int page = 1, int limit = 30}) async {
    if (keyword.trim().isEmpty) return MoviePage.empty;
    try {
      final response = await _dio.get(
        '$_primary/v1/api/tim-kiem',
        queryParameters: {'keyword': keyword, 'page': page, 'limit': limit},
      );
      return _parsePage(response.data, page);
    } catch (e) {
      return MoviePage(items: const [], page: page, totalPages: page);
    }
  }

  MoviePage _parsePage(dynamic raw, int page) {
    if (raw is! Map) return MoviePage(items: const [], page: page, totalPages: page);

    final data = (raw['data'] as Map?)?.cast<String, dynamic>() ?? {};
    final items = (data['items'] as List?) ?? (raw['items'] as List?) ?? const [];
    final cdn = (data['APP_DOMAIN_CDN_IMAGE'] ?? 'https://phimimg.com').toString();

    final params = (data['params'] as Map?)?.cast<String, dynamic>() ?? {};
    final pagination = (params['pagination'] as Map?)?.cast<String, dynamic>() ??
        (raw['paginate'] as Map?)?.cast<String, dynamic>() ??
        {};
    final totalItems = _toInt(pagination['totalItems'] ?? pagination['total_items']);
    final perPage = _toInt(
      pagination['totalItemsPerPage'] ?? pagination['items_per_page'],
    );
    final totalPages = perPage > 0 && totalItems > 0
        ? (totalItems / perPage).ceil()
        : _toInt(pagination['total_page'], fallback: page);

    final movies = items
        .whereType<Map>()
        .map((json) => Movie.fromJson(json.cast<String, dynamic>(), cdn: cdn))
        .where((m) => m.slug.isNotEmpty)
        .toList();

    return MoviePage(
      items: movies,
      page: page,
      totalPages: totalPages < page ? page : totalPages,
    );
  }

  static int _toInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  // ------------------------------------------------------------------ detail

  Future<MovieDetail> fetchMovieDetail(String slug, {bool useCache = true}) {
    if (useCache && _detailCache.containsKey(slug)) {
      return Future.value(_detailCache[slug]!);
    }
    // Collapse duplicate requests: a prefetch triggered by the D-pad resting on
    // a poster and the real open a moment later must not both hit the network.
    final pending = _pendingDetails[slug];
    if (useCache && pending != null) return pending;

    final future = _fetchMovieDetail(slug);
    _pendingDetails[slug] = future;
    return future.whenComplete(() => _pendingDetails.remove(slug));
  }

  Future<MovieDetail> _fetchMovieDetail(String slug) async {
    Object? lastError;

    // 1. phimapi — direct HLS links.
    try {
      final response = await _dio.get('$_primary/phim/$slug');
      if (response.data is Map) {
        final detail =
            MovieDetail.fromPhimApi((response.data as Map).cast<String, dynamic>());
        if (detail.hasPlayableSource) {
          _detailCache[slug] = detail;
          return detail;
        }
      }
    } catch (e) {
      lastError = e;
    }

    // 2. nguonc — embed only, used when the movie is missing upstream.
    try {
      final response = await _dio.get('$_fallbackDetail/$slug');
      if (response.data is Map && response.data['status'] != 'error') {
        final detail =
            MovieDetail.fromNguoncJson((response.data as Map).cast<String, dynamic>());
        if (detail.hasPlayableSource) {
          _detailCache[slug] = detail;
          return detail;
        }
      }
    } catch (e) {
      lastError = e;
    }

    throw Exception(
      'Không tải được thông tin phim "$slug".'
      '${lastError != null ? '\n($lastError)' : ''}',
    );
  }

  void clearCache() {
    _listCache.clear();
    _detailCache.clear();
  }
}
