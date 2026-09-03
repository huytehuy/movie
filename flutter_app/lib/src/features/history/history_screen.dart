import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_app/src/core/device.dart';
import 'package:flutter_app/src/features/auth/auth_service.dart';
import 'package:flutter_app/src/features/home/movie_model.dart';
import 'package:flutter_app/src/shared/app_shell.dart';
import 'package:flutter_app/src/shared/focusable.dart';
import 'package:flutter_app/src/shared/movie_grid.dart';
import 'package:flutter_app/src/shared/states.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthService();
    final hPad = Device.isTv ? 44.0 : 16.0;

    return AnimatedBuilder(
      animation: auth,
      builder: (context, child) {
        if (!auth.isAvailable) {
          return const EmptyState(
            message: 'Tính năng lịch sử cần cấu hình Firebase (google-services.json).',
            icon: Icons.cloud_off_rounded,
          );
        }

        final user = auth.user;
        if (user == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const EmptyState(
                  message: 'Đăng nhập để xem lịch sử phim đã xem',
                  icon: Icons.history_rounded,
                ),
                const SizedBox(height: 20),
                TvButton(
                  label: 'Đăng nhập Google',
                  icon: Icons.login_rounded,
                  filled: true,
                  autofocus: Device.isTv,
                  onPressed: auth.signInWithGoogle,
                ),
              ],
            ),
          );
        }

        return StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('watch-history')
              .doc(user.uid)
              .collection('history')
              .orderBy('timestamp', descending: true)
              .snapshots(),
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ErrorState(message: '${snapshot.error}');
            }
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const LoadingState(message: 'Đang tải lịch sử...');
            }

            final docs = snapshot.data?.docs ?? [];
            if (docs.isEmpty) {
              return const EmptyState(message: 'Chưa có lịch sử xem phim');
            }

            final movies = docs.map((doc) {
              final data = doc.data() as Map<String, dynamic>;
              return Movie(
                name: (data['filmName'] ?? 'Không rõ tên').toString(),
                slug: (data['filmId'] ?? '').toString(),
                thumbUrl: (data['image'] ?? '').toString(),
                episodeCurrent: (data['episodeName'] ?? '').toString(),
              );
            }).where((m) => m.slug.isNotEmpty).toList();

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                        hPad, Device.isTv ? 32 : 20, hPad, 16),
                    child: SectionTitle(
                      title: 'Lịch sử xem',
                      trailing: Text(
                        '${movies.length} phim',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ),
                ),
                MovieGrid(
                  movies: movies,
                  autofocusFirst: Device.isTv,
                  onSelect: (movie) => context.push('/detail/${movie.slug}', extra: movie),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
