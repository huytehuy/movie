import 'package:dio/dio.dart';

void main() async {
  final dio = Dio();
  final url = "https://ophim1.com/v1/api/home";
  
  try {
    print("Fetching from $url...");
    final response = await dio.get(url);
    print("Status: ${response.statusCode}");
    
    final data = response.data;
    if (data is Map) {
      if (data['data'] != null && data['data']['items'] != null) {
        final items = data['data']['items'] as List;
        print("Found ${items.length} items in data.data.items");
        print("First item: ${items[0]}");
      } else if (data['items'] != null) {
        final items = data['items'] as List;
        print("Found ${items.length} items in data.items");
        print("First item: ${items[0]}");
      } else {
        print("Could not find items. Keys: ${data.keys}");
      }
    } else {
      print("Response is not a Map: ${data.runtimeType}");
    }
  } catch (e) {
    print("Error: $e");
  }
}
