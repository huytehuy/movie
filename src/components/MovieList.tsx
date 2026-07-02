import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useParams } from "react-router-dom";
import { Center, Grid, Pagination, Skeleton, Text, Title } from "@mantine/core";
import { Helmet } from "react-helmet";
import { Category, CategoryName } from "../data/enumCategory";
import { API } from "../config/api";
import { COUNTRIES, GENRES } from "../data/filters";
import { MovieSummary } from "../types/Movie";
import MovieCard from "./MovieCard";
import FilterBar from "./FilterBar";

const CATEGORY_API: Record<string, (page: number) => string> = {
  [Category.phim_dang_chieu]: (page) => API.list("dang-chieu", page),
  [Category.phim_moi_cap_nhat]: (page) => API.newlyUpdated(page),
  [Category.phim_le]: (page) => API.list("phim-le", page),
  [Category.phim_bo]: (page) => API.list("phim-bo", page),
};

const GRID_SPAN = { base: 6, xs: 4, sm: 3, lg: 2 };

/** Xác định tiêu đề + hàm build URL + filter đang chọn từ route hiện tại */
const resolveRoute = (pathname: string, slug?: string) => {
  if (slug) {
    if (pathname.startsWith("/the-loai/")) {
      const genre = GENRES.find((g) => g.slug === slug);
      return {
        title: `Thể loại: ${genre?.label || slug}`,
        buildUrl: (page: number) => API.byGenre(slug, page),
        activeGenre: slug,
      };
    }
    if (pathname.startsWith("/quoc-gia/")) {
      const country = COUNTRIES.find((c) => c.slug === slug);
      return {
        title: `Quốc gia: ${country?.label || slug}`,
        buildUrl: (page: number) => API.byCountry(slug, page),
        activeCountry: slug,
      };
    }
    if (pathname.startsWith("/nam/")) {
      return {
        title: `Phim năm ${slug}`,
        buildUrl: (page: number) => API.byYear(slug, page),
        activeYear: slug,
      };
    }
  }

  const category = pathname.substring(1);
  return {
    title: CategoryName[category as keyof typeof CategoryName] || "",
    buildUrl: CATEGORY_API[category],
  };
};

const MovieList = () => {
  const [data, setData] = useState<MovieSummary[] | undefined>();
  const [totalPage, setTotalPage] = useState(1);
  const [page, setPage] = useState(1);
  const location = useLocation();
  const { slug } = useParams();

  const { title, buildUrl, activeGenre, activeCountry, activeYear } = resolveRoute(
    location.pathname,
    slug
  );

  useEffect(() => {
    setPage(1);
  }, [location.pathname]);

  useEffect(() => {
    if (!buildUrl) return;

    let cancelled = false;
    const fetchData = async () => {
      setData(undefined);
      try {
        const response = await axios.get(buildUrl(page));
        if (cancelled) return;
        setTotalPage(response?.data?.paginate?.total_page || 1);
        setData(response?.data?.items || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (!cancelled) setData([]);
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, location.pathname]);

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta property="og:title" content={title} />
      </Helmet>
      <Title order={1} ta="center" mb="lg">
        {title}
      </Title>

      <FilterBar
        activeGenre={activeGenre}
        activeCountry={activeCountry}
        activeYear={activeYear}
      />

      {data !== undefined && data.length === 0 ? (
        <Center mt="xl">
          <Text c="dimmed">Không có phim nào trong mục này</Text>
        </Center>
      ) : (
        <Grid>
          {data === undefined
            ? Array.from({ length: 12 }).map((_, index) => (
                <Grid.Col span={GRID_SPAN} key={index}>
                  <Skeleton radius="md" style={{ aspectRatio: "2 / 3" }} />
                  <Skeleton height={14} mt={8} radius="sm" />
                </Grid.Col>
              ))
            : data.map((item) => (
                <Grid.Col span={GRID_SPAN} key={item.slug}>
                  <MovieCard
                    name={item.name}
                    slug={item.slug}
                    image={item.thumb_url}
                    subtitle={item.original_name || item.origin_name}
                  />
                </Grid.Col>
              ))}
        </Grid>
      )}

      <Center mt="xl" mb="md">
        <Pagination
          total={totalPage}
          value={page}
          onChange={handleChangePage}
          siblings={1}
          boundaries={1}
        />
      </Center>
    </div>
  );
};

export default MovieList;
