import { Button, Grid, LoadingOverlay } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom"
import { LazyLoadImage } from "react-lazy-load-image-component";
interface FilmData {
  movie: {
      name: string;
      poster_url: string;
  };
  episodes: {
      server_name: string;
      server_data: {
          link_embed: string;
          name: string;
      }[];
  }[];
}

const DetailMovie=()=>{
    const { id } = useParams()
    const [filmData, setFilmData] = useState<FilmData>();
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
    return (
        <>
         <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        <div>{filmData?.movie?.name}</div>
        <LazyLoadImage src={filmData?.movie?.poster_url} style={{ width: '70%' }} alt="Image Alt" />
        <div>
          {filmData?.episodes?.map((episode, index) => (
            <>
            <div key={index}>{episode.server_name}</div>
            <Grid>
            {episode.server_data?.map((data, dataIndex) =>(
               <Grid.Col key={dataIndex} span='content'>
              <Button><Link to={data.link_embed} style={{color:'black'}}>{data.name}</Link></Button>
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