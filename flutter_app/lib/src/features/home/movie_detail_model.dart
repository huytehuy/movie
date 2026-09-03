import 'movie_model.dart';

/// Full movie record, including the episode/server matrix.
class MovieDetail extends Movie {
  MovieDetail({
    required super.name,
    required super.slug,
    required super.thumbUrl,
    super.posterUrl,
    super.originName,
    super.year,
    super.episodeCurrent,
    super.quality,
    super.lang,
    super.time,
    required this.description,
    required this.country,
    required this.categories,
    required this.episodes,
    this.actors = const [],
    this.director = '',
    this.trailerUrl = '',
  });

  final String description;
  final String country;
  final List<String> categories;
  final List<EpisodeServer> episodes;
  final List<String> actors;
  final String director;
  final String trailerUrl;

  /// Convenience for the old field name used across the UI.
  String get language => lang;

  bool get hasPlayableSource =>
      episodes.any((server) => server.items.any((e) => e.hasSource));

  /// The plain description with HTML tags stripped out; several sources return
  /// `<p>` markup.
  String get plainDescription => description
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'<[^>]*>'), '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .trim();

  /// phimapi.com / KKPhim — the important source, because it returns a direct
  /// `link_m3u8` that the native player (and therefore the TV remote) can use.
  factory MovieDetail.fromPhimApi(Map<String, dynamic> json) {
    final movie = (json['movie'] as Map?)?.cast<String, dynamic>() ?? {};
    if (movie.isEmpty) {
      throw Exception('phimapi trả về dữ liệu rỗng');
    }

    final rawEpisodes = json['episodes'] as List? ?? [];
    final servers = rawEpisodes.whereType<Map>().map((server) {
      final data = server['server_data'] as List? ?? [];
      return EpisodeServer(
        serverName: (server['server_name'] ?? 'Server').toString(),
        items: data.whereType<Map>().map((d) {
          return Episode(
            name: (d['name'] ?? '').toString(),
            slug: (d['slug'] ?? '').toString(),
            embed: (d['link_embed'] ?? '').toString(),
            m3u8: (d['link_m3u8'] ?? '').toString(),
          );
        }).toList(),
      );
    }).toList();

    final base = Movie.fromJson(movie);

    return MovieDetail(
      name: base.name,
      slug: base.slug,
      thumbUrl: base.thumbUrl,
      posterUrl: base.posterUrl,
      originName: base.originName,
      year: base.year,
      episodeCurrent: base.episodeCurrent,
      quality: base.quality,
      lang: base.lang,
      time: base.time,
      description: (movie['content'] ?? '').toString(),
      country: _names(movie['country']).join(', '),
      categories: _names(movie['category']),
      episodes: servers,
      actors: (movie['actor'] as List? ?? [])
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList(),
      director: (movie['director'] as List? ?? [])
          .map((e) => e.toString())
          .where((e) => e.trim().isNotEmpty)
          .join(', '),
      trailerUrl: (movie['trailer_url'] ?? '').toString(),
    );
  }

  /// phim.nguonc.com — kept as a last-resort fallback. It only exposes embed
  /// links, so playback there falls back to the WebView.
  factory MovieDetail.fromNguoncJson(Map<String, dynamic> json) {
    final movie = (json['movie'] as Map?)?.cast<String, dynamic>() ?? {};
    if (movie.isEmpty) {
      throw Exception('nguonc trả về dữ liệu rỗng');
    }

    List<String> categories = [];
    String year = '';
    String country = '';
    for (final entry in _asList(movie['category'])) {
      if (entry is! Map) continue;
      final group = entry['group'];
      final groupName = group is Map ? (group['name']?.toString() ?? '') : '';
      final list = entry['list'] as List?;
      if (list == null || list.isEmpty) continue;
      switch (groupName) {
        case 'Thể loại':
          categories = list.map((e) => e['name'].toString()).toList();
        case 'Năm':
          year = list.first['name'].toString();
        case 'Quốc gia':
          country = list.first['name'].toString();
      }
    }

    final servers = _asList(movie['episodes']).whereType<Map>().map((server) {
      return EpisodeServer(
        serverName: (server['server_name'] ?? 'Server').toString(),
        items: _asList(server['items']).whereType<Map>().map((d) {
          return Episode(
            name: (d['name'] ?? '').toString(),
            slug: (d['slug'] ?? '').toString(),
            embed: (d['embed'] ?? '').toString(),
            m3u8: (d['m3u8'] ?? '').toString(),
          );
        }).toList(),
      );
    }).toList();

    return MovieDetail(
      name: (movie['name'] ?? '').toString(),
      slug: (movie['slug'] ?? '').toString(),
      thumbUrl: (movie['thumb_url'] ?? '').toString(),
      posterUrl: (movie['poster_url'] ?? '').toString(),
      originName: (movie['original_name'] ?? '').toString(),
      year: year,
      episodeCurrent: (movie['current_episode'] ?? '').toString(),
      quality: (movie['quality'] ?? '').toString(),
      lang: (movie['language'] ?? '').toString(),
      time: (movie['time'] ?? '').toString(),
      description: (movie['description'] ?? '').toString(),
      country: country,
      categories: categories,
      episodes: servers,
      actors: (movie['casts'] ?? '')
          .toString()
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
      director: (movie['director'] ?? '').toString(),
    );
  }

  static List<String> _names(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .map((e) => e is Map ? (e['name']?.toString() ?? '') : e.toString())
        .where((e) => e.trim().isNotEmpty)
        .toList();
  }

  static List<dynamic> _asList(dynamic data) {
    if (data == null) return [];
    if (data is List) return data;
    if (data is Map) return data.values.toList();
    return [];
  }
}

class EpisodeServer {
  EpisodeServer({required this.serverName, required this.items});

  final String serverName;
  final List<Episode> items;
}

class Episode {
  Episode({
    required this.name,
    required this.slug,
    required this.embed,
    this.m3u8 = '',
  });

  final String name;
  final String slug;

  /// Iframe player URL. Playable only inside a WebView.
  final String embed;

  /// Direct HLS stream. Preferred everywhere, and the only option on a TV
  /// because a WebView swallows D-pad key events.
  final String m3u8;

  bool get hasSource => m3u8.isNotEmpty || embed.isNotEmpty;

  /// A `player/?url=<m3u8>` embed still carries a usable direct stream.
  String get resolvedM3u8 {
    if (m3u8.isNotEmpty) return m3u8;
    final match = RegExp(r'[?&]url=(http[^&]+)').firstMatch(embed);
    if (match != null) return Uri.decodeComponent(match.group(1)!);
    if (embed.contains('.m3u8')) return embed;
    return '';
  }

  /// The URL to load in the player WebView.
  ///
  /// Prefers the source's own embed page. When a source only gave us a direct
  /// stream, wrap it in phimapi's player so there is still something a WebView
  /// can show.
  String get playableEmbed {
    if (embed.isNotEmpty) return embed;
    final stream = resolvedM3u8;
    if (stream.isNotEmpty) {
      return 'https://player.phimapi.com/player/?url=$stream';
    }
    return '';
  }

  String get displayName {
    if (name.trim().isEmpty) return 'Tập ?';
    // Long labels like "Tập 12" are fine, but some sources return the raw
    // filename; keep the card readable.
    return name.length > 22 ? '${name.substring(0, 21)}…' : name;
  }
}
