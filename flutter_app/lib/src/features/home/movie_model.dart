class Movie {
  final String name;
  final String slug;
  final String thumbUrl;

  Movie({
    required this.name,
    required this.slug,
    required this.thumbUrl,
  });

  factory Movie.fromJson(Map<String, dynamic> json, {bool isHot = false}) {
    String thumb = json['thumb_url'] ?? '';
    if (isHot && thumb.isNotEmpty) {
       // Updated logic matching React app:
       // https://ophim18.cc/_next/image?url=https%3A%2F%2Fimg.ophim.live%2Fuploads%2Fmovies%2F${item.thumb_url}&w=1200&q=75
       thumb = "https://ophim18.cc/_next/image?url=https%3A%2F%2Fimg.ophim.live%2Fuploads%2Fmovies%2F$thumb&w=1200&q=75";
    }
    // Handle 'modified' time if needed, but for now just basic fields
    return Movie(
      name: json['name'] ?? 'Unknown',
      slug: json['slug'] ?? '',
      thumbUrl: thumb,
    );
  }
}
