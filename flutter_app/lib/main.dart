import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_app/src/router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_app/src/features/auth/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Firebase init will fail without google-services.json, so we wrap it in try-catch for now
  // or just comment it out until the user adds the file.
  // For now, I'll add a dummy check or just let it log an error but continue if possible,
  // but Firebase.initializeApp() usually crashes if config is missing on Android.
  // I will comment it out and add a TODO.
  /*
  try {
    await Firebase.initializeApp();
  } catch (e) {
    print("Firebase initialization failed: $e");
  }
  */
  
  // Try to init auth service (will handle fallback internally)
  await AuthService().init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Huytehuy Movies',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
        fontFamily: GoogleFonts.roboto().fontFamily,
      ),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
