/**
 * Vercel serverless function: chèn og tags (banner, tên, mô tả phim)
 * vào index.html cho các link /detail/* — để crawler của Zalo/Facebook/
 * Messenger (không chạy JavaScript) thấy đúng thông tin phim khi chia sẻ.
 */

const escapeHtml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const slug = (req.query.slug || "").toString().replace(/\.tsx$/, "");

  let html;
  try {
    html = await fetch(`${proto}://${host}/index.html`).then((r) => r.text());
  } catch {
    res.status(302).setHeader("Location", "/").end();
    return;
  }

  try {
    const data = await fetch(`https://phim.nguonc.com/api/film/${slug}`).then((r) =>
      r.json()
    );
    const movie = data?.movie;
    if (movie) {
      const title = escapeHtml(movie.name);
      const description = escapeHtml(
        (movie.description || `Xem phim ${movie.name} tại Huytehuy Movies`)
          .replace(/<[^>]*>/g, "")
          .slice(0, 160)
      );
      const image = escapeHtml(movie.poster_url || movie.thumb_url || "");
      const url = escapeHtml(`${proto}://${host}/detail/${slug}`);

      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${image}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`);
    }
  } catch {
    // API lỗi thì giữ og tags mặc định của trang chủ
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
