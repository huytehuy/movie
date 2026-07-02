import { Box, Skeleton, Title } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import MovieCard from "./MovieCard";
import { MovieSummary } from "../types/Movie";

interface MovieCarouselProps {
  title: string;
  movies?: MovieSummary[];
  /** Cho phép tuỳ biến URL ảnh (ví dụ API ophim chỉ trả về tên file) */
  getImage?: (movie: MovieSummary) => string | undefined;
}

const SLIDE_SIZE = {
  base: "40%",
  xs: "33.3333%",
  sm: "25%",
  md: "20%",
  lg: "14.2857%",
};

const MovieCarousel = ({ title, movies, getImage }: MovieCarouselProps) => {
  const loading = movies === undefined;

  // API lỗi hoặc không có dữ liệu thì ẩn hẳn section
  if (!loading && movies.length === 0) return null;

  return (
    <Box mb="xl">
      <Title order={2} mb="md">
        {title}
      </Title>
      {loading ? (
        <Carousel slideSize={SLIDE_SIZE} slideGap="md" align="start" withControls={false}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Carousel.Slide key={i}>
              <Skeleton radius="md" style={{ aspectRatio: "2 / 3" }} />
              <Skeleton height={14} mt={8} radius="sm" />
            </Carousel.Slide>
          ))}
        </Carousel>
      ) : (
        <Carousel
          slideSize={SLIDE_SIZE}
          slideGap="md"
          align="start"
          slidesToScroll={2}
          loop
          controlsOffset="xs"
        >
          {movies.map((movie) => (
            <Carousel.Slide key={movie.slug}>
              <MovieCard
                name={movie.name}
                slug={movie.slug}
                image={getImage ? getImage(movie) : movie.thumb_url}
                subtitle={movie.origin_name || movie.original_name}
              />
            </Carousel.Slide>
          ))}
        </Carousel>
      )}
    </Box>
  );
};

export default MovieCarousel;
