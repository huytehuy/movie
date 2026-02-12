import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/src/features/auth/auth_service.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final AuthService _auth = AuthService();

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _auth,
      builder: (context, child) {
        final user = _auth.user;
        if (user == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("Vui lòng đăng nhập để xem lịch sử"),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => _auth.signInWithGoogle(),
                  child: const Text("Đăng nhập bằng Google"),
                ),
              ],
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(title: const Text("Lịch sử xem phim")),
          body: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance
                .collection('watch-history')
                .doc(user.uid)
                .collection('history')
                .orderBy('timestamp', descending: true)
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(child: Text("Lỗi: ${snapshot.error}"));
              }
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final docs = snapshot.data?.docs ?? [];
              if (docs.isEmpty) {
                return const Center(child: Text("Chưa có lịch sử xem phim"));
              }

              return GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                ),
                itemCount: docs.length,
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final filmId = data['filmId'] ?? '';
                  // Handle potential timestamp issues if needed
                  // final timestamp = data['timestamp'] as Timestamp?;

                  return GestureDetector(
                    onTap: () {
                      // Logic to resume episode could be complex, for now just go to detail
                      // In History.tsx: handleWatchAgain logic passes query params
                      // navigate(`/detail/${filmId}?type=${encodedServer}&episode=${encodedEpisode}`);
                      // Here we just go to detail for simplicity or implement full resumption later
                      context.go('/detail/$filmId'); 
                    },
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: CachedNetworkImage(
                              imageUrl: data['image'] ?? '',
                              fit: BoxFit.cover,
                              errorWidget: (context, url, err) => Container(color: Colors.grey),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  data['filmName'] ?? 'Unknown',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "Tập: ${data['episodeName']}",
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                Text(
                                  "Server: ${data['serverName']}",
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}
