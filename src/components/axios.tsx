import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { LoadingOverlay, Image } from '@mantine/core';
import { Category, CategoryName } from '../data/enumCategory';
import { Helmet } from 'react-helmet';
import PlaceHolderImage from '../assets/800@3x.png';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';

const MyComponent = () => {
  const API = "https://cors-anywhere.herokuapp.com/https://motchilltv.my/api/moviehomepage";
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);
  const location = useLocation();
  const [currentLocation, setCurrentLocation] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    setCurrentLocation(currentPath);
  }, [location]);

  useEffect(() => {
    const fetchData = async (apiFirst: string) => {
      setVisible(true);
      setData([]);
      try {
        const response = await axios.get(apiFirst);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (retryCount <= 2) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 1000);
        }
      }
      setVisible(false);
    };
    fetchData(API);
  }, [currentLocation, retryCount]);

  return (
    <div>
      <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Helmet>
        <title>{CategoryName[currentLocation as keyof typeof Category]}</title>
        <meta property="og:title" content={CategoryName[currentLocation as keyof typeof Category]} />
      </Helmet>
      {data.map((item, index) => {
        const validProducts = item.Products.filter((product: any) => product.AvatarImageThumb && product.Name);

        return (
          <div key={index}>
            {validProducts.length > 0 && ( // Render title only if there are valid products
              <h1 style={{ textAlign: 'center' }}>{item.Title}</h1>
            )}
            {validProducts.length > 0 ? ( // Check if there are valid products
              <Carousel
                slideSize="20%"
                slideGap="md"
                loop
                align="start"
                slidesToScroll={2}
                nextControlProps={{
                  style: { backgroundColor: '#fff' }
                }}
                previousControlProps={{
                  style: { backgroundColor: '#fff' }
                }}
              >
                {validProducts.map((item2: any, index2: number) => (
                  <Carousel.Slide key={index2}>
                    <Link style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} to={"/detail/" + item2.Link}>
                      <Image h={250} fit='contain' w='auto' src={item2.AvatarImageThumb || PlaceHolderImage} alt='image' radius='md' />
                      <div>{item2.Name}</div>
                    </Link>
                  </Carousel.Slide>
                ))}
              </Carousel>
            ) : ""}
          </div>
        );
      })}
    </div>
  );
};

export default MyComponent;
