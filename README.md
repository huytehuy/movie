# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

---

## Log xem phim & trang quản trị `/admin`

Web và app TV không còn đăng nhập Google. Thay vào đó mỗi lượt bấm xem một tập
được ghi lại vào Firestore, collection **`watch-logs`**:

| Trường | Ý nghĩa |
| --- | --- |
| `deviceId` | ID ngẫu nhiên sinh 1 lần rồi lưu trên máy (localStorage / SharedPreferences) |
| `device`, `platform`, `userAgent` | Trình duyệt + hệ điều hành, hoặc `android-tv` với app TV |
| `ip` | Web lấy qua `/api/ip`; app TV lấy qua api.ipify.org |
| `filmId`, `filmName` | Slug và tên phim |
| `episodeName`, `serverName` | Tập nào, nguồn phát nào |
| `timestamp` | Giờ server (dùng để sắp xếp); `watchedAt` là giờ máy người xem |

Người xem chỉ **ghi** được log, không đọc được. Lịch sử hiển thị ở trang
`/history` lấy từ bộ nhớ của chính máy đó, không đụng tới Firestore.

### Cách bật trang `/admin`

1. **Firebase Console → Authentication → Sign-in method**: bật **Email/Password**.
2. Tab **Users → Add user**: tạo tài khoản `admin@huytehuy.id.vn` với mật khẩu
   bạn tự đặt. (Mật khẩu không nằm trong code — ai đọc source cũng sẽ thấy.)
3. UID của tài khoản admin đã ghi sẵn trong [`firestore.rules`](./firestore.rules).
   Tạo lại tài khoản khác thì copy **User UID** mới ở **Authentication → Users**
   rồi thay vào hàm `isAdmin()`.
4. Dán toàn bộ file đó vào **Firestore Database → Rules** rồi bấm **Publish**
   (bấm Publish, không phải chỉ gõ vào ô rồi thoát ra).
5. Điền các biến `VITE_FIREBASE_*` (xem [.env.example](./.env.example)) vào file
   `.env` khi chạy local, và vào Environment Variables của Vercel khi deploy.

Nếu `/admin` báo `Missing or insufficient permissions` thì gần như chắc chắn là
rules chưa Publish, hoặc UID/email trong `isAdmin()` không khớp với tài khoản
đang đăng nhập (email hiện ngay dưới tiêu đề "Log xem phim"). Kiểm tra nhanh
bằng **Firestore → Rules → Rules Playground**: chọn `get`, path
`watch-logs/test`, bật Authenticated và điền UID admin — phải ra **Allow**.

Vào `/admin` để đăng nhập và xem log: lọc theo thiết bị, tìm theo tên phim / IP,
kèm số lượt xem, số thiết bị và phim được xem nhiều nhất.

### App Flutter

App TV ghi log vào cùng collection, nhưng cần `google-services.json` trong
`flutter_app/android/app/` thì Firebase mới chạy. Thiếu file đó thì app vẫn xem
phim và vẫn có lịch sử trên máy, chỉ là log không gửi lên được.
