import 'package:flutter/material.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

class CategoryScreen extends StatefulWidget {
  final String title;
  final String category; // 'phim-le', 'phim-bo', 'hoat-hinh', etc.

  const CategoryScreen({super.key, required this.title, required this.category});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  final MovieService _movieService = MovieService();
  List<Movie> movies = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void didUpdateWidget(CategoryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.category != widget.category) {
      _fetchData();
    }
  }

  Future<void> _fetchData() async {
    setState(() => isLoading = true);
    try {
      List<Movie> result = [];
      // Map category string to service call
      // This is a bit manual but simple for now
      switch (widget.category) {
        case 'phim-le':
          result = await _movieService.fetchPhimLe();
          break;
        case 'phim-bo':
          result = await _movieService.fetchPhimBo();
          break;
        case 'phim-dang-chieu':
          result = await _movieService.fetchPhimDangChieu();
          break;
        case 'tv-shows':
          result = await _movieService.fetchTvShows();
          break;
        default:
          result = [];
      }

      if (mounted) {
        setState(() {
          movies = result;
          isLoading = false;
        });
      }
    } catch (e) {
      print("Error fetching category ${widget.category}: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, // Simple 2 columns
                childAspectRatio: 0.7,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: movies.length,
              itemBuilder: (context, index) {
                final movie = movies[index];
                return GestureDetector(
                  onTap: () => context.go('/detail/${movie.slug}'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: CachedNetworkImage(
                            imageUrl: movie.thumbUrl,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            errorWidget: (context, url, error) => Container(
                              color: Colors.grey[300],
                              child: const Icon(Icons.broken_image),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        movie.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
