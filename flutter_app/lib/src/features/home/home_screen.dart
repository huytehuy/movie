import 'package:flutter/material.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/services/movie_service.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MovieService _movieService = MovieService();
  
  List<Movie> hotMovies = [];
  List<Movie> dangChieuMovies = [];
  List<Movie> phimLeMovies = [];
  List<Movie> phimBoMovies = [];
  List<Movie> tvShows = [];
  
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAllData();
  }

  Future<void> _fetchAllData() async {
    try {
      final results = await Future.wait([
        _movieService.fetchHotMovies(),
        _movieService.fetchPhimDangChieu(),
        _movieService.fetchPhimLe(),
        _movieService.fetchPhimBo(),
        _movieService.fetchTvShows(),
      ]);

      if (mounted) {
        setState(() {
          hotMovies = results[0];
          dangChieuMovies = results[1];
          phimLeMovies = results[2];
          phimBoMovies = results[3];
          tvShows = results[4];
          isLoading = false;
        });
      }
    } catch (e) {
      print("Error loading data: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
       return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20.0),
        child: Column(
          children: [
            if (hotMovies.isNotEmpty) _buildSection(context, 'Phim đang HOT', hotMovies),
            if (dangChieuMovies.isNotEmpty) _buildSection(context, 'Phim đang chiếu', dangChieuMovies),
            if (phimLeMovies.isNotEmpty) _buildSection(context, 'Phim lẻ', phimLeMovies),
            if (phimBoMovies.isNotEmpty) _buildSection(context, 'Phim bộ', phimBoMovies),
            if (tvShows.isNotEmpty) _buildSection(context, 'TV Shows', tvShows),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<Movie> movies) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(
          height: 250, // Adjust height based on aspect ratio
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: movies.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final movie = movies[index];
              return GestureDetector(
                onTap: () => context.go('/detail/${movie.slug}'),
                child: SizedBox(
                   width: 150,
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
                         style: const TextStyle(fontWeight: FontWeight.w500),
                       )
                     ],
                   ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
