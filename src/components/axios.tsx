import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import SearchComponent from './search';
import { LoadingOverlay, Grid, Pagination } from '@mantine/core';
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Category, CategoryName } from '../data/enumCategory';

const MyComponent = () => {
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);
  const [pageCount, setPageCount] = useState<any>();
  const [pagePresent, setPagePresent] = useState(1);
  const location = useLocation();
  const [currentLocation, setCurrentLocation] = useState('');

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    setCurrentLocation(currentPath);
    setPagePresent(1); // Remove the leading slash
    console.log(currentPath);
  }, [location]);
  useEffect(() => {
    const fetchData = async (apiFirst: string) => {
      setVisible(true)
      setData([])
      try {
        const response = await axios.get(apiFirst);
        if (currentLocation == Category.phim_moi) {
          setPageCount(response.data.pagination);
          setData(response.data.items)
        }
        else if (currentLocation == Category.phim_dang_hot) {
          setData(response.data)
        }
        else {
          setData(response.data.data.items)
          setPageCount(response.data.data.params.pagination);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setVisible(false)
    };
    if (currentLocation == Category.phim_moi) {
      fetchData(`https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=${pagePresent}`);
    }
    else if (currentLocation == Category.phim_le) {
      fetchData(`https://ophim1.com/v1/api/danh-sach/phim-le?slug=phim-le&sort_field=modified.time&category=&country=&year=2024&page=${pagePresent}`)
    }
    else if (currentLocation == Category.phim_bo) {
      fetchData(`https://ophim1.com/v1/api/danh-sach/phim-bo?slug=phim-bo&sort_field=modified.time&category=&country=&year=&page=${pagePresent}`)
    }
    else if (currentLocation == (Category.phim_dang_hot)) {
      fetchData('https://api.npoint.io/4d374d81c2a7f88140a4');
    }
  }, [pagePresent,currentLocation]);

  return (
    <div>
      <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <SearchComponent />
      <h1 style={{ textAlign: 'center' }}>{CategoryName[currentLocation as keyof typeof Category]}</h1>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Grid>
          {data?.map((item, index) => (
            <Grid.Col span={{ base: 6, md: 6, lg: 3 }}>
              <div key={index} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} >
                <Link style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} to={"/detail/" + item.slug} className=''>
                  <LazyLoadImage height={250} src={`https://img.ophim15.cc/uploads/movies/${item.thumb_url}`} alt='image' />
                  <div>{item.name}</div>
                </Link>
              </div>
            </Grid.Col>
          ))}
        </Grid>
        {currentLocation === Category.phim_moi ? <Pagination total={pageCount?.totalPages} onChange={setPagePresent} siblings={1} defaultValue={1} value={pagePresent} /> : currentLocation== Category.phim_dang_hot ? <div></div> : <Pagination total={pageCount?.pageRanges} onChange={setPagePresent} siblings={3} defaultValue={1} value={pagePresent} />}
      </div>
    </div>
  );
};

export default MyComponent;
