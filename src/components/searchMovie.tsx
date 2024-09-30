import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Grid, LoadingOverlay } from '@mantine/core';
import { LazyLoadImage } from "react-lazy-load-image-component";
import PlaceHolderImage from '../assets/800@3x.png'

const SearchData = () => {
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const { id } = useParams();
  useEffect(() => {
    const fetchData = async (query: any) => {
      setVisible(true);
      setData([]);
      try {
        const response = await axios.get(`https://motchilltv.my/api/searchmovie/${query}`, {
        });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setVisible(false);
    };
    fetchData(id)
  }, [id])
  return (
    <div >
      {data && (
        <div style={{ marginTop: 20 }}>
          <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
          <h1 style={{ textAlign: 'center' }}>Kết quả của từ khoá {id}</h1>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Grid>
              {data.map((item, index) => (
                <Grid.Col span={{ base: 6, md: 6, lg: 3 }}>
                  <div key={index} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} >
                    <Link style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} to={"/detail/" + item.Link}>
                      <LazyLoadImage src={item.AvatarImageThumb|| PlaceHolderImage }
                        height={250}
                        alt="Image Alt"
                        placeholderSrc={PlaceHolderImage}
                      />
                      <div>{item.Name}</div>
                    </Link>
                  </div>
                </Grid.Col>
              ))}
            </Grid>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchData;
