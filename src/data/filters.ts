/**
 * Danh sách bộ lọc theo API nguonc.
 * Slug thể loại/quốc gia đã được kiểm tra thực tế với API (07/2026).
 */

export interface FilterOption {
  label: string;
  slug: string;
}

export const GENRES: FilterOption[] = [
  { label: "Hành Động", slug: "hanh-dong" },
  { label: "Phim Hài", slug: "phim-hai" },
  { label: "Chính Kịch", slug: "chinh-kich" },
  { label: "Tình Cảm", slug: "tinh-cam" },
  { label: "Lãng Mạn", slug: "lang-man" },
  { label: "Tâm Lý", slug: "tam-ly" },
  { label: "Hình Sự", slug: "hinh-su" },
  { label: "Chiến Tranh", slug: "chien-tranh" },
  { label: "Cổ Trang", slug: "co-trang" },
  { label: "Phiêu Lưu", slug: "phieu-luu" },
  { label: "Kinh Dị", slug: "kinh-di" },
  { label: "Gây Cấn", slug: "gay-can" },
  { label: "Gia Đình", slug: "gia-dinh" },
  { label: "Bí Ẩn", slug: "bi-an" },
  { label: "Hoạt Hình", slug: "hoat-hinh" },
  { label: "Khoa Học Viễn Tưởng", slug: "khoa-hoc-vien-tuong" },
  { label: "Lịch Sử", slug: "lich-su" },
  { label: "Tài Liệu", slug: "tai-lieu" },
];

export const COUNTRIES: FilterOption[] = [
  { label: "Hàn Quốc", slug: "han-quoc" },
  { label: "Trung Quốc", slug: "trung-quoc" },
  { label: "Nhật Bản", slug: "nhat-ban" },
  { label: "Thái Lan", slug: "thai-lan" },
  { label: "Âu Mỹ", slug: "au-my" },
  { label: "Việt Nam", slug: "viet-nam" },
  { label: "Đài Loan", slug: "dai-loan" },
  { label: "Hồng Kông", slug: "hong-kong" },
  { label: "Ấn Độ", slug: "an-do" },
  { label: "Anh", slug: "anh" },
  { label: "Pháp", slug: "phap" },
  { label: "Đức", slug: "duc" },
  { label: "Nga", slug: "nga" },
  { label: "Úc", slug: "uc" },
];

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS: FilterOption[] = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => {
  const year = String(CURRENT_YEAR - i);
  return { label: year, slug: year };
});

/** Tìm slug thể loại hợp lệ từ tên hiển thị (ví dụ từ trang chi tiết phim) */
export const findGenreByName = (name: string) =>
  GENRES.find((g) => g.label.toLowerCase() === name.toLowerCase().trim());
