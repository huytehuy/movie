import { Button, Grid, LoadingOverlay } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom"
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
        console.log(id)
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
      console.log(filmData)
    return (
        <>
         <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        <div>{filmData?.movie?.name}</div>
        <img src={filmData?.movie?.poster_url} alt={filmData?.movie?.name} style={{ width: '70%' }} />
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
            {/* <Button ><Link to={episode.server_data[1]?.link_embed} style={{color:'black'}}>{episode.server_data[1]?.name}</Link></Button> */}
            </>
          ))}
        </div>
      </>
    )
}

export default DetailMovie