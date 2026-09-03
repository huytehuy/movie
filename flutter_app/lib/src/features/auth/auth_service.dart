import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Google sign-in wrapper.
///
/// The app ships without `google-services.json`, so Firebase may not be
/// configured at runtime. [isAvailable] reports whether it came up, and the UI
/// hides the account/history entry points when it did not — a dead login button
/// is especially bad on a TV, where there is no easy way back out.
class AuthService extends ChangeNotifier {
  AuthService._internal();

  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;

  User? _user;
  User? get user => _user;

  bool _available = false;
  bool get isAvailable => _available;

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    try {
      FirebaseAuth.instance.authStateChanges().listen((user) {
        _user = user;
        notifyListeners();
      });
      _available = true;
    } catch (e) {
      debugPrint('Auth unavailable (missing google-services.json?): $e');
      _available = false;
    }
    notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    if (!_available) return;
    try {
      final googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) return; // Cancelled.

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      await FirebaseAuth.instance.signInWithCredential(credential);
    } catch (e) {
      debugPrint('Sign in failed: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await GoogleSignIn().signOut();
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      debugPrint('Sign out failed: $e');
    }
  }
}
