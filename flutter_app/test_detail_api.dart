import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  try {
    print("Fetching detail for 'dan-ca-go'...");
    final res = await http.get(Uri.parse('https://phim.nguonc.com/api/film/dan-ca-go'));
    if (res.statusCode == 200) {
      final body = utf8.decode(res.bodyBytes);
      final data = json.decode(body);
      if (data['movie'] != null) {
         final movie = data['movie'];
         print('Episodes Type: ${movie['episodes'].runtimeType}');
         print('Episodes: ${movie['episodes']}');
         print('Category Type: ${movie['category'].runtimeType}');
         print('Category: ${movie['category']}');
      }
    }
  } catch (e) {
    print('Exception: $e');
  }
}
