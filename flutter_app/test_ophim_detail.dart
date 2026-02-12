import 'package:dio/dio.dart';

void main() async {
  final dio = Dio();
  final slug = 'danh-tinh-that';
  final url = "https://ophim1.com/v1/api/phim/$slug";
  
  try {
    print("Fetching from $url...");
    final response = await dio.get(url);
    print("Status: ${response.statusCode}");
    print("Data: ${response.data}");
  } catch (e) {
    print("Error: $e");
  }
}
