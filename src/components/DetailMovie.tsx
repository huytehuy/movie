import { Box, Button, Grid, LoadingOverlay, Text } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom"
import { LazyLoadImage } from "react-lazy-load-image-component";
import SearchInput from "./SearchData";
import PlaceHolderImage from '../assets/800@3x.png'
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
    country:[];
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
      }
      setVisible(false)
    };

    fetchData();
  }, []);
  return (
    <>
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
      <div>
        {filmData?.episodes?.map((episode, index) => (
          <>
            <div key={index}>{episode.server_name}</div>
            <Grid>
              {episode.server_data?.map((data, dataIndex) => (
                <Grid.Col key={dataIndex} span='content'>
                 <Link to={data.link_embed} style={{ color: 'black' }}> <Button onClick={()=>setVisible(true)}>{data.name}</Button></Link>
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
                  <Link to={data.embed} style={{ color: 'black' }}><Button onClick={()=>setVisible(true)}>{data.name}</Button></Link>
                </Grid.Col>
              ))}
            </Grid>
          </>
        ))}
      </div>
    </>
  )
}

export default DetailMovie