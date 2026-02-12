# Flutter Movie App

This is a Flutter port of the ReactJS movie application.

## Prerequisites

- Flutter SDK (latest stable)
- Android Studio / VS Code with Flutter extensions
- Firebase Project

## Setup

1. **Dependencies**:
   ```bash
   flutter pub get
   ```

2. **Firebase Configuration**:
   - Create a project in [Firebase Console](https://console.firebase.google.com/).
   - Add an Android app with package name `com.example.flutter_app` (or change it in `android/app/build.gradle`.kts).
   - Download `google-services.json`.
   - Place `google-services.json` in `android/app/`.
   - Enable **Authentication** (Google Sign-In) and **Firestore** in console.

3. **Run**:
   ```bash
   flutter run
   ```

## Features Ported

- **Home**: Carousels for Hot, Dang Chieu, Phim Le, Phim Bo, TV Shows.
- **Detail**: Movie info, Episode selection, Video Player (WebView).
- **Search**: Search functionality.
- **History**: Watch history (requires Firebase Auth).
- **Auth**: Google Sign-In (requires Firebase config).

## Known Issues

- **Video Player**: Uses `webview_flutter` to embed the player. Some server links might have ads or restrictions.
- **Auth**: Will fail silently or log errors if `google-services.json` is missing.
