plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

import java.util.Properties
import java.io.FileInputStream

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.huytehuy.movie"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.huytehuy.movie"
        // Android TV (Lollipop and up) plus phones.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // Fall back to the debug key so `flutter build apk` never breaks for
            // someone who checked out the repo without key.properties.
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }

    packaging {
        jniLibs {
            keepDebugSymbols.add("**/*.so") // THÊM DÒNG NÀY ĐỂ BỎ QUA LỖI STRIP
        }
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

// Flutter ships an UNSTRIPPED libflutter.so (~157 MB per ABI) and relies on
// AGP's stripReleaseDebugSymbols to shrink it to ~11 MB. On this machine that
// task silently passes the files through, which inflated the release APK from
// 60 MB to 495 MB — far past what Play accepts. Strip them ourselves so the
// output size never depends on how AGP happens to locate the NDK.
val ndkStripDir = File(android.sdkDirectory, "ndk/${android.ndkVersion}")

tasks.matching { it.name.startsWith("strip") && it.name.endsWith("DebugSymbols") }
    .configureEach {
        doLast {
            val prebuilt = File(ndkStripDir, "toolchains/llvm/prebuilt")
            val stripTool = prebuilt.listFiles()
                ?.asSequence()
                ?.flatMap { host ->
                    sequenceOf("llvm-strip.exe", "llvm-strip")
                        .map { File(File(host, "bin"), it) }
                }
                ?.firstOrNull { it.isFile }
            if (stripTool == null) {
                logger.warn("llvm-strip not found under $prebuilt; native libraries stay unstripped")
                return@doLast
            }

            val root = File(layout.buildDirectory.get().asFile, "intermediates/stripped_native_libs")
            if (!root.isDirectory) return@doLast

            var saved = 0L
            root.walkTopDown()
                .filter { it.isFile && it.extension == "so" }
                .forEach { so ->
                    val before = so.length()
                    val tmp = File(so.parentFile, so.name + ".stripping")
                    val process = ProcessBuilder(
                        stripTool.absolutePath,
                        "--strip-unneeded",
                        "-o", tmp.absolutePath,
                        so.absolutePath,
                    ).redirectErrorStream(true).start()
                    val output = process.inputStream.bufferedReader().readText()
                    val code = process.waitFor()
                    if (code == 0 && tmp.length() > 0) {
                        so.delete()
                        tmp.renameTo(so)
                        saved += before - so.length()
                    } else {
                        tmp.delete()
                        logger.warn("llvm-strip failed for ${so.name} (exit $code): $output")
                    }
                }
            if (saved > 0) {
                logger.lifecycle("Stripped native libraries, saved ${saved / (1024 * 1024)} MB")
            }
        }
    }

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
