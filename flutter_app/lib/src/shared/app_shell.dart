import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_app/src/features/auth/auth_service.dart';

class AppShell extends StatefulWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width > 800;

    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: isDesktop
            ? null
            : IconButton(
                icon: const Icon(Icons.menu, color: Colors.black),
                onPressed: () {
                  _scaffoldKey.currentState?.openDrawer();
                },
              ),
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm tên phim...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: Colors.grey[400]),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () {
                      setState(() {
                        _isSearching = false;
                        _searchController.clear();
                      });
                    },
                  ),
                ),
                style: const TextStyle(color: Colors.black),
                onSubmitted: (value) {
                  if (value.isNotEmpty) {
                    context.go('/search/$value');
                    setState(() {
                      _isSearching = false;
                      _searchController.clear();
                    });
                  }
                },
              )
            : Row(
                children: [
                  InkWell(
                    onTap: () => context.go('/'),
                    child: Image.asset(
                      'assets/HUYTEHUY.png',
                      height: 32,
                      errorBuilder: (context, error, stackTrace) => Text(
                        'HuyTeHuy 🍿',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.redAccent,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search, color: Colors.black),
              tooltip: 'Tìm kiếm',
              onPressed: () {
                setState(() {
                  _isSearching = true;
                });
              },
            ),
          const SizedBox(width: 8),
          // Login/Avatar
          AnimatedBuilder(
            animation: AuthService(),
            builder: (context, child) {
              final user = AuthService().user;
              if (user != null) {
                return PopupMenuButton(
                  offset: const Offset(0, 50),
                  icon: CircleAvatar(
                    radius: 16,
                    backgroundImage:
                        user.photoURL != null ? NetworkImage(user.photoURL!) : null,
                    backgroundColor: Colors.blueAccent,
                    child: user.photoURL == null
                        ? const Icon(Icons.person, size: 18, color: Colors.white)
                        : null,
                  ),
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'history',
                      child: Row(
                        children: const [
                          Icon(Icons.history, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Lịch sử xem'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'logout',
                      child: Row(
                        children: const [
                          Icon(Icons.logout, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Đăng xuất'),
                        ],
                      ),
                    ),
                  ],
                  onSelected: (value) {
                    if (value == 'history') {
                      context.go('/history');
                    } else if (value == 'logout') {
                      AuthService().signOut();
                    }
                  },
                );
              }
              return IconButton(
                icon: const Icon(Icons.account_circle_outlined, color: Colors.black),
                onPressed: () => AuthService().signInWithGoogle(),
                tooltip: 'Đăng nhập Google',
              );
            },
          ),
          const SizedBox(width: 12),
        ],
      ),
      drawer: Drawer(
        child: _buildNavList(context, isMobile: true),
      ),
      body: Row(
        children: [
          if (isDesktop)
            Container(
              width: 260,
              decoration: BoxDecoration(
                border: Border(right: BorderSide(color: Colors.grey[200]!)),
              ),
              child: _buildNavList(context, isMobile: false),
            ),
          Expanded(child: widget.child),
        ],
      ),
    );
  }

  Widget _buildNavList(BuildContext context, {required bool isMobile}) {
    final currentPath = GoRouterState.of(context).uri.toString();

    void handleNav(String path) {
      if (isMobile) {
        Navigator.pop(context); // Close drawer
      }
      context.go(path);
    }

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        if (isMobile)
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: Colors.blueAccent),
            accountName: const Text("HuyTeHuy Movie"),
            accountEmail: Text("Version 1.0.0",
                style: TextStyle(color: Colors.white.withOpacity(0.8))),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              backgroundImage: const AssetImage('assets/HUYTEHUY.png'),
            ),
          ),
        if (!isMobile) const SizedBox(height: 20),
        _NavItem(
          title: 'Trang chủ',
          icon: Icons.home_rounded,
          isSelected: currentPath == '/',
          onTap: () => handleNav('/'),
        ),
        _NavItem(
          title: 'Phim đang chiếu',
          icon: Icons.local_fire_department_rounded,
          isSelected: currentPath == '/phim_dang_chieu',
          onTap: () => handleNav('/phim_dang_chieu'),
        ),
        _NavItem(
          title: 'Phim lẻ',
          icon: Icons.movie_filter_rounded,
          isSelected: currentPath == '/phim_le',
          onTap: () => handleNav('/phim_le'),
        ),
        _NavItem(
          title: 'Phim bộ',
          icon: Icons.tv_rounded,
          isSelected: currentPath == '/phim_bo',
          onTap: () => handleNav('/phim_bo'),
        ),
        const Divider(),
        _NavItem(
          title: 'Lịch sử',
          icon: Icons.history_rounded,
          isSelected: currentPath == '/history',
          onTap: () => handleNav('/history'),
        ),
      ],
    );
  }
}

class _NavItem extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? Colors.blueAccent.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? Colors.blueAccent : Colors.grey[700],
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.blueAccent : Colors.grey[800],
          ),
        ),
        selected: isSelected,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
