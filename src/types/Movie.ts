export interface Category {
    id: string;
    name: string;
    slug: string;
}

export interface Country {
    id: string;
    name: string;
    slug: string;
}

export interface Movie {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    thumb_url: string;
    poster_url?: string;
    year: number;
    category: Category[];
    country: Country[];
    quality: string;
    lang: string;
    time?: string;
    episode_current?: string;
}

export interface ApiResponse {
    status: string;
    message: string;
    data: {
        seoOnPage: any;
        items: Movie[];
        params: any;
        type_list: string;
        APP_DOMAIN_FRONTEND: string;
        APP_DOMAIN_CDN_IMAGE: string;
    };
}
