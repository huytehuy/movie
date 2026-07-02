import { ActionIcon, Badge, Box, Button, Card, Flex, Group, LoadingOverlay, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconShare2 } from "@tabler/icons-react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from "../assets/800@3x.png";
import { Helmet } from "react-helmet-async";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { notifications } from "@mantine/notifications";
import { API } from "../config/api";
import { findGenreByName } from "../data/filters";
import { MovieSummary } from "../types/Movie";
import MovieCarousel from "./MovieCarousel";

interface FilmData {
  name: string;
  thumb_url: string;
  poster_url?: string;
  description?: string;
  time: string;
  language: string;
  category: { list: { name: string }[] }[];
  total_episodes: string;
  current_episode: string;
  episodes: {
    Id: string;
    server_name: string;
    items: {
      Id: string;
      name: string;
      embed: string;
    }[];
  }[];
}

type Server = FilmData["episodes"][number];
type Episode = Server["items"][number];

const DetailMovie = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const episode = searchParams.get('episode');
  const [filmData, setFilmData] = useState<FilmData | null>(null);
  const [visible, setVisible] = useState(true);
  const [dataIframe, setDataIframe] = useState<string | null>(null);
  const [loadingButton, setLoadingButton] = useState<{
    [key: string]: boolean;
  }>({});
  const [related, setRelated] = useState<MovieSummary[] | undefined>();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true);
      try {
        const actualId = id?.replace('.tsx', '') || '';
        const response = await axios.get(API.film(actualId));
        setFilmData(response.data.movie);

        if (response.data.movie.episodes) {
          const targetServer = type
            ? (response.data.movie.episodes as Server[]).find((ep) => ep.server_name === type)
            : undefined;

          if (targetServer) {
            if (episode) {
              if (episode.toUpperCase() === 'FULL') {
                const fullEpisode = targetServer.items[0];
                setDataIframe(fullEpisode.embed);
                await saveWatchHistory(fullEpisode, type);
              } else {
                const episodeNumber = parseInt(episode);
                if (targetServer.items[episodeNumber - 1]) {
                  const episodeData = targetServer.items[episodeNumber - 1];
                  setDataIframe(episodeData.embed);
                  // Lưu lịch sử khi load trực tiếp từ URL
                  await saveWatchHistory(episodeData, type);
                }
              }
            } else {
              const firstEpisode = targetServer.items[0];
              setDataIframe(firstEpisode.embed);
              await saveWatchHistory(firstEpisode, type);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching film data:", error);
      } finally {
        setVisible(false);
      }
    };

    fetchData();
  }, [id, episode, type]);

  const saveWatchHistory = async (
    item: { name: string; embed: string },
    serverName: string | null
  ) => {
    try {
      const userId = auth?.currentUser?.uid;
      if (!userId || !db) {
        notifications.show({
          title: 'Lưu ý',
          message: 'Đăng nhập để lưu lịch sử xem phim',
          color: 'yellow'
        });
        return;
      }

      const historyData = {
        filmId: id || '',
        filmName: filmData?.name || '',
        episodeName: item.name,
        serverName: serverName,
        timestamp: serverTimestamp(),
        lastWatched: new Date().toISOString(),
        image: filmData?.thumb_url || '',
      };

      const historyRef = collection(db, 'watch-history', userId, 'history');
      const q = query(
        historyRef,
        where('filmId', '==', id),
        where('episodeName', '==', item.name),
        where('serverName', '==', serverName)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(historyRef, historyData);
      } else {
        // Đã có bản ghi thì chỉ cập nhật thời gian xem
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          timestamp: serverTimestamp(),
          lastWatched: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: filmData?.name,
          text: `Xem phim ${filmData?.name || ""} tại Huytehuy Movies`,
          url,
        });
      } catch {
        // Người dùng đóng share sheet — không cần báo lỗi
      }
      return;
    }

    // Desktop không có Web Share API: sao chép link
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // Clipboard API bị chặn: dùng cách cũ qua textarea ẩn
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      textarea.remove();
    }

    notifications.show(
      copied
        ? {
            title: "Đã sao chép",
            message: "Link phim đã được sao chép vào clipboard",
            color: "green",
          }
        : {
            title: "Lỗi",
            message: "Không sao chép được link",
            color: "red",
          }
    );
  };

  const changeServer = async (data: Episode, index: number, serverName: string) => {
    setLoadingButton((prev) => ({ ...prev, [`${serverName}-${index}`]: true }));
    try {
      setDataIframe(data.embed);
      iframeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      await saveWatchHistory(data, serverName);
    } finally {
      setTimeout(() => {
        setLoadingButton((prev) => ({
          ...prev,
          [`${serverName}-${index}`]: false,
        }));
      }, 1000);
    }
  };

  const genreNames = filmData?.category?.[2]?.list?.map((item) => item.name) || [];
  const year = filmData?.category?.[3]?.list?.[0]?.name;
  const country = filmData?.category?.[4]?.list?.[0]?.name;
  const relatedGenre = genreNames.map(findGenreByName).find(Boolean);

  // Phim cùng thể loại (lấy theo thể loại đầu tiên có trong bộ lọc)
  useEffect(() => {
    if (!relatedGenre) {
      setRelated(undefined);
      return;
    }

    let cancelled = false;
    const fetchRelated = async () => {
      setRelated(undefined);
      try {
        const response = await axios.get(API.byGenre(relatedGenre.slug));
        if (cancelled) return;
        const items: MovieSummary[] = (response?.data?.items || []).filter(
          (item: MovieSummary) => item.slug !== id
        );
        setRelated(items);
      } catch (error) {
        console.error("Error fetching related movies:", error);
        if (!cancelled) setRelated([]);
      }
    };
    fetchRelated();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedGenre?.slug, id]);

  return (
    <Box style={{ display: "flex", alignItems: "center", flexDirection: "column" }}>
      {filmData && (
        <Helmet>
          <title>{filmData.name}</title>
          <meta property="og:image" content={filmData.poster_url || filmData.thumb_url} />
          <meta property="og:title" content={filmData.name} />
          {filmData.description && (
            <meta property="og:description" content={filmData.description.slice(0, 160)} />
          )}
        </Helmet>
      )}
      <LoadingOverlay
        visible={visible}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />

      <Card withBorder radius="md" p="md" w="100%" maw={1280}>
        <Flex
          direction={{ base: "column", xs: "row" }}
          align={{ base: "center", xs: "flex-start" }}
          gap="md"
        >
          <LazyLoadImage
            src={filmData?.thumb_url || PlaceHolderImage}
            style={{ width: 150, borderRadius: 8, flexShrink: 0 }}
            alt={filmData?.name || "poster"}
            placeholderSrc={PlaceHolderImage}
          />
          <Stack gap={6}>
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <Title order={2}>{filmData?.name}</Title>
              <Tooltip label="Chia sẻ phim">
                <ActionIcon
                  variant="light"
                  size="lg"
                  radius="xl"
                  mt={4}
                  onClick={handleShare}
                  aria-label="Chia sẻ phim"
                >
                  <IconShare2 size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group gap="xs">
              {year && <Badge variant="light">{year}</Badge>}
              {country && <Badge variant="light" color="teal">{country}</Badge>}
              {filmData?.language && (
                <Badge variant="light" color="grape">{filmData.language}</Badge>
              )}
            </Group>
            {filmData?.time && <Text size="sm">Thời lượng: {filmData.time}</Text>}
            <Group gap={6} align="center">
              <Text size="sm">Thể loại:</Text>
              {genreNames.length === 0 && <Text size="sm">Chưa có thể loại</Text>}
              {genreNames.map((name) => {
                const genre = findGenreByName(name);
                return genre ? (
                  <Badge
                    key={name}
                    component={Link}
                    to={`/the-loai/${genre.slug}`}
                    variant="outline"
                    style={{ cursor: "pointer" }}
                  >
                    {name}
                  </Badge>
                ) : (
                  <Badge key={name} variant="outline" color="gray">
                    {name}
                  </Badge>
                );
              })}
            </Group>
            <Text size="sm">
              Số tập: {filmData?.current_episode}
              {filmData?.total_episodes ? ` / ${filmData.total_episodes}` : ""}
            </Text>
          </Stack>
        </Flex>
      </Card>

      {dataIframe && (
        <Box
          mt="md"
          w="100%"
          maw={1280}
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            ref={iframeRef}
            width="100%"
            height="100%"
            src={dataIframe}
            style={{ border: 0, borderRadius: 8 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            tabIndex={0}
          ></iframe>
        </Box>
      )}

      <Stack w="100%" maw={1280} mt="xl" gap="lg">
        {filmData?.episodes?.map((server) => (
          <Box key={server.Id || server.server_name}>
            <Badge
              variant="dot"
              color={type === server.server_name ? "green" : "indigo"}
              radius="sm"
              size="lg"
            >
              {server.server_name}
            </Badge>
            <Group mt="sm" gap="xs">
              {server.items.map((item, index2) => (
                <Button
                  key={item.Id || item.name}
                  onClick={() => changeServer(item, index2, server.server_name)}
                  variant={dataIframe === item.embed ? "filled" : "light"}
                  loading={loadingButton[`${server.server_name}-${index2}`] || false}
                  miw={60}
                >
                  {item.name}
                </Button>
              ))}
            </Group>
          </Box>
        ))}
      </Stack>

      {relatedGenre && (
        <Box w="100%" maw={1280} mt="xl">
          <MovieCarousel
            title={`Cùng thể loại: ${relatedGenre.label}`}
            movies={related}
          />
        </Box>
      )}
    </Box>
  );
};

export default DetailMovie;
