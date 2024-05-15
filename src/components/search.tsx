import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Grid, LoadingOverlay} from '@mantine/core';

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [visibleResult, setVisibleResult] = useState(false);

  const fetchData = async () => {
    setVisible(true);
    try {
      const response = await axios.get(`https://ophim1.com/v1/api/tim-kiem?keyword=${query}`,{
      });
      setData(response.data?.data?.items);
      console.log(response.data.data.items)
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
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
        />
        <button type="submit">Search</button>
      </form>
      {data && (
         <div style={{marginTop:20}}>
         <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      
        {visibleResult&&<h1 style={{textAlign:'center'}}>Result of Search</h1>}
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
        <Grid>
          {data.map((item, index) => (
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <div key={index} style={{display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} >
            <Link style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}} to={"/detail/"+item.slug} className=''>
      <img  height={300} src={`https://img.ophim15.cc/uploads/movies/${item.thumb_url}`}/>
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
