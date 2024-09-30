import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { LoadingOverlay, Grid, Pagination } from '@mantine/core';
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Category, CategoryName } from '../data/enumCategory';
import { Helmet } from 'react-helmet';

const PhimLe = () => {
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);
  const [pageCount, setPageCount] = useState<any>();
  const [pagePresent, setPagePresent] = useState(1);
  const location = useLocation();
  const [currentLocation, setCurrentLocation] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    setCurrentLocation(currentPath);
    setPagePresent(1);
    
  }, [location]);
  useEffect(() => {
    const fetchData = async (apiFirst: string) => {
      setVisible(true)
      setData([])
      try {
        const response = await axios.get(apiFirst);
          setPageCount(response.data.Pagination);
          setData(response.data.Records)
      } catch (error) {
        console.error('Error fetching data:', error);
        setTimeout(() => {
          setRetryCount(retryCount + 1);
        }, 1000);
      }
      setVisible(false)
    };
    if (currentLocation == Category.phim_chieu_rap) {
      fetchData(`https://motchilltv.my/api/search?categoryId&countryId&typeRaw&year&orderBy=UpdateOn&isChieuRap=true&search&pageNumber=${pagePresent}`);
    }
    else if (currentLocation == Category.phim_le) {
      fetchData(`https://motchilltv.my/api/search?typeRaw=single&year&orderBy=UpdateOn&search&pageNumber=${pagePresent}`)
    }
    else if (currentLocation == Category.phim_bo) {
      fetchData(`https://motchilltv.my/api/search?typeRaw=series&year&orderBy=UpdateOn&search&pageNumber=${pagePresent}`)
    }
  }, [pagePresent, currentLocation,retryCount]);
  return (
    <div>
      <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Helmet>
        <title>{CategoryName[currentLocation as keyof typeof Category]}</title>
        <meta property="og:title" content={CategoryName[currentLocation as keyof typeof Category]}/>
      </Helmet>
      <h1 style={{ textAlign: 'center' }}>{CategoryName[currentLocation as keyof typeof Category]}</h1>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Grid>
          {data?.map((item, index) => (
            <Grid.Col span={{ base: 6, md: 6, lg: 3 }}>
              <div key={index} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} >
                <Link style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} to={"/detail/" + item.Link} className=''>
                  <LazyLoadImage height={250} src={item.AvatarImageThumb} alt='image' />
                  <div>{item.Name}</div>
                </Link>
              </div>
            </Grid.Col>
          ))}
        </Grid>
        <Pagination style={{marginTop:15}} total={pageCount?.PageCount} onChange={setPagePresent} siblings={5} defaultValue={1} value={pagePresent} />
      </div>
    </div>
  );
};

export default PhimLe;