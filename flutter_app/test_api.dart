import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  try {
    print("Fetching data...");
    final res = await http.get(Uri.parse('https://phim.nguonc.com/api/films/danh-sach/phim-le?page=1'));
    print('Status Code: ${res.statusCode}');
    if (res.statusCode == 200) {
      final body = utf8.decode(res.bodyBytes);
      final data = json.decode(body);
      if (data['items'] != null && (data['items'] as List).isNotEmpty) {
        print('First item: ${data['items'][0]}');
      } else {
        print('No items found or items is null');
      }
    } else {
      print('Error: ${res.body}');
    }
  } catch (e) {
    print('Exception: $e');
  }
}
