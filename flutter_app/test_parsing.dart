import 'dart:convert';
import 'package:http/http.dart' as http;

// --- Mock Classes to simulate app structure ---

class Movie {
  final String name;
  final String slug;
  final String thumbUrl;

  Movie({
    required this.name,
    required this.slug,
    required this.thumbUrl,
  });
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

class EpisodeServer {
  final String serverName;
  final List<Episode> items;

  EpisodeServer({required this.serverName, required this.items});

  factory EpisodeServer.fromJson(Map<String, dynamic> json) {
    return EpisodeServer(
      serverName: json['server_name'] ?? '',
      items: (json['items'] as List<dynamic>?)
          ?.map((e) => Episode.fromJson(e))
          .toList() ?? [],
    );
  }
}

class MovieDetail extends Movie {
  final String description;
  final String time;
  final String language;
  final String year;
  final String country;
  final List<String> categories;
  final List<EpisodeServer> episodes;

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
    var categoryList = [];
    try {
      final categoryData = movieData['category'];
      if (categoryData is List) {
        categoryList = categoryData;
      } else if (categoryData is Map) {
        categoryList = categoryData.values.toList();
      }
    } catch (e) {
      print("Error extraction category list: $e");
    }
    
    // Safety checks for categories
    List<String> parsedCategories = [];
    String parsedYear = 'Unknown';
    String parsedCountry = 'Unknown';

    try {
       for (var item in categoryList) {
         if (item is! Map) continue;
         // Handle both 'group.name' access patterns if needed, 
         // but based on log: {group: {name: ...}, list: [...]}
         // Accessing item['group'] which is a Map.
         
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
      description: movieData['content'] ?? movieData['description'] ?? '', // Added fallback
      time: movieData['time'] ?? '',
      language: movieData['lang'] ?? movieData['language'] ?? '', // Added fallback
      year: parsedYear,
      country: parsedCountry,
      categories: parsedCategories,
      episodes: (movieData['episodes'] as List<dynamic>?)
          ?.map((e) => EpisodeServer.fromJson(e))
          .toList() ?? [],
    );
  }
}

// --- Main Test Function ---

void main() async {
  try {
    print("Fetching detail for 'khi-cuoc-doi-cho-ban-qua-quyt'...");
    final res = await http.get(Uri.parse('https://phim.nguonc.com/api/film/khi-cuoc-doi-cho-ban-qua-quyt'));
    if (res.statusCode == 200) {
      final body = utf8.decode(res.bodyBytes);
      final jsonMap = json.decode(body);
      
      print("Attempting to parse...");
      try {
        final movie = MovieDetail.fromJson(jsonMap);
        print("Successfully parsed: ${movie.name}");
        print("Description: ${movie.description}");
        print("Episodes: ${movie.episodes.length}");
        if (movie.episodes.isNotEmpty) {
           print("Server 0: ${movie.episodes[0].serverName}");
        }
      } catch (e, stack) {
        print("Parsing FAILED: $e");
        print(stack);
      }
    } else {
        print("Failed to fetch: ${res.statusCode}");
    }
  } catch (e) {
    print("Network/Other Exception: $e");
  }
}
