import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  try {
    final slug = 'khi-cuoc-doi-cho-ban-qua-quyt'; // From Hot API
    final url = 'https://phim.nguonc.com/api/film/$slug';
    print("Testing slug: $slug");
    print("URL: $url");
    
    final res = await http.get(Uri.parse(url));
    print('Status Code: ${res.statusCode}');
    if (res.statusCode == 200) {
       final body = utf8.decode(res.bodyBytes);
       final data = json.decode(body);
       if (data['status'] == false || data['status'] == 'error') {
          print("API returned error status: ${data['msg'] ?? 'Unknown error'}");
       } else {
          print("Success! Movie name: ${data['movie']['name']}");
       }
    } else {
      print("Failed. Body: ${res.body}");
    }
  } catch (e) {
    print('Exception: $e');
  }
}
