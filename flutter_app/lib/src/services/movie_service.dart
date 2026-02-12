import 'package:dio/dio.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/features/home/movie_detail_model.dart';

class MovieService {
  final Dio _dio = Dio();
  final String _apiHot = "https://ophim1.com/v1/api/home";
  final String _apiDangChieu = "https://phim.nguonc.com/api/films/danh-sach";
  final String _apiDetail = "https://phim.nguonc.com/api/film";

  final String _apiOphim = "https://ophim1.com/v1/api/phim";

  Future<MovieDetail?> fetchMovieDetail(String slug) async {
    // Try primary API (phim.nguonc.com)
    try {
      final response = await _dio.get('$_apiDetail/$slug');
      if (response.statusCode == 200 && response.data is Map) {
         return MovieDetail.fromJson(response.data);
      }
    } catch (e) {
      print('Primary API failed for $slug: $e');
    }

    // Fallback to Ophim API
    try {
      final response = await _dio.get('$_apiOphim/$slug');
      if (response.statusCode == 200 && response.data is Map) {
         return MovieDetail.fromOphimJson(response.data);
      }
    } catch (e) {
      print('Fallback API failed for $slug: $e');
    }

    throw Exception("Failed to fetch movie detail for $slug from both APIs");
  }

  Future<List<Movie>> fetchHotMovies() async {
    try {
      final response = await _dio.get(_apiHot);
      // New API structure: { data: { items: [...] } }
      final Map<String, dynamic> data = response.data;
      final List<dynamic> items = data['data']['items'] ?? [];
      return items.map((json) => Movie.fromJson(json, isHot: true)).toList();
    } catch (e) {
      print('Error fetching Hot Movies: $e');
      return [];
    }
  }

  Future<List<Movie>> searchMovies(String query) async {
    try {
      final response = await _dio.get('https://phim.nguonc.com/api/films/search?keyword=$query');
      final List<dynamic> items = response.data['items'] ?? [];
      return items.map((json) => Movie.fromJson(json)).toList();
    } catch (e) {
      print('Error searching movies: $e');
      return [];
    }
  }

  Future<List<Movie>> fetchMoviesByCategory(String category) async {
    try {
      final response = await _dio.get('$_apiDangChieu/$category?page=1');
      // API structure: { status: ..., items: [...] }
      final List<dynamic> items = response.data['items'] ?? [];
      return items.map((json) => Movie.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching $category: $e');
      return [];
    }
  }

  Future<List<Movie>> fetchPhimDangChieu() => fetchMoviesByCategory('phim-dang-chieu');
  Future<List<Movie>> fetchPhimLe() => fetchMoviesByCategory('phim-le');
  Future<List<Movie>> fetchPhimBo() => fetchMoviesByCategory('phim-bo');
  Future<List<Movie>> fetchTvShows() => fetchMoviesByCategory('tv-shows');
}
