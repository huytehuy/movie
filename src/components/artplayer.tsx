import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const FilmComponent = () =>{
    const [filmData, setFilmData] = useState<any>(null);
    const location = useLocation();
    const { link } = location.state;

    useEffect(() => {
        const fetchData = async (api:any) => {
          try {
            const response = await axios.get(api); // Calling the provided API function to fetch data
            setFilmData(response.data); // Assuming the response contains data
          } catch (error) {
            console.error("Error fetching film data:", error);
          }
        };
    
        fetchData(link); // Call fetchData function when the component mounts
      }, []);
    return(
    <>
      <div>
      <iframe
        title="Embedded Video"
        width="560"
        height="315"
        src={filmData?.episodes[0]?.server_data[0]?.link_embed}
        frameBorder="0"
        allowFullScreen
      ></iframe>
    </div>

    </>);
}
export default FilmComponent;
