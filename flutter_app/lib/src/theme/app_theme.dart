import 'package:flutter/material.dart';

/// Colour + spacing tokens for the app. Dark-only: it reads well on a phone at
/// night and it is the right default for a television.
class AppColors {
  AppColors._();

  static const Color background = Color(0xFF07080C);
  static const Color surface = Color(0xFF11141C);
  static const Color surfaceHigh = Color(0xFF1A1F2A);
  static const Color surfaceOutline = Color(0xFF262C3A);

  static const Color accent = Color(0xFFFF3B5C);
  static const Color accentSoft = Color(0xFFFF7A8F);
  static const Color gold = Color(0xFFFFC542);

  static const Color textPrimary = Color(0xFFF4F6FA);
  static const Color textSecondary = Color(0xFF9AA3B5);
  static const Color textMuted = Color(0xFF6B7385);

  /// Ring drawn around whatever the remote is pointing at.
  static const Color focus = Color(0xFFFFFFFF);

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFFFF3B5C), Color(0xFFFF7A3D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Fades a backdrop image into the page background.
  static const LinearGradient scrim = LinearGradient(
    colors: [
      Color(0x0007080C),
      Color(0x9907080C),
      Color(0xFF07080C),
    ],
    stops: [0.0, 0.55, 1.0],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

class AppTheme {
  AppTheme._();

  /// [textScale] is bumped on TV so labels stay readable from a sofa.
  static ThemeData dark({double textScale = 1.0}) {
    final base = ThemeData.dark(useMaterial3: true);

    // Both families are bundled assets (see pubspec.yaml), so no network round
    // trip is needed before the first frame paints.
    TextStyle heading(double size, FontWeight weight) => TextStyle(
          fontFamily: 'Outfit',
          fontSize: size * textScale,
          fontWeight: weight,
          color: AppColors.textPrimary,
          height: 1.2,
        );

    TextStyle body(double size, FontWeight weight, Color color) => TextStyle(
          fontFamily: 'Inter',
          fontSize: size * textScale,
          fontWeight: weight,
          color: color,
          height: 1.45,
        );

   return base.copyWith(
      // ĐÃ XÓA: fontFamily: 'Inter', (vì copyWith không hỗ trợ)
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.accent,
        secondary: AppColors.gold,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        surfaceContainerHighest: AppColors.surfaceHigh,
        outline: AppColors.surfaceOutline,
      ),
      textTheme: TextTheme(
        displaySmall: heading(38, FontWeight.w700),
        headlineMedium: heading(30, FontWeight.w700),
        headlineSmall: heading(24, FontWeight.w700),
        titleLarge: heading(20, FontWeight.w600),
        titleMedium: heading(17, FontWeight.w600),
        titleSmall: body(15, FontWeight.w600, AppColors.textPrimary),
        bodyLarge: body(15, FontWeight.w400, AppColors.textPrimary),
        bodyMedium: body(14, FontWeight.w400, AppColors.textSecondary),
        bodySmall: body(12.5, FontWeight.w400, AppColors.textMuted),
        labelLarge: body(14, FontWeight.w600, AppColors.textPrimary),
      ).apply(fontFamily: 'Inter'), // THÊM FONT VÀO ĐÂY
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: heading(20, FontWeight.w600),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.surfaceOutline,
        thickness: 1,
        space: 1,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.accent,
      ),
      iconTheme: const IconThemeData(color: AppColors.textSecondary),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceHigh,
        contentTextStyle: body(14, FontWeight.w500, AppColors.textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceHigh,
        hintStyle: body(15, FontWeight.w400, AppColors.textMuted),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.surfaceOutline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent, width: 2),
        ),
      ),
    );
  }
}
