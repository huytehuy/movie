import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Center, Grid, Skeleton, Text, Title } from "@mantine/core";
import { Helmet } from "react-helmet";
import { API } from "../config/api";
import { MovieSummary } from "../types/Movie";
import MovieCard from "./MovieCard";

const GRID_SPAN = { base: 6, xs: 4, sm: 3, lg: 2 };

const SearchResults = () => {
  const [data, setData] = useState<MovieSummary[] | undefined>();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const fetchData = async () => {
      setData(undefined);
      try {
        const response = await axios.get(API.search(id));
        if (!cancelled) setData(response?.data?.items || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (!cancelled) setData([]);
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <Helmet>
        <title>Tìm kiếm: {id}</title>
      </Helmet>
      <Title order={1} ta="center" mb="lg">
        Kết quả cho "{id}"
      </Title>

      {data !== undefined && data.length === 0 ? (
        <Center mt="xl">
          <Text c="dimmed">Không tìm thấy phim nào phù hợp</Text>
        </Center>
      ) : (
        <Grid>
          {data === undefined
            ? Array.from({ length: 8 }).map((_, index) => (
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
    </div>
  );
};

export default SearchResults;
