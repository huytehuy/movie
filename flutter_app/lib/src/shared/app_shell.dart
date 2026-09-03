import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/auth/auth_service.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class _NavDestination {
  const _NavDestination(this.label, this.icon, this.path);

  final String label;
  final IconData icon;
  final String path;
}

const List<_NavDestination> _destinations = [
  _NavDestination('Trang chủ', Icons.home_rounded, '/'),
  _NavDestination('Tìm kiếm', Icons.search_rounded, '/search'),
  _NavDestination('Phim lẻ', Icons.movie_creation_rounded, '/list/phim-le'),
  _NavDestination('Phim bộ', Icons.live_tv_rounded, '/list/phim-bo'),
  _NavDestination('Hoạt hình', Icons.animation_rounded, '/list/hoat-hinh'),
  _NavDestination('TV Shows', Icons.tv_rounded, '/list/tv-shows'),
];

/// App chrome: a side rail on TV/desktop, a bottom bar on phones.
///
/// The rail is reached with an EXPLICIT key contract rather than by relying on
/// Flutter's geometric focus traversal. go_router's [ShellRoute] builds a nested
/// [Navigator], and every route inside it gets its own [FocusScopeNode] whose
/// `directionalTraversalEdgeBehavior` defaults to [TraversalEdgeBehavior.stop]
/// (see `kDefaultRouteDirectionalTraversalEdgeBehavior`). The rail lives outside
/// that scope, so a D-pad press at the left edge simply stopped — the rail was
/// structurally unreachable no matter how many times LEFT was pressed.
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  /// Scopes let us ask "where is the focus right now?" and move it deliberately.
  final FocusScopeNode _railScope = FocusScopeNode(debugLabel: 'nav-rail');
  final FocusScopeNode _contentScope = FocusScopeNode(debugLabel: 'content');

  /// Focus nodes for the rail entries, so the rail can open on the item that
  /// matches the current route instead of always jumping to "Trang chủ".
  late final List<FocusNode> _railNodes = List.generate(
    _destinations.length + 1,
    (i) => FocusNode(debugLabel: 'rail-$i'),
  );

  /// The rail stays narrow until the remote moves into it, mirroring the
  /// behaviour TV users already know from Google TV / Netflix.
  bool _railExpanded = false;

  @override
  void dispose() {
    _railScope.dispose();
    _contentScope.dispose();
    for (final node in _railNodes) {
      node.dispose();
    }
    super.dispose();
  }

  String get _currentPath => GoRouterState.of(context).uri.path;

  bool _isActive(String path) {
    final current = _currentPath;
    if (path == '/') return current == '/';
    return current == path || current.startsWith('$path/');
  }

  int get _activeIndex {
    final index = _destinations.indexWhere((d) => _isActive(d.path));
    return index < 0 ? 0 : index;
  }

  void _go(String path) {
    if (_currentPath != path) context.go(path);
  }

  // -------------------------------------------------------- focus management

  bool get _focusInRail => _railScope.hasFocus;

  void _focusRail() {
    setState(() => _railExpanded = true);
    final remembered = _railScope.focusedChild;
    if (remembered != null && remembered.canRequestFocus) {
      remembered.requestFocus();
      return;
    }
    final node = _railNodes[_activeIndex];
    if (node.canRequestFocus && node.context != null) {
      node.requestFocus();
    } else {
      _railScope.requestFocus();
      _railScope.nextFocus();
    }
  }

  void _focusContent() {
    setState(() => _railExpanded = false);
    final remembered = _contentScope.focusedChild;
    if (remembered != null && remembered.canRequestFocus) {
      remembered.requestFocus();
      return;
    }
    // Nothing has ever been focused in this route: let the traversal policy
    // pick the first candidate.
    _contentScope.requestFocus();
    _contentScope.nextFocus();
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    final isArrow = key == LogicalKeyboardKey.arrowLeft ||
        key == LogicalKeyboardKey.arrowRight ||
        key == LogicalKeyboardKey.arrowUp ||
        key == LogicalKeyboardKey.arrowDown;

    // A remote must never be dead: if nothing holds focus, the first press
    // gives it to the content.
    if (isArrow && !_railScope.hasFocus && !_contentScope.hasFocus) {
      _focusContent();
      return KeyEventResult.handled;
    }

    if (key == LogicalKeyboardKey.arrowLeft) {
      if (_focusInRail) return KeyEventResult.handled; // Already leftmost.
      final moved =
          FocusManager.instance.primaryFocus?.focusInDirection(
                TraversalDirection.left,
              ) ??
              false;
      if (!moved) _focusRail();
      return KeyEventResult.handled;
    }

    if (key == LogicalKeyboardKey.arrowRight && _focusInRail) {
      _focusContent();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  /// BACK contract: sub-page -> home, home content -> rail, rail -> exit.
  /// Every press moves somewhere predictable and the user is never stranded.
  void _handleBack(bool didPop) {
    if (didPop) return;
    if (_currentPath != '/') {
      context.go('/');
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focusContent();
      });
      return;
    }
    if (!_focusInRail) {
      _focusRail();
      return;
    }
    SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    final wide = context.isWide;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) => _handleBack(didPop),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Focus(
            // Purely a key interceptor: it must never take focus itself.
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: _handleKey,
            child: wide
                ? Row(
                    children: [
                      FocusScope(node: _railScope, child: _buildRail(context)),
                      Expanded(
                        child: FocusScope(
                          node: _contentScope,
                          child: widget.child,
                        ),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Expanded(
                        child: FocusScope(
                          node: _contentScope,
                          child: widget.child,
                        ),
                      ),
                      FocusScope(node: _railScope, child: _buildBottomBar(context)),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------------- rail

  Widget _buildRail(BuildContext context) {
    final expanded = _railExpanded;

    return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        width: expanded ? 248 : 86,
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(right: BorderSide(color: AppColors.surfaceOutline)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 22),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: AppColors.accentGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.local_movies_rounded,
                        color: Colors.white, size: 22),
                  ),
                  if (expanded) ...[
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'HuyTeHuy',
                        maxLines: 1,
                        overflow: TextOverflow.clip,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 26),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (var i = 0; i < _destinations.length; i++)
                    _RailItem(
                      destination: _destinations[i],
                      focusNode: _railNodes[i],
                      expanded: expanded,
                      selected: _isActive(_destinations[i].path),
                      onTap: () {
                        _go(_destinations[i].path);
                        // Hand control straight back to the content: the user
                        // picked a section, they want to browse it.
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted) _focusContent();
                        });
                      },
                      onFocusChange: (focused) {
                        if (focused && !_railExpanded) {
                          setState(() => _railExpanded = true);
                        }
                      },
                    ),
                  AnimatedBuilder(
                    animation: AuthService(),
                    builder: (context, _) {
                      if (!AuthService().isAvailable) return const SizedBox();
                      return _RailItem(
                        destination: const _NavDestination(
                            'Lịch sử', Icons.history_rounded, '/history'),
                        focusNode: _railNodes.last,
                        expanded: expanded,
                        selected: _isActive('/history'),
                        onTap: () {
                          _go('/history');
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted) _focusContent();
                          });
                        },
                        onFocusChange: (focused) {
                          if (focused && !_railExpanded) {
                            setState(() => _railExpanded = true);
                          }
                        },
                      );
                    },
                  ),
                ],
              ),
            ),
            if (expanded)
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
                child: Text(
                  '▶ để quay lại danh sách phim',
                  maxLines: 2,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              )
            else
              const SizedBox(height: 18),
        ],
      ),
    );
  }

  // -------------------------------------------------------------- bottom bar

  Widget _buildBottomBar(BuildContext context) {
    // Phones get the four most-used destinations; the rest live on the home
    // screen rails.
    final items = _destinations.take(4).toList();

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.surfaceOutline)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: Focusable(
                focusNode: _railNodes[i],
                onTap: () => _go(items[i].path),
                scale: 1.0,
                showRing: false,
                borderRadius: BorderRadius.circular(12),
                builder: (context, focused) {
                  final active = _isActive(items[i].path);
                  final color =
                      active ? AppColors.accent : AppColors.textMuted;
                  return Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: focused
                          ? AppColors.surfaceHigh
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(items[i].icon, color: color, size: 22),
                        const SizedBox(height: 4),
                        Text(
                          items[i].label,
                          style: TextStyle(
                              color: color,
                              fontSize: 11,
                              fontWeight: FontWeight.w600),
                        ),
                      ],
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

class _RailItem extends StatelessWidget {
  const _RailItem({
    required this.destination,
    required this.focusNode,
    required this.expanded,
    required this.selected,
    required this.onTap,
    required this.onFocusChange,
  });

  final _NavDestination destination;
  final FocusNode focusNode;
  final bool expanded;
  final bool selected;
  final VoidCallback onTap;
  final ValueChanged<bool> onFocusChange;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Focusable(
        focusNode: focusNode,
        onTap: onTap,
        onFocusChange: onFocusChange,
        scale: 1.0,
        glow: false,
        ringWidth: 2,
        borderRadius: BorderRadius.circular(12),
        builder: (context, focused) {
          final Color fg;
          if (focused) {
            fg = AppColors.textPrimary;
          } else if (selected) {
            fg = AppColors.accentSoft;
          } else {
            fg = AppColors.textSecondary;
          }

          return Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: focused
                  ? AppColors.accent.withValues(alpha: 0.24)
                  : selected
                      ? AppColors.surfaceHigh
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(destination.icon, color: fg, size: 24),
                if (expanded) ...[
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      destination.label,
                      maxLines: 1,
                      overflow: TextOverflow.clip,
                      softWrap: false,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(color: fg),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Section heading with the accent bar used on every content page.
class SectionTitle extends StatelessWidget {
  const SectionTitle({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: Device.isTv ? 26 : 20,
          decoration: BoxDecoration(
            gradient: AppColors.accentGradient,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
  }
}
