import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button, Grid, Input, LoadingOverlay} from '@mantine/core';
import { LazyLoadImage } from "react-lazy-load-image-component";

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [visibleResult, setVisibleResult] = useState(false);

  const fetchData = async () => {
    setVisible(true);
    setData([]);
    try {
      const response = await axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${query}`,{
      });
      setData(response.data?.data?.items);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setVisible(false);
    setVisibleResult(true);
  };

  const handleSubmit = (e:any) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div >
      <form onSubmit={handleSubmit} style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
        <Input
          mr={5}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
        />
        <Button type="submit">Search</Button>
      </form>
      {data && (
         <div style={{marginTop:20}}>
         <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      
        {visibleResult&&<h1 style={{textAlign:'center'}}>Result of Search</h1>}
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
        <Grid>
          {data.map((item, index) => (
            <Grid.Col span={{ base: 6, md: 6, lg: 3 }}>
            <div key={index} style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} >
            <Link style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} to={"/detail/"+item.slug}>
            <LazyLoadImage src={`https://img.ophim15.cc/uploads/movies/${item.thumb_url}`}
         height={250}
        alt="Image Alt"
      />
            <div>{item.name}</div>
           
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

export default SearchComponent;
