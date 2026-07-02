import { ActionIcon, Badge, Box, Button, Card, Flex, Group, LoadingOverlay, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconPictureInPicture, IconShare2 } from "@tabler/icons-react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from "../assets/800@3x.png";
import { Helmet } from "react-helmet-async";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { notifications } from "@mantine/notifications";
import { API, ophimImage } from "../config/api";
import { findGenreByName } from "../data/filters";
import { MovieSummary } from "../types/Movie";
import MovieCarousel from "./MovieCarousel";
import HlsPlayer from "./HlsPlayer";

/** Thông tin phim đã chuẩn hóa (từ nguonc hoặc ophim) */
interface FilmInfo {
  name: string;
  originName?: string;
  thumb?: string;
  poster?: string;
  description?: string;
  time?: string;
  language?: string;
  year?: string;
  country?: string;
  genres: string[];
  currentEpisode?: string;
  totalEpisodes?: string;
}

interface PlayItem {
  name: string;
  url: string;
  /** m3u8 phát bằng player riêng (ưu tiên); embed dùng iframe */
  kind: "m3u8" | "embed";
}

interface PlayServer {
  label: string;
  items: PlayItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const parseNguonc = (movie: any): { info: FilmInfo; servers: PlayServer[] } => ({
  info: {
    name: movie.name,
    thumb: movie.thumb_url,
    poster: movie.poster_url,
    description: movie.description,
    time: movie.time,
    language: movie.language,
    year: movie.category?.[3]?.list?.[0]?.name,
    country: movie.category?.[4]?.list?.[0]?.name,
    genres: movie.category?.[2]?.list?.map((item: any) => item.name) || [],
    currentEpisode: movie.current_episode,
    totalEpisodes: movie.total_episodes,
  },
  servers: (movie.episodes || []).map((server: any) => ({
    label: server.server_name,
    items: (server.items || []).map((item: any) => ({
      name: item.name,
      url: item.embed,
      kind: "embed" as const,
    })),
  })),
});

const parseOphim = (item: any): { info: FilmInfo; servers: PlayServer[] } => ({
  info: {
    name: item.name,
    originName: item.origin_name,
    thumb: item.thumb_url ? ophimImage(item.thumb_url) : undefined,
    poster: item.poster_url ? ophimImage(item.poster_url) : undefined,
    description: (item.content || "").replace(/<[^>]*>/g, ""),
    time: item.time,
    language: item.lang,
    year: item.year ? String(item.year) : undefined,
    country: item.country?.[0]?.name,
    genres: item.category?.map((c: any) => c.name) || [],
    currentEpisode: item.episode_current,
    totalEpisodes: item.episode_total,
  },
  servers: (item.episodes || []).map((server: any) => ({
    label: `${server.server_name} (HD)`,
    items: (server.server_data || [])
      .filter((ep: any) => ep.link_m3u8 || ep.link_embed)
      .map((ep: any) => ({
        name: ep.name,
        url: ep.link_m3u8 || ep.link_embed,
        kind: ep.link_m3u8 ? ("m3u8" as const) : ("embed" as const),
      })),
  })),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Tìm tập trong server theo param episode trên URL (số, tên hoặc FULL) */
const findEpisode = (server: PlayServer, episode: string | null): PlayItem | undefined => {
  if (!episode || episode.toUpperCase() === "FULL") return server.items[0];
  const byName = server.items.find((item) => item.name === episode);
  if (byName) return byName;
  const index = parseInt(episode);
  return Number.isNaN(index) ? undefined : server.items[index - 1];
};

const DetailMovie = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const episode = searchParams.get('episode');
  const [info, setInfo] = useState<FilmInfo | null>(null);
  const [servers, setServers] = useState<PlayServer[]>([]);
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState<(PlayItem & { serverLabel: string }) | null>(null);
  const [loadingButton, setLoadingButton] = useState<{
    [key: string]: boolean;
  }>({});
  const [related, setRelated] = useState<MovieSummary[] | undefined>();

  const playerBoxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const infoRef = useRef<FilmInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true);
      setCurrent(null);
      const slug = id?.replace('.tsx', '') || '';

      // Gọi song song 2 nguồn: ophim có m3u8 (player riêng), nguonc làm dự phòng
      const [nguoncRes, ophimRes] = await Promise.allSettled([
        axios.get(API.film(slug)),
        axios.get(API.ophimFilm(slug)),
      ]);

      let filmInfo: FilmInfo | null = null;
      let allServers: PlayServer[] = [];

      if (ophimRes.status === "fulfilled" && ophimRes.value?.data?.data?.item) {
        const parsed = parseOphim(ophimRes.value.data.data.item);
        filmInfo = parsed.info;
        allServers = parsed.servers;
      }
      if (nguoncRes.status === "fulfilled" && nguoncRes.value?.data?.movie) {
        const parsed = parseNguonc(nguoncRes.value.data.movie);
        // Info nguonc đầy đủ hơn nhưng giữ tên gốc từ ophim nếu có;
        // server ophim đứng trước vì m3u8 ổn định hơn embed
        filmInfo = { ...parsed.info, originName: filmInfo?.originName };
        allServers = [...allServers, ...parsed.servers];
      }

      if (!filmInfo) {
        console.error("Không tìm thấy phim ở cả hai nguồn:", slug);
      }

      infoRef.current = filmInfo;
      setInfo(filmInfo);
      setServers(allServers);

      // Deep link từ lịch sử xem: ?type=<server>&episode=<tập>
      if (type) {
        const targetServer = allServers.find((s) => s.label === type);
        const targetEpisode = targetServer && findEpisode(targetServer, episode);
        if (targetServer && targetEpisode) {
          setCurrent({ ...targetEpisode, serverLabel: targetServer.label });
          saveWatchHistory(targetEpisode, targetServer.label);
        }
      }

      setVisible(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, episode, type]);

  const saveWatchHistory = async (item: { name: string }, serverName: string | null) => {
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
        filmName: infoRef.current?.name || '',
        episodeName: item.name,
        serverName: serverName,
        timestamp: serverTimestamp(),
        lastWatched: new Date().toISOString(),
        image: infoRef.current?.thumb || '',
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
          title: info?.name,
          text: `Xem phim ${info?.name || ""} tại Huytehuy Movies`,
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

  const enterPip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const v = video as any;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (v.requestPictureInPicture) {
        await v.requestPictureInPicture();
      } else if (v.webkitSupportsPresentationMode?.("picture-in-picture")) {
        // Safari/iOS
        v.webkitSetPresentationMode("picture-in-picture");
      } else {
        notifications.show({
          title: "Không hỗ trợ",
          message: "Trình duyệt này không hỗ trợ Picture-in-Picture",
          color: "yellow",
        });
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  const changeServer = async (item: PlayItem, index: number, serverLabel: string) => {
    setLoadingButton((prev) => ({ ...prev, [`${serverLabel}-${index}`]: true }));
    try {
      setCurrent({ ...item, serverLabel });
      playerBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      await saveWatchHistory(item, serverLabel);
    } finally {
      setTimeout(() => {
        setLoadingButton((prev) => ({
          ...prev,
          [`${serverLabel}-${index}`]: false,
        }));
      }, 1000);
    }
  };

  const relatedGenre = (info?.genres || []).map(findGenreByName).find(Boolean);

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
      {info && (
        <Helmet>
          <title>{info.name}</title>
          <meta property="og:image" content={info.poster || info.thumb} />
          <meta property="og:title" content={info.name} />
          {info.description && (
            <meta property="og:description" content={info.description.slice(0, 160)} />
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
            src={info?.thumb || PlaceHolderImage}
            style={{ width: 150, borderRadius: 8, flexShrink: 0 }}
            alt={info?.name || "poster"}
            placeholderSrc={PlaceHolderImage}
          />
          <Stack gap={6}>
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <Title order={2}>{info?.name}</Title>
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
            {info?.originName && (
              <Text size="sm" c="dimmed">{info.originName}</Text>
            )}
            <Group gap="xs">
              {info?.year && <Badge variant="light">{info.year}</Badge>}
              {info?.country && <Badge variant="light" color="teal">{info.country}</Badge>}
              {info?.language && (
                <Badge variant="light" color="grape">{info.language}</Badge>
              )}
            </Group>
            {info?.time && <Text size="sm">Thời lượng: {info.time}</Text>}
            <Group gap={6} align="center">
              <Text size="sm">Thể loại:</Text>
              {(info?.genres || []).length === 0 && <Text size="sm">Chưa có thể loại</Text>}
              {(info?.genres || []).map((name) => {
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
              Số tập: {info?.currentEpisode}
              {info?.totalEpisodes ? ` / ${info.totalEpisodes}` : ""}
            </Text>
          </Stack>
        </Flex>
      </Card>

      {current && (
        <>
          <Box
            ref={playerBoxRef}
            mt="md"
            w="100%"
            maw={1280}
            style={{ aspectRatio: "16 / 9" }}
          >
            {current.kind === "m3u8" ? (
              <HlsPlayer ref={videoRef} src={current.url} />
            ) : (
              <iframe
                width="100%"
                height="100%"
                src={current.url}
                style={{ border: 0, borderRadius: 8 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                tabIndex={0}
              ></iframe>
            )}
          </Box>
          {current.kind === "m3u8" && (
            <Group w="100%" maw={1280} mt="xs" justify="flex-end">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPictureInPicture size={16} />}
                onClick={enterPip}
              >
                Xem PiP
              </Button>
            </Group>
          )}
        </>
      )}

      <Stack w="100%" maw={1280} mt="xl" gap="lg">
        {servers.map((server) => (
          <Box key={server.label}>
            <Badge
              variant="dot"
              color={current?.serverLabel === server.label ? "green" : "indigo"}
              radius="sm"
              size="lg"
            >
              {server.label}
            </Badge>
            <Group mt="sm" gap="xs">
              {server.items.map((item, index2) => (
                <Button
                  key={`${item.name}-${index2}`}
                  onClick={() => changeServer(item, index2, server.label)}
                  variant={
                    current?.url === item.url && current?.serverLabel === server.label
                      ? "filled"
                      : "light"
                  }
                  loading={loadingButton[`${server.label}-${index2}`] || false}
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
