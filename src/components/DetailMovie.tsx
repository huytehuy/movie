import { Box, Button, Grid, LoadingOverlay} from "@mantine/core";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from '../assets/800@3x.png';
import { isMobile } from "react-device-detect";
import { Helmet } from "react-helmet";

interface FilmData {
  movie: {
    Name: string;
    AvatarImageThumb: string;
    Time: string;
    TypeRaw: string;
    lang: string;
    Year: string;
    director: string[];
    Categories: { Name: string }[];
    Countries: { Name: string }[];
    EpisodesTotal: string;
    Episodes:[{
      Id: string;
      Name:string;
    }];
  };
  episodeAll: {
    Id: string;
    Name: string;
  }[];
  episode: {
    server_name: string;
    server_data: {
      link_embed: string;
      Name: string;
    }[];
  }[];
}

const DetailMovie = () => {
  const { id } = useParams();
  const [filmData, setFilmData] = useState<FilmData | null>(null);
  const [dataEpisode, setDataEpisode] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);
  const [dataIframe, setDataIframe] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [movieId, setMovieId] = useState<string>("");
  const [episodeId, setEpisodeId] = useState<string>("");
  const [buttonLoading, setButtonLoading] = useState<boolean[]>([]); // Thêm state để theo dõi loading của từng nút
  const [buttonLoadingServer, setButtonLoadingServer] = useState<boolean[]>([]); // Thêm state để theo dõi loading của từng nút

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true);
      try {
        const response = await axios.get(`https://motchilltv.my/api/movie/${id}`);
        setFilmData(response?.data);
        setMovieId(response?.data?.movie?.Id);
      } catch (error) {
        console.error("Error fetching film data:", error);
      }
      setVisible(false);
    };

    fetchData();
  }, [id]);
  const changeServer = async (data: any, index: number) => {
    const updatedLoading = [...buttonLoadingServer];
    updatedLoading[index] = true; // Start loading for the corresponding button
    setButtonLoadingServer(updatedLoading);
    
    // Simulate the time it might take to change the server (if you have any async operation, put it here)
    try {
      setDataIframe(data.IsFrame?data.Link:`https://player.cloudbeta.win/play?link=${data.Link}`); // Set the new iframe data
      if (iframeRef.current) {
        iframeRef.current.focus();
      }
    } finally {
      updatedLoading[index] = false; // End loading for the corresponding button
      setButtonLoadingServer(updatedLoading);
    }
  };
  
  const fetchDataEpisode = async (url: string, index: number) => {
    const updatedLoading = [...buttonLoading];
    updatedLoading[index] = true; // Start loading for the corresponding button
    setButtonLoading(updatedLoading);
    
    try {
      const response = await axios.get(url);
      const filteredEpisodes = response.data;
      setDataEpisode(filteredEpisodes);
      
      // Set the first episode as iframe data if exists
      if (filteredEpisodes.length > 0) {
        changeServer(filteredEpisodes[0],0);
      }
    } catch (error) {
      console.error("Error fetching episode data:", error);
    } finally {
      updatedLoading[index] = false; // End loading for the corresponding button
      setButtonLoading(updatedLoading);
    }
  };
  

  const handleButtonClick = (url: string, index: number) => {
    if (!buttonLoading[index]) { // Kiểm tra xem API có đang tải không
      fetchDataEpisode(url, index);
      // Autofocus vào iframe sau khi nhấn nút
      if (iframeRef.current) {
        iframeRef.current.focus();
      }
    }
  };
  return (
    <Box style={{ display: 'flex', alignItems: "center", flexDirection: 'column' }}>
      <Helmet>
        <title>{filmData?.movie?.Name || "Loading..."}</title>
        <meta property="og:image" content={filmData?.movie?.AvatarImageThumb} />
        <meta property="og:title" content={filmData?.movie?.Name} />
      </Helmet>
      <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Box style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        <Box w={170}>
          <LazyLoadImage src={filmData?.movie?.AvatarImageThumb || PlaceHolderImage} style={{ width: 150 }} alt="Image Alt" placeholderSrc={PlaceHolderImage} />
        </Box>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box style={{color:"blue"}}>{filmData?.movie?.Name}</Box>
          <Box>Thời lượng: {filmData?.movie?.Time} phút</Box>
          <Box>Kiểu phim: {filmData?.movie?.TypeRaw}</Box>
          <Box>Năm phát hành: {filmData?.movie?.Year}</Box>
          <Box>Số tập: {filmData?.movie?.EpisodesTotal} tập</Box> 
          <Box>
            Quốc gia: {filmData?.movie?.Countries.map((country, key) => (
              <span key={key}>{country.Name}{key !== filmData.movie.Countries.length - 1 && ', '}</span>
            ))}
          </Box>
          <Box>
            Thể loại: {filmData?.movie?.Categories.map((category, key) => (
              <span key={key}>{category.Name}{key !== filmData.movie.Categories.length - 1 && ', '}</span>
            ))}
          </Box>
        </Box>
      </Box>

      {dataIframe && (
        <Box style={{ marginTop: 10, height: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
          {isMobile ? (
            <iframe ref={iframeRef} width="100%" height="300" src={dataIframe} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen tabIndex={0}></iframe>
          ) : (
            <iframe ref={iframeRef} width="1280" height="720" src={dataIframe} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen tabIndex={0}></iframe>
          )}
        </Box>
      )}

      <Grid style={{ paddingLeft: '15%', paddingRight: '15%', marginTop:20 }}>
        {filmData?.movie?.Episodes?.filter((episode:any)=>episode.Status==true).map((episode, index) => (
          <Grid.Col key={index} span='content'>
            <Button 
              onClick={() => {setEpisodeId(episode.Id);handleButtonClick(`https://motchilltv.my/api/play/get?movieId=${movieId}&episodeId=${episode.Id}`, index)}} 
              color={episodeId === episode.Id ? '#1c3246' : 'blue'}
              loading={buttonLoading[index]} // Hiển thị loading cho nút
            >
              {episode.Name}
            </Button>
          </Grid.Col>
        ))}
      </Grid>

      <Grid style={{ paddingLeft: '15%', paddingRight: '15%', marginTop:20 }}>
        {dataEpisode.map((episode, index) => (
          <Grid.Col key={index} span='content'>
            <Button 
              onClick={() => changeServer(episode,index)} 
              color={((dataIframe === episode.Link)||(dataIframe ===`https://player.cloudbeta.win/play?link=${episode.Link}`)) ? '#1c3246' : 'blue'}
              loading={buttonLoadingServer[index]} // Hiển thị loading cho nút
            >
              {episode.ServerName}
            </Button>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
};

export default DetailMovie;
