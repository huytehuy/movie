import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/movie_grid.dart';
import 'package:flutter_app/src/shared/states.dart';

/// Human-readable titles for the catalogue slugs used in the router.
const Map<String, String> kCategoryTitles = {
  'phim-moi-cap-nhat': 'Mới cập nhật',
  'phim-le': 'Phim lẻ',
  'phim-bo': 'Phim bộ',
  'hoat-hinh': 'Hoạt hình',
  'tv-shows': 'TV Shows',
  'phim-vietsub': 'Phim Vietsub',
  'phim-thuyet-minh': 'Phim thuyết minh',
  'phim-long-tieng': 'Phim lồng tiếng',
};

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key, required this.slug});

  final String slug;

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  final MovieService _service = MovieService();

  final List<Movie> _movies = [];
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  int _page = 1;
  int _totalPages = 1;

  String get _title => kCategoryTitles[widget.slug] ?? widget.slug;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(CategoryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slug != widget.slug) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _movies.clear();
      _page = 1;
    });

    final page = await _service.fetchList(widget.slug, page: 1, limit: 30);
    if (!mounted) return;
    setState(() {
      _movies.addAll(page.items);
      _totalPages = page.totalPages;
      _loading = false;
      _error = page.items.isEmpty ? 'Danh mục này chưa có phim nào.' : null;
    });
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _page >= _totalPages) return;
    setState(() => _loadingMore = true);

    final next = _page + 1;
    final page = await _service.fetchList(widget.slug, page: next, limit: 30);
    if (!mounted) return;
    setState(() {
      _movies.addAll(page.items);
      _page = next;
      _totalPages = page.totalPages;
      _loadingMore = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final hPad = tv ? 44.0 : 16.0;

    if (_loading) return LoadingState(message: 'Đang tải $_title...');
    if (_error != null) return ErrorState(message: _error!, onRetry: _load);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(hPad, tv ? 32 : 20, hPad, 16),
            child: SectionTitle(
              title: _title,
              trailing: Text(
                '${_movies.length} phim',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
        ),
        MovieGrid(
          movies: _movies,
          autofocusFirst: tv,
          onSelect: (movie) => context.push('/detail/${movie.slug}', extra: movie),
        ),
        if (_page < _totalPages)
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.only(bottom: 40, left: hPad, right: hPad),
              child: Center(
                child: _loadingMore
                    ? const SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(strokeWidth: 3),
                      )
                    : TvButton(
                        label: 'Xem thêm',
                        icon: Icons.expand_more_rounded,
                        onPressed: _loadMore,
                      ),
              ),
            ),
          ),
      ],
    );
  }
}
