import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/movie_grid.dart';
import 'package:flutter_app/src/shared/states.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

/// Suggestions so a remote user can get results without typing a word.
const List<String> _quickSearches = [
  'Marvel',
  'Anime',
  'Hàn Quốc',
  'Trung Quốc',
  'Hành động',
  'Kinh dị',
  'Hoạt hình',
  'Cổ trang',
  'Ngôn tình',
  'Chiếu rạp',
];

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, this.query = ''});

  final String query;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final MovieService _service = MovieService();
  final TextEditingController _controller = TextEditingController();
  final FocusNode _fieldFocus = FocusNode();

  List<Movie> _results = [];
  bool _loading = false;
  bool _searched = false;
  String _keyword = '';

  @override
  void initState() {
    super.initState();
    if (widget.query.isNotEmpty) {
      _controller.text = widget.query;
      _run(widget.query);
    }
  }

  @override
  void didUpdateWidget(SearchScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query != widget.query && widget.query.isNotEmpty) {
      _controller.text = widget.query;
      _run(widget.query);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _fieldFocus.dispose();
    super.dispose();
  }

  Future<void> _run(String keyword) async {
    final trimmed = keyword.trim();
    if (trimmed.isEmpty) return;

    // Close the on-screen keyboard so the results are visible on a TV.
    _fieldFocus.unfocus();

    setState(() {
      _loading = true;
      _searched = true;
      _keyword = trimmed;
    });

    final page = await _service.search(trimmed);
    if (!mounted) return;
    setState(() {
      _results = page.items;
      _loading = false;
    });
  }

  /// TV typing path.
  ///
  /// An inline [TextField] is a focus trap on a television: while it holds
  /// focus, EditableText consumes the arrow keys for caret movement, so the
  /// D-pad can never leave it. A dialog is its own focus scope and BACK closes
  /// it, so the remote always has a way out.
  Future<void> _promptKeyword() async {
    final result = await showDialog<String>(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => _KeywordDialog(initial: _controller.text),
    );
    if (result == null || !mounted) return;
    _controller.text = result;
    _run(result);
  }

  @override
  Widget build(BuildContext context) {
    final tv = Device.isTv;
    final hPad = tv ? 44.0 : 16.0;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(hPad, tv ? 32 : 20, hPad, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle(title: 'Tìm kiếm'),
                const SizedBox(height: 16),
                if (tv)
                  _SearchBoxButton(
                    keyword: _controller.text,
                    onPressed: _promptKeyword,
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 620),
                          child: TextField(
                            controller: _controller,
                            focusNode: _fieldFocus,
                            textInputAction: TextInputAction.search,
                            style: Theme.of(context).textTheme.bodyLarge,
                            cursorColor: AppColors.accent,
                            decoration: const InputDecoration(
                              hintText: 'Nhập tên phim...',
                              prefixIcon: Icon(Icons.search_rounded,
                                  color: AppColors.textMuted),
                            ),
                            onSubmitted: _run,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      TvButton(
                        label: 'Tìm',
                        icon: Icons.travel_explore_rounded,
                        filled: true,
                        onPressed: () => _run(_controller.text),
                      ),
                    ],
                  ),
                const SizedBox(height: 18),
                Text('Gợi ý', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final term in _quickSearches)
                      TvButton(
                        label: term,
                        compact: true,
                        selected: _keyword == term,
                        onPressed: () {
                          _controller.text = term;
                          _run(term);
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 22),
                if (_searched && !_loading)
                  Text(
                    'Kết quả cho "$_keyword" — ${_results.length} phim',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
              ],
            ),
          ),
        ),
        if (_loading)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: LoadingState(message: 'Đang tìm...'),
          )
        else if (_searched && _results.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: EmptyState(
              message: 'Không tìm thấy phim nào cho "$_keyword"',
              icon: Icons.search_off_rounded,
            ),
          )
        else if (_results.isNotEmpty)
          MovieGrid(
            movies: _results,
            onSelect: (movie) =>
                context.push('/detail/${movie.slug}', extra: movie),
          )
        else
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: EmptyState(
                message: 'Chọn một gợi ý hoặc nhập tên phim để bắt đầu',
                icon: Icons.travel_explore_rounded,
              ),
            ),
          ),
      ],
    );
  }
}

class _SearchBoxButton extends StatelessWidget {
  const _SearchBoxButton({required this.keyword, required this.onPressed});

  final String keyword;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 720),
      child: Focusable(
        autofocus: true,
        onTap: onPressed,
        scale: 1.02,
        borderRadius: BorderRadius.circular(14),
        builder: (context, focused) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: BoxDecoration(
            color: focused ? AppColors.surfaceHigh : AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.surfaceOutline),
          ),
          child: Row(
            children: [
              const Icon(Icons.search_rounded, color: AppColors.textMuted),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  keyword.isEmpty ? 'Nhấn OK để nhập tên phim' : keyword,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: keyword.isEmpty
                            ? AppColors.textMuted
                            : AppColors.textPrimary,
                      ),
                ),
              ),
              const Icon(Icons.keyboard_rounded, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _KeywordDialog extends StatefulWidget {
  const _KeywordDialog({required this.initial});

  final String initial;

  @override
  State<_KeywordDialog> createState() => _KeywordDialogState();
}

class _KeywordDialogState extends State<_KeywordDialog> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _controller.text.trim();
    if (value.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 60, vertical: 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tìm phim', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 18),
            TextField(
              controller: _controller,
              autofocus: true,
              textInputAction: TextInputAction.search,
              style: Theme.of(context).textTheme.bodyLarge,
              cursorColor: AppColors.accent,
              decoration: const InputDecoration(hintText: 'Tên phim...'),
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TvButton(
                  label: 'Huỷ',
                  compact: true,
                  onPressed: () => Navigator.of(context).pop(),
                ),
                const SizedBox(width: 12),
                TvButton(
                  label: 'Tìm',
                  icon: Icons.search_rounded,
                  filled: true,
                  compact: true,
                  onPressed: _submit,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
