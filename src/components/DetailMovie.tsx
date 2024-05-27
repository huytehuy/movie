import { Box, Button, Grid, LoadingOverlay, Text } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { LazyLoadImage } from "react-lazy-load-image-component";
import SearchInput from "./SearchData";
import PlaceHolderImage from '../assets/800@3x.png'
import { isMobile } from "react-device-detect";
interface FilmData {
  movie: {
    name: string;
    thumb_url: string;
    time: String;
    quality: string;
    lang: string;
    year: string;
    director: string[];
    category: [];
    country: [];
  };
  episodes: {
    server_name: string;
    server_data: {
      link_embed: string;
      name: string;
    }[];
  }[];
}

interface FilmData2 {
  movie: {
    name: string;
    thumb_url: string;
  };
  episodes: {
    server_name: string;
    items: {
      embed: string;
      name: string;
    }[];
  }[];
}

const DetailMovie = () => {
  const { id } = useParams()
  const [filmData, setFilmData] = useState<FilmData>();
  const [filmData2, setFilmData2] = useState<FilmData2>();
  const [visible, setVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [dataIframe, setDataIframe] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true)
      try {
        const response = await axios.get(`https://ophim1.com/phim/${id}`);
        setFilmData(response.data);
      } catch (error) {
        console.error("Error fetching film data:", error);
      }
      setVisible(false)
    };

    fetchData();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      setVisible(true)
      try {
        const response2 = await axios.get(`https://phim.nguonc.com/api/film/${id}`);
        setFilmData2(response2.data.movie);
        console.log(response2.data.movie)
      } catch (error) {
        console.error("Error fetching film data:", error);
        if (retryCount <= 2) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 1000);
        }
      }
      setVisible(false)
    };

    fetchData();
  }, [retryCount]);

  // const handleButtonClick = () => {

  // };

  const handleButtonClick = (url: any) => {
    setDataIframe(url);
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
    }, 2000); // Set reloadIframe to true to reload the iframe
  };

  return (
    <Box style={{ display: 'flex', alignItems: "center", flexDirection: 'column' }}>
      <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <SearchInput />
      <Text mt={20} mb={10} fw={700} c="red">Nếu xem phim bị lag, vui lòng đổi máy chủ khác</Text>
      <Box style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }} >
        <Box w={170}>

          <LazyLoadImage src={filmData?.movie?.thumb_url} style={{ width: 150 }} alt="Image Alt" placeholderSrc={PlaceHolderImage} />
        </Box>

        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          <Box c={'blue'}>{filmData?.movie?.name}</Box>
          <Box>
            Thời lượng: {filmData?.movie?.time}
          </Box>
          <Box>
            Chất lượng: {filmData?.movie?.quality}
          </Box>
          <Box>
            Ngôn ngữ: {filmData?.movie?.lang}
          </Box>
          <Box>
            Năm phát hành: {filmData?.movie?.year}
          </Box>
          <Box>
            Đạo diễn: {filmData?.movie?.director[0]}
          </Box>
          <Box>
            Thể loại: {filmData?.movie?.category.map((data: any, key) => (
              <span key={key}>{data.name}{key !== filmData.movie.category.length - 1 && ', '}</span>
            ))}
          </Box>
          <Box>
            Quốc gia: {filmData?.movie?.country.map((data: any, key) => (
              <span key={key}>{data.name}{' '}</span>
            ))}
          </Box>
        </Box>


      </Box>
      {dataIframe && <Box style={{ marginTop: 10, height: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        {isMobile ? <iframe width="100%" height="300" src={dataIframe} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe> : <iframe width="1280" height="720" src="https://embed2.streamc.xyz/embed.php?hash=09ad15bd2c279d70ffbb89a6a2102a34" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>}
      </Box>}
      <div>
        {filmData?.episodes?.map((episode, index) => (
          <>
            <div key={index}>{episode.server_name}</div>
            <Grid>
              {episode.server_data?.map((data, dataIndex) => (
                <Grid.Col key={dataIndex} span='content'>
                  <Button onClick={() => handleButtonClick(data?.link_embed)} color={dataIframe == data?.link_embed ? '#1c3246' : 'blue'} >{data.name}</Button>
                </Grid.Col>
              ))}
            </Grid>
          </>
        ))}

        {filmData2?.episodes?.map((episode, index) => (
          <>
            <div key={index}>{episode.server_name} (nguonc)</div>
            <Grid>
              {episode.items?.map((data, dataIndex) => (
                <Grid.Col key={dataIndex} span='content'>
                  <Button onClick={() => handleButtonClick(data?.embed)} color={dataIframe == data?.embed ? '#1c3246' : 'blue'}>{data.name}</Button>
                </Grid.Col>
              ))}
            </Grid>
          </>
        ))}
      </div>
    </Box>
  )
}

export default DetailMovie