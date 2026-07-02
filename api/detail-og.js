/**
 * Vercel serverless function: chèn og tags (banner, tên, mô tả phim)
 * vào index.html cho các link /detail/* — để crawler của Zalo/Facebook/
 * Messenger (không chạy JavaScript) thấy đúng thông tin phim khi chia sẻ.
 *
 * Dữ liệu phim thử lần lượt: nguonc -> ophim (server Vercel có thể bị
 * Cloudflare của từng nguồn chặn nên cần dự phòng + User-Agent trình duyệt).
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const escapeHtml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fetchJson = async (url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
};

/** Lấy {name, image, description} từ nguonc, lỗi thì thử ophim */
const fetchMovieMeta = async (slug) => {
  const errors = [];

  try {
    const data = await fetchJson(`https://phim.nguonc.com/api/film/${slug}`);
    const movie = data?.movie;
    if (movie) {
      return {
        source: "nguonc",
        name: movie.name,
        image: movie.poster_url || movie.thumb_url,
        description: movie.description,
        errors,
      };
    }
    errors.push("nguonc: no movie in response");
  } catch (e) {
    errors.push(`nguonc: ${e.message}`);
  }

  try {
    const data = await fetchJson(`https://ophim1.com/v1/api/phim/${slug}`);
    const item = data?.data?.item;
    if (item) {
      const img = item.poster_url || item.thumb_url;
      return {
        source: "ophim",
        name: item.name,
        image: img ? `https://img.ophim.live/uploads/movies/${img}` : undefined,
        description: (item.content || "").replace(/<[^>]*>/g, ""),
        errors,
      };
    }
    errors.push("ophim: no item in response");
  } catch (e) {
    errors.push(`ophim: ${e.message}`);
  }

  return { errors };
};

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const slug = (req.query.slug || "").toString().replace(/\.tsx$/, "").split("?")[0];

  const meta = await fetchMovieMeta(slug);

  // Chế độ chẩn đoán: /api/detail-og?slug=...&debug=1
  if (req.query.debug) {
    res.status(200).json({ slug, ...meta });
    return;
  }

  let html;
  try {
    const r = await fetch(`${proto}://${host}/index.html`);
    html = await r.text();
  } catch {
    res.status(302).setHeader("Location", "/").end();
    return;
  }

  if (meta.name) {
    const title = escapeHtml(meta.name);
    const description = escapeHtml(
      (meta.description || `Xem phim ${meta.name} tại Huytehuy Movies`).slice(0, 160)
    );
    const image = escapeHtml(meta.image || "");
    const url = escapeHtml(`${proto}://${host}/detail/${slug}`);

    html = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
      .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${image}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Lấy được data thì cache 1h; lỗi thì cache ngắn để thử lại sớm
  res.setHeader(
    "Cache-Control",
    meta.name
      ? "public, s-maxage=3600, stale-while-revalidate=86400"
      : "public, s-maxage=60"
  );
  res.status(200).send(html);
}
