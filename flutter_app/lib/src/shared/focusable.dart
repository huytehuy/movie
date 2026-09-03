import 'package:flutter/material.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

/// Scrolls a newly focused widget into view with the *smallest* movement that
/// makes it visible, animated.
///
/// This replaces an earlier version that called
/// `Scrollable.ensureVisible(alignment: 0.5)` on every focus change. Forcing the
/// focused card to the centre of the screen meant the highlight never appeared
/// to move: pressing LEFT scrolled the row underneath a stationary highlight,
/// so reaching the first card of a row (and from there the nav rail) felt
/// impossible. Flutter's own default already does a minimal scroll via
/// [ScrollPositionAlignmentPolicy]; all this adds is an animation.
void tvRequestFocus(
  FocusNode node, {
  ScrollPositionAlignmentPolicy? alignmentPolicy,
  double? alignment,
  Duration? duration,
  Curve? curve,
}) {
  node.requestFocus();
  final context = node.context;
  if (context == null) return;
  Scrollable.ensureVisible(
    context,
    alignment: alignment ?? 1,
    alignmentPolicy: alignmentPolicy ?? ScrollPositionAlignmentPolicy.explicit,
    duration: duration ?? const Duration(milliseconds: 200),
    curve: curve ?? Curves.easeOutCubic,
  );
}

/// Installs [tvRequestFocus] for every directional move in the subtree.
class TvFocusTraversal extends StatelessWidget {
  const TvFocusTraversal({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return FocusTraversalGroup(
      policy: ReadingOrderTraversalPolicy(requestFocusCallback: tvRequestFocus),
      child: child,
    );
  }
}

/// A tappable *and* focusable surface.
///
/// Every interactive element in the app is built from this. Using [InkWell]
/// underneath means the D-pad centre button works for free: Flutter maps
/// KEYCODE_DPAD_CENTER to LogicalKeyboardKey.select, which its default
/// shortcuts turn into an ActivateIntent, and [InkWell] handles that by calling
/// onTap. A plain [GestureDetector] cannot take focus at all, which is why a
/// remote could not reach anything before.
class Focusable extends StatefulWidget {
  const Focusable({
    super.key,
    required this.builder,
    this.onTap,
    this.onLongPress,
    this.autofocus = false,
    this.focusNode,
    this.scale = 1.06,
    this.borderRadius = const BorderRadius.all(Radius.circular(14)),
    this.showRing = true,
    this.ringWidth = 3,
    this.ringColor,
    this.glow = true,
    this.onFocusChange,
  });

  final Widget Function(BuildContext context, bool focused) builder;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool autofocus;
  final FocusNode? focusNode;
  final double scale;
  final BorderRadius borderRadius;
  final bool showRing;
  final double ringWidth;
  final Color? ringColor;
  final bool glow;
  final ValueChanged<bool>? onFocusChange;

  @override
  State<Focusable> createState() => _FocusableState();
}

class _FocusableState extends State<Focusable> {
  bool _focused = false;

  void _handleFocusChange(bool focused) {
    if (_focused != focused && mounted) {
      setState(() => _focused = focused);
    }
    widget.onFocusChange?.call(focused);
  }

  @override
  Widget build(BuildContext context) {
    final ring = widget.ringColor ?? AppColors.focus;

    Widget content = Material(
      color: Colors.transparent,
      borderRadius: widget.borderRadius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        focusNode: widget.focusNode,
        autofocus: widget.autofocus,
        onFocusChange: _handleFocusChange,
        onTap: widget.onTap,
        onLongPress: widget.onLongPress,
        borderRadius: widget.borderRadius,
        // The ring below is the focus affordance; the default flood fill would
        // wash out poster art.
        focusColor: Colors.transparent,
        highlightColor: Colors.white10,
        splashColor: Colors.white24,
        hoverColor: Colors.white10,
        child: widget.builder(context, _focused),
      ),
    );

    if (widget.showRing) {
      content = AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          borderRadius: widget.borderRadius,
          // The glow is a real repaint cost on a weak TV GPU, so it is only
          // drawn for the handful of widgets that ask for it.
          boxShadow: _focused && widget.glow
              ? [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.4),
                    blurRadius: 18,
                  ),
                ]
              : const [],
        ),
        // A foreground decoration paints over the child instead of insetting
        // it, so gaining focus never nudges the layout.
        foregroundDecoration: BoxDecoration(
          borderRadius: widget.borderRadius,
          border: Border.all(
            color: _focused ? ring : Colors.transparent,
            width: widget.ringWidth,
          ),
        ),
        child: content,
      );
    }

    return AnimatedScale(
      scale: _focused ? widget.scale : 1.0,
      duration: const Duration(milliseconds: 140),
      curve: Curves.easeOut,
      child: content,
    );
  }
}

/// Pill-shaped button used for actions (Play, server names, episodes...).
class TvButton extends StatelessWidget {
  const TvButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.selected = false,
    this.filled = false,
    this.autofocus = false,
    this.compact = false,
    this.focusNode,
    this.onFocusChange,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;

  /// Currently active choice (e.g. the episode being watched).
  final bool selected;

  /// Primary call to action, painted with the accent gradient.
  final bool filled;
  final bool autofocus;
  final bool compact;
  final FocusNode? focusNode;
  final ValueChanged<bool>? onFocusChange;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(compact ? 10 : 999);
    final double vPad = compact ? 9 : (Device.isTv ? 15 : 12);
    final double hPad = compact ? 14 : (Device.isTv ? 26 : 20);

    return Focusable(
      autofocus: autofocus,
      focusNode: focusNode,
      onTap: onPressed,
      onFocusChange: onFocusChange,
      scale: 1.05,
      borderRadius: radius,
      glow: filled || selected,
      builder: (context, focused) {
        final Color bg;
        final Color fg;
        if (filled) {
          bg = Colors.transparent;
          fg = Colors.white;
        } else if (focused) {
          bg = AppColors.surfaceHigh;
          fg = AppColors.textPrimary;
        } else if (selected) {
          bg = AppColors.accent.withValues(alpha: 0.22);
          fg = AppColors.accentSoft;
        } else {
          bg = AppColors.surface;
          fg = AppColors.textSecondary;
        }

        return Container(
          padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
          decoration: BoxDecoration(
            color: bg,
            gradient: filled ? AppColors.accentGradient : null,
            borderRadius: radius,
            border: Border.all(
              color: selected
                  ? AppColors.accent.withValues(alpha: 0.6)
                  : AppColors.surfaceOutline,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: compact ? 16 : 20, color: fg),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: fg,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Circular icon-only button (search, back, avatar...).
class TvIconButton extends StatelessWidget {
  const TvIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.autofocus = false,
    this.size = 22,
    this.focusNode,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final bool autofocus;
  final double size;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;

    final button = Focusable(
      autofocus: autofocus,
      focusNode: focusNode,
      onTap: onPressed,
      scale: 1.12,
      glow: false,
      borderRadius: BorderRadius.circular(999),
      builder: (context, focused) => Container(
        padding: EdgeInsets.all(Device.isTv ? 13 : 10),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: focused ? AppColors.surfaceHigh : AppColors.surface,
          border: Border.all(color: AppColors.surfaceOutline),
        ),
        child: Icon(
          icon,
          size: size,
          color: !enabled
              ? AppColors.textMuted.withValues(alpha: 0.4)
              : (focused ? AppColors.textPrimary : AppColors.textSecondary),
        ),
      ),
    );

    return tooltip == null ? button : Tooltip(message: tooltip!, child: button);
  }
}
