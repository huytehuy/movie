import { Badge, Box, Button, Grid, LoadingOverlay } from "@mantine/core";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from "../assets/800@3x.png";
import { isMobile } from "react-device-detect";
import { Helmet } from "react-helmet";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, updateDoc, getDocs, where, query } from 'firebase/firestore';
import { notifications } from "@mantine/notifications";

interface FilmData {
  name: string;
  thumb_url: string;
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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true);
      try {
        const actualId = id?.replace('.tsx', '');
        const response = await axios.get(
          `https://phim.nguonc.com/api/film/${actualId}`
        );
        setFilmData(response.data.movie);
        
        if (response.data.movie.episodes) {
          const targetServer = type 
            ? response.data.movie.episodes.find((ep:any) => ep.server_name === type)
            : '';
  
          if (targetServer) {
            if (episode) {
              if (episode === 'FULL') {
                // Xử lý trường hợp FULL
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
              // Lưu lịch sử cho episode đầu tiên
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
    serverName: any
  ) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        notifications.show({
          title: 'Warning',
          message: 'Please login to save your watch history',
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
        // Nếu chưa tồn tại thì thêm mới
        await addDoc(historyRef, historyData);
      } else {
        // Kiểm tra thời gian
        const lastDoc = querySnapshot.docs[0];
        const lastTimestamp = lastDoc.data().timestamp?.toDate();
        const now = new Date();
        const hoursDiff = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);
  
        if (hoursDiff >= 1) {
          // Nếu đã hơn 1 giờ, thêm bản ghi mới
          await addDoc(historyRef, historyData);
          console.log('New watch history saved after 1 hour');
        } else {
          // Nếu chưa đủ 1 giờ, cập nhật timestamp
          const docRef = lastDoc.ref;
          await updateDoc(docRef, {
            timestamp: serverTimestamp(),
            lastWatched: new Date().toISOString()
          });
          console.log('Watch history updated - less than 1 hour');
        }
      }
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
  };

  const changeServer = async (data: any, index: number, serverName: string) => {
    setLoadingButton((prev) => ({ ...prev, [`${serverName}-${index}`]: true }));
    try {
      setDataIframe(data.embed);
      if (iframeRef.current) {
        iframeRef.current.focus();
      }
      // Lưu lịch sử xem
      await saveWatchHistory(data, serverName);
    } finally {
      setTimeout(() => {
        setLoadingButton((prev) => ({
          ...prev,
          [`${serverName}-${index}`]: false,
        })); // Reset loading sau khi xong
      }, 1000);
    }
  };

  return (
    <Box
      style={{ display: "flex", alignItems: "center", flexDirection: "column" }}
    >
      {filmData&&<Helmet>
        <title>{filmData.name}</title>
        <meta property="og:image" content={filmData.thumb_url} />
        <meta property="og:title" content={filmData.name} />
      </Helmet>
}
      <LoadingOverlay
        visible={visible}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Box
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <Box w={170}>
          <LazyLoadImage
            src={filmData?.thumb_url || PlaceHolderImage}
            style={{ width: 150 }}
            alt="Image Alt"
            placeholderSrc={PlaceHolderImage}
          />
        </Box>
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <Box style={{ color: "blue" }}>{filmData?.name}</Box>
          <Box>Thời lượng: {filmData?.time}</Box>
          <Box>Ngôn ngữ: {filmData?.language}</Box>
          <Box>Năm phát hành: {filmData?.category?.[3]?.list[0]?.name}</Box>
          <Box>Quốc gia: {filmData?.category?.[4]?.list[0]?.name}</Box>
          <Box>
            Thể loại:{" "}
            {filmData?.category?.["2"]?.list
              .map((item) => item.name)
              .join(", ") || "Chưa có thể loại"}
          </Box>

          <Box>Số tập: {filmData?.total_episodes}</Box>
          <Box>Số tập hiện tại: {filmData?.current_episode}</Box>
        </Box>
      </Box>

      {dataIframe && (
        <Box
          style={{
            marginTop: 10,
            height: "100%",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <iframe
            ref={iframeRef}
            width={isMobile ? "100%" : "1280"}
            height={isMobile ? "300" : "720"}
            src={dataIframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            tabIndex={0}
          ></iframe>
        </Box>
      )}

      <Grid style={{ paddingLeft: "15%", paddingRight: "15%", marginTop: 20 }}>
        {filmData?.episodes?.map((episode, index) => (
          <Grid.Col key={episode.Id} span={12}>
            <Badge 
              variant="dot" 
              color={type === episode.server_name ? "green" : "blue"} 
              radius="sm"
            >
              {episode.server_name}
            </Badge>
            <Grid style={{ marginTop: 20 }} key={index}>
              {episode.items.map((item, index2) => (
                <Grid.Col
                  key={item.Id}
                  span="content"
                  style={{ display: "flex", justifyContent: "flex-start" }}
                >
                  <Button
                    onClick={() =>
                      changeServer(item, index2, episode.server_name)
                    } // Gửi tên server
                    color={dataIframe === item.embed ? "#1c3246" : "blue"}
                    loading={
                      loadingButton[`${episode.server_name}-${index2}`] || false
                    } // Kiểm tra trạng thái loading cho nút cụ thể
                    fullWidth
                  >
                    {item.name}
                  </Button>
                </Grid.Col>
              ))}
            </Grid>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
};

export default DetailMovie;
