const NGUONC_BASE = "https://phim.nguonc.com/api";

export const API = {
  /** Danh sách phim hot (ophim) */
  hot: "https://ophim1.com/v1/api/home",
  /** Danh sách theo loại: dang-chieu | phim-le | phim-bo | tv-shows */
  list: (slug: string, page = 1) =>
    `${NGUONC_BASE}/films/danh-sach/${slug}?page=${page}`,
  /** Phim mới cập nhật */
  newlyUpdated: (page = 1) =>
    `${NGUONC_BASE}/films/phim-moi-cap-nhat?page=${page}`,
  /** Lọc theo thể loại */
  byGenre: (slug: string, page = 1) =>
    `${NGUONC_BASE}/films/the-loai/${slug}?page=${page}`,
  /** Lọc theo quốc gia */
  byCountry: (slug: string, page = 1) =>
    `${NGUONC_BASE}/films/quoc-gia/${slug}?page=${page}`,
  /** Lọc theo năm phát hành */
  byYear: (year: string, page = 1) =>
    `${NGUONC_BASE}/films/nam-phat-hanh/${year}?page=${page}`,
  /** Chi tiết phim */
  film: (slug: string) => `${NGUONC_BASE}/film/${slug}`,
  /** Chi tiết phim bên ophim (có link m3u8 phát trực tiếp) */
  ophimFilm: (slug: string) => `https://ophim1.com/v1/api/phim/${slug}`,
  /** Tìm kiếm */
  search: (keyword: string) =>
    `${NGUONC_BASE}/films/search?keyword=${encodeURIComponent(keyword)}`,
};

/** Ảnh thumb của API ophim chỉ trả về tên file, cần ghép với CDN */
export const ophimImage = (thumb: string) =>
  `https://img.ophim.live/uploads/movies/${thumb}`;
