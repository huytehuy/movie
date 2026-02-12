import 'movie_model.dart';

class MovieDetail extends Movie {
  final String description;
  final String time;
  final String language;
  final String year;
  final String country;
  final List<String> categories;
  final List<EpisodeServer> episodes;

  factory MovieDetail.fromOphimJson(Map<String, dynamic> json) {
    if (json['status'] != 'success') {
      throw Exception('Ophim API returned error status');
    }
    final data = json['data'] ?? {};
    final item = data['item'] ?? {};
    final seo = data['seoOnPage'] ?? {};
    
    // Image handling
    String thumb = item['thumb_url'] ?? '';
    String cdn = data['APP_DOMAIN_CDN_IMAGE'] ?? 'https://img.ophim.live/uploads/movies';
    if (thumb.isNotEmpty && !thumb.startsWith('http')) {
       thumb = "$cdn/$thumb";
    }

    // Episodes
    final rawEpisodes = item['episodes'] as List? ?? [];
    List<EpisodeServer> episodes = rawEpisodes.map((e) {
      final serverName = e['server_name'] ?? 'Unknown';
      final serverData = e['server_data'] as List? ?? [];
      final items = serverData.map((d) => Episode(
         name: d['name'] ?? '',
         slug: d['slug'] ?? '',
         embed: d['link_embed'] ?? d['link_m3u8'] ?? '',
      )).toList();
      return EpisodeServer(serverName: serverName, items: items);
    }).toList();

    // Categories
    final categories = (item['category'] as List? ?? []).map((e) => e['name'].toString()).toList();
    final countries = (item['country'] as List? ?? []).map((e) => e['name'].toString()).toList();

    return MovieDetail(
      name: item['name'] ?? item['origin_name'] ?? '',
      slug: item['slug'] ?? '',
      thumbUrl: thumb,
      description: item['content'] ?? seo['descriptionHead'] ?? '',
      time: item['time'] ?? '',
      language: item['lang'] ?? '',
      year: item['year'].toString(),
      country: countries.isNotEmpty ? countries.first : '',
      categories: categories,
      episodes: episodes,
    );
  }

  MovieDetail({
    required super.name,
    required super.slug,
    required super.thumbUrl,
    required this.description,
    required this.time,
    required this.language,
    required this.year,
    required this.country,
    required this.categories,
    required this.episodes,
  });

  factory MovieDetail.fromJson(Map<String, dynamic> json) {
    final movieData = json['movie'] ?? {};
    final categoryList = _parseList(movieData['category']);
    // Removed old manual Map check because _parseList handles it
    
    // Safety checks for categories
    List<String> parsedCategories = [];
    String parsedYear = 'Unknown';
    String parsedCountry = 'Unknown';

    try {
       // Based on DetailMovie.tsx logic or API structure:
       // The list items are now objects with {group: ..., list: ...}
       // We need to find the group with name 'Thể loại', 'Năm', 'Quốc gia'
       
       for (var item in categoryList) {
         // item might be a Map with structure {group: {...}, list: [...]}
         if (item is! Map) continue;
         
         final groupMap = item['group'];
         String groupName = '';
         if (groupMap is Map) {
           groupName = groupMap['name']?.toString() ?? '';
         }
         
         final list = item['list'] as List<dynamic>?;
         
         if (groupName == 'Thể loại' && list != null) {
            parsedCategories = list.map((e) => e['name'].toString()).toList();
         } else if (groupName == 'Năm' && list != null && list.isNotEmpty) {
            parsedYear = list[0]['name'].toString();
         } else if (groupName == 'Quốc gia' && list != null && list.isNotEmpty) {
            parsedCountry = list[0]['name'].toString();
         }
       }
    } catch (e) {
      print("Error parsing categories details: $e");
    }

    return MovieDetail(
      name: movieData['name'] ?? '',
      slug: movieData['slug'] ?? '',
      thumbUrl: movieData['thumb_url'] ?? '',
      description: movieData['content'] ?? movieData['description'] ?? '',
      time: movieData['time'] ?? '',
      language: movieData['lang'] ?? movieData['language'] ?? '',
      year: parsedYear,
      country: parsedCountry,
      categories: parsedCategories,
      episodes: _parseList(movieData['episodes'])
          .map((e) => EpisodeServer.fromJson(e))
          .toList(),
    );
  }

  static List<dynamic> _parseList(dynamic data) {
    if (data == null) return [];
    if (data is List) return data;
    if (data is Map) return data.values.toList();
    return [];
  }
}

class EpisodeServer {
  final String serverName;
  final List<Episode> items;

  EpisodeServer({required this.serverName, required this.items});

  factory EpisodeServer.fromJson(Map<String, dynamic> json) {
    return EpisodeServer(
      serverName: json['server_name'] ?? '',
      items: MovieDetail._parseList(json['items'])
          .map((e) => Episode.fromJson(e))
          .toList(),
    );
  }
}

class Episode {
  final String name;
  final String slug;
  final String embed;

  Episode({required this.name, required this.slug, required this.embed});

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      embed: json['embed'] ?? '',
    );
  }
}
