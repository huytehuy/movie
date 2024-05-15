import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SearchComponent from './search';
import { LoadingOverlay, Grid } from '@mantine/core';

const MyComponent: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchData = async (apiFirst:string) => {
      setVisible(true)
      try {
        const response = await axios.get(apiFirst);
        console.log(response) 
        setData(response.data.items);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setVisible(false)
    };
    fetchData('https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1');

  }, []);

  return (
    <div>
       <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <SearchComponent/>
      <h1 style={{textAlign:'center'}}>List of Data</h1>
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
      <Grid>
        {data.map((item, index) => (
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <div key={index} style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} >
          <Link style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} to={"/detail/"+item.slug} className=''>
    <img height={300} src={`https://img.ophim15.cc/uploads/movies/${item.thumb_url}`}/>
          <div>{item.name}</div>
         
          </Link>
          </div>
          </Grid.Col>
        ))}
        </Grid>
    </div>
    </div>
  );
};

export default MyComponent;
