import { useEffect, useState } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import MovieCarousel from "./MovieCarousel";
import { API, ophimImage } from "../config/api";
import { MovieSummary } from "../types/Movie";

const SECTIONS = [
  { key: "phim_moi_cap_nhat", title: "Phim mới cập nhật", url: API.newlyUpdated() },
  { key: "dang_chieu", title: "Phim đang chiếu", url: API.list("dang-chieu") },
  { key: "phim_le", title: "Phim lẻ", url: API.list("phim-le") },
  { key: "phim_bo", title: "Phim bộ", url: API.list("phim-bo") },
  { key: "tv_shows", title: "TV Shows", url: API.list("tv-shows") },
] as const;

type SectionData = Record<string, MovieSummary[] | undefined>;

const Home = () => {
  const [hotMovies, setHotMovies] = useState<MovieSummary[] | undefined>();
  const [sections, setSections] = useState<SectionData>({});

  useEffect(() => {
    // Mỗi API chạy độc lập: cái nào lỗi thì chỉ ẩn section đó
    const fetchHot = async () => {
      try {
        const res = await axios.get(API.hot);
        setHotMovies(res?.data?.data?.items || res?.data?.items || []);
      } catch (error) {
        console.error("Error fetching hot movies:", error);
        setHotMovies([]);
      }
    };

    const fetchSection = async (key: string, url: string) => {
      try {
        const res = await axios.get(url);
        setSections((prev) => ({ ...prev, [key]: res?.data?.items || [] }));
      } catch (error) {
        console.error(`Error fetching section ${key}:`, error);
        setSections((prev) => ({ ...prev, [key]: [] }));
      }
    };

    fetchHot();
    SECTIONS.forEach(({ key, url }) => fetchSection(key, url));
  }, []);

  return (
    <div>
      <Helmet>
        <title>Huytehuy Movies</title>
        <meta property="og:title" content="Huytehuy Movies" />
      </Helmet>

      <MovieCarousel
        title="Phim đang HOT"
        movies={hotMovies}
        getImage={(m) => (m.thumb_url ? ophimImage(m.thumb_url) : undefined)}
      />

      {SECTIONS.map(({ key, title }) => (
        <MovieCarousel key={key} title={title} movies={sections[key]} />
      ))}
    </div>
  );
};

export default Home;
