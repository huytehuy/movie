/** Dữ liệu tối thiểu để hiển thị 1 card phim (dùng chung cho ophim + nguonc) */
export interface MovieSummary {
    name: string;
    slug: string;
    thumb_url?: string;
    poster_url?: string;
    origin_name?: string;
    original_name?: string;
    year?: number;
}
