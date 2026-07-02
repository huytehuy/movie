import { Link } from "react-router-dom";
import { Paper, Text } from "@mantine/core";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from "../assets/800@3x.png";

interface MovieCardProps {
  name: string;
  slug: string;
  image?: string;
  subtitle?: string;
}

const MovieCard = ({ name, slug, image, subtitle }: MovieCardProps) => (
  <Link to={`/detail/${slug}`} className="movie-card">
    <Paper radius="md" style={{ overflow: "hidden" }}>
      <LazyLoadImage
        src={image || PlaceHolderImage}
        placeholderSrc={PlaceHolderImage}
        alt={name}
        style={{
          width: "100%",
          aspectRatio: "2 / 3",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Paper>
    <Text size="sm" fw={500} lineClamp={2} mt={6} ta="center">
      {name}
    </Text>
    {subtitle && (
      <Text size="xs" c="dimmed" ta="center" lineClamp={1}>
        {subtitle}
      </Text>
    )}
  </Link>
);

export default MovieCard;
