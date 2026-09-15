/**
 * Vercel serverless function: trả về IP của client đang gọi.
 *
 * Trình duyệt không tự biết IP công khai của mình, nên trang web gọi endpoint
 * này một lần rồi đính kèm IP vào log xem phim (xem src/services/watchLog.ts).
 * Vercel đặt IP thật ở đầu chuỗi x-forwarded-for.
 */
export default function handler(req, res) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded?.[0]) ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "";

  // Không cache: mỗi client phải nhận đúng IP của mình
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ip: String(ip).trim() });
}
