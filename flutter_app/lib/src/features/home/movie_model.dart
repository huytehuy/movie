/// A poster-level movie summary, as returned by the list/search endpoints.
class Movie {
  Movie({
    required this.name,
    required this.slug,
    required this.thumbUrl,
    this.posterUrl = '',
    this.originName = '',
    this.year = '',
    this.episodeCurrent = '',
    this.quality = '',
    this.lang = '',
    this.time = '',
  });

  final String name;
  final String slug;

  /// Portrait artwork (used on cards).
  final String thumbUrl;

  /// Landscape artwork (used for the hero backdrop).
  final String posterUrl;
  final String originName;
  final String year;

  /// e.g. "Full", "Tập 6", "Hoàn Tất (12/12)".
  final String episodeCurrent;
  final String quality;
  final String lang;
  final String time;

  /// The image CDN used when the API returns bare relative paths.
  static const String _defaultCdn = 'https://phimimg.com';

  static String _absolute(String? raw, String cdn) {
    final value = (raw ?? '').trim();
    if (value.isEmpty) return '';
    if (value.startsWith('http')) return value;
    final base = cdn.isEmpty ? _defaultCdn : cdn;
    final path = value.startsWith('/') ? value.substring(1) : value;
    // Some payloads already carry the "uploads/movies" prefix, some do not.
    if (path.startsWith('uploads/') || path.startsWith('upload/')) {
      return '$base/$path';
    }
    return '$base/uploads/movies/$path';
  }

  /// [cdn] comes from the payload (`APP_DOMAIN_CDN_IMAGE`) when present.
  factory Movie.fromJson(Map<String, dynamic> json, {String cdn = _defaultCdn}) {
    return Movie(
      name: (json['name'] ?? json['origin_name'] ?? 'Không rõ tên').toString(),
      slug: (json['slug'] ?? '').toString(),
      thumbUrl: _absolute(json['thumb_url']?.toString(), cdn),
      posterUrl: _absolute(json['poster_url']?.toString(), cdn),
      originName: (json['origin_name'] ?? json['original_name'] ?? '').toString(),
      year: json['year']?.toString() ?? '',
      episodeCurrent:
          (json['episode_current'] ?? json['current_episode'] ?? '').toString(),
      quality: (json['quality'] ?? '').toString(),
      lang: (json['lang'] ?? json['language'] ?? '').toString(),
      time: (json['time'] ?? '').toString(),
    );
  }

  /// Best available landscape image, falling back to the portrait one.
  String get backdrop => posterUrl.isNotEmpty ? posterUrl : thumbUrl;

  /// Best available portrait image, falling back to the landscape one.
  String get poster => thumbUrl.isNotEmpty ? thumbUrl : posterUrl;
}
