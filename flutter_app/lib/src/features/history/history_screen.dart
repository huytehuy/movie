import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/watch_log_service.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/movie_grid.dart';
import 'package:flutter_app/src/shared/states.dart';

/// Lịch sử xem của chính máy này, đọc từ bộ nhớ máy — không cần đăng nhập.
/// Log tổng hợp của mọi thiết bị nằm ở trang /admin trên web.
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late List<WatchHistoryItem> _items = WatchLogService().history;

  Future<void> _clear() async {
    await WatchLogService().clearHistory();
    if (mounted) setState(() => _items = const []);
  }

  @override
  Widget build(BuildContext context) {
    final hPad = Device.isTv ? 44.0 : 16.0;

    if (_items.isEmpty) {
      return const EmptyState(
        message: 'Chưa có lịch sử xem phim',
        icon: Icons.history_rounded,
      );
    }

    final movies = _items
        .map((item) => Movie(
              name: item.filmName.isEmpty ? 'Không rõ tên' : item.filmName,
              slug: item.filmId,
              thumbUrl: item.image,
              episodeCurrent: item.episodeName,
            ))
        .where((movie) => movie.slug.isNotEmpty)
        .toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(hPad, Device.isTv ? 32 : 20, hPad, 16),
            child: SectionTitle(
              title: 'Lịch sử xem',
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${movies.length} phim',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(width: 12),
                  TvButton(
                    label: 'Xoá',
                    icon: Icons.delete_outline_rounded,
                    onPressed: _clear,
                  ),
                ],
              ),
            ),
          ),
        ),
        MovieGrid(
          movies: movies,
          autofocusFirst: Device.isTv,
          onSelect: (movie) =>
              context.push('/detail/${movie.slug}', extra: movie),
        ),
      ],
    );
  }
}
