import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { LoadingOverlay } from "@mantine/core";
import { Helmet } from "react-helmet";
import PlaceHolderImage from "../assets/800@3x.png";
import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
import { isMobile } from "react-device-detect";
import { Movie } from "../types/Movie";

const MyComponent = () => {
  const APIHOT = "https://ophim1.com/v1/api/home";
  const APIDANGCHIEU = "https://phim.nguonc.com/api/films/danh-sach";
  const [data, setData] = useState<Movie[]>([]);
  const [dataDangChieu, setDataDangchieu] = useState<Movie[]>([]);
  const [dataPhimLe, setDataPhimLe] = useState<Movie[]>([]);
  const [dataPhimBo, setDataPhimBo] = useState<Movie[]>([]);
  const [dataTvShows, setDataTvShows] = useState<Movie[]>([]);
  const [visible, setVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setVisible(true);
      try {
        const response = await axios.get(APIHOT);
        console.log("APIHOT response:", response.data);
        if (response?.data?.data?.items) {
          setData(response.data.data.items);
        } else {
          // Fallback or check if the structure is different
          setData(response?.data?.items || []);
        }

        const response2 = await axios.get(
          `${APIDANGCHIEU}/phim-dang-chieu?page=1`
        );
        setDataDangchieu(response2?.data?.items || []);
        const response3 = await axios.get(`${APIDANGCHIEU}/phim-le?page=1`);
        setDataPhimLe(response3?.data?.items || []);
        const response4 = await axios.get(`${APIDANGCHIEU}/phim-bo?page=1`);
        setDataPhimBo(response4?.data?.items || []);
        const response5 = await axios.get(`${APIDANGCHIEU}/tv-shows?page=1`);
        setDataTvShows(response5?.data?.items || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (retryCount <= 2) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 1000);
        }
      }
      setVisible(false);
    };
    fetchData();
  }, [retryCount]);

  return (
    <div>
      <LoadingOverlay
        visible={visible}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Helmet>
        <title>Huytehuy Movies</title>
        <meta property="og:title" content="Huytehuy Movies" />
      </Helmet>
      <div>
        <h1 style={{ textAlign: "center" }}>Phim đang HOT</h1>
        <Carousel
          slideGap="md"
          loop
          align="start"
          slidesToScroll={2}
          nextControlProps={{
            style: { backgroundColor: "#fff" },
          }}
          previousControlProps={{
            style: { backgroundColor: "#fff" },
          }}
        >
          {data.map((item, index) => {
            return (
              <div key={index}>
                <Carousel.Slide key={index}>
                  <Link
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                    to={"/detail/" + item.slug}
                  >
                    <img
                      style={{
                        height: isMobile ? "200px" : "350px",
                        width: "auto",
                        objectFit: "cover", // Ensures the image covers the area while maintaining aspect ratio
                        borderRadius: "8px",
                      }}
                      src={
                        `https://ophim18.cc/_next/image?url=https%3A%2F%2Fimg.ophim.live%2Fuploads%2Fmovies%2F${item.thumb_url}&w=1200&q=75` ||
                        PlaceHolderImage
                      }
                      alt="image"
                    />

                    <div>{item.name}</div>
                  </Link>
                </Carousel.Slide>
              </div>
            );
          })}
        </Carousel>
      </div>

      <div>
        <h1 style={{ textAlign: "center" }}>Phim đang chiếu</h1>
        <Carousel
          slideGap="md"
          loop
          align="start"
          slidesToScroll={2}
          nextControlProps={{
            style: { backgroundColor: "#fff" },
          }}
          previousControlProps={{
            style: { backgroundColor: "#fff" },
          }}
        >
          {dataDangChieu.map((item, index) => {
            return (
              <div key={index}>
                <Carousel.Slide key={index}>
                  <Link
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                    to={"/detail/" + item.slug}
                  >
                    <img
                      style={{
                        height: isMobile ? "200px" : "350px",
                        width: "auto",
                        objectFit: "cover", // Ensures the image covers the area while maintaining aspect ratio
                        borderRadius: "8px",
                      }}
                      src={item.thumb_url || PlaceHolderImage}
                      alt="image"
                    />
                    <div>{item.name}</div>
                  </Link>
                </Carousel.Slide>
              </div>
            );
          })}
        </Carousel>
      </div>

      <div>
        <h1 style={{ textAlign: "center" }}>Phim lẻ</h1>
        <Carousel
          slideGap="md"
          loop
          align="start"
          slidesToScroll={2}
          nextControlProps={{
            style: { backgroundColor: "#fff" },
          }}
          previousControlProps={{
            style: { backgroundColor: "#fff" },
          }}
        >
          {dataPhimLe.map((item, index) => {
            return (
              <div key={index}>
                <Carousel.Slide key={index}>
                  <Link
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                    to={"/detail/" + item.slug}
                  >
                    <img
                      style={{
                        height: isMobile ? "200px" : "350px",
                        width: "auto",
                        objectFit: "cover", // Ensures the image covers the area while maintaining aspect ratio
                        borderRadius: "8px",
                      }}
                      src={item.thumb_url || PlaceHolderImage}
                      alt="image"
                    />
                    <div>{item.name}</div>
                  </Link>
                </Carousel.Slide>
              </div>
            );
          })}
        </Carousel>
      </div>

      <div>
        <h1 style={{ textAlign: "center" }}>Phim bộ</h1>
        <Carousel
          slideGap="md"
          loop
          align="start"
          slidesToScroll={2}
          nextControlProps={{
            style: { backgroundColor: "#fff" },
          }}
          previousControlProps={{
            style: { backgroundColor: "#fff" },
          }}
        >
          {dataPhimBo.map((item, index) => {
            return (
              <div key={index}>
                <Carousel.Slide key={index}>
                  <Link
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                    to={"/detail/" + item.slug}
                  >
                    <img
                      style={{
                        height: isMobile ? "200px" : "350px",
                        width: "auto",
                        objectFit: "cover", // Ensures the image covers the area while maintaining aspect ratio
                        borderRadius: "8px",
                      }}
                      src={item.thumb_url || PlaceHolderImage}
                      alt="image"
                    />
                    <div>{item.name}</div>
                  </Link>
                </Carousel.Slide>
              </div>
            );
          })}
        </Carousel>
      </div>

      <div>
        <h1 style={{ textAlign: "center" }}>TV Shows</h1>
        <Carousel
          slideGap="md"
          loop
          align="start"
          slidesToScroll={2}
          nextControlProps={{
            style: { backgroundColor: "#fff" },
          }}
          previousControlProps={{
            style: { backgroundColor: "#fff" },
          }}
        >
          {dataTvShows.map((item, index) => {
            return (
              <div key={index}>
                <Carousel.Slide key={index}>
                  <Link
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                    to={"/detail/" + item.slug}
                  >
                    <img
                      style={{
                        height: isMobile ? "200px" : "350px",
                        width: "auto",
                        objectFit: "cover", // Ensures the image covers the area while maintaining aspect ratio
                        borderRadius: "8px",
                      }}
                      src={item.thumb_url || PlaceHolderImage}
                      alt="image"
                    />
                    <div>{item.name}</div>
                  </Link>
                </Carousel.Slide>
              </div>
            );
          })}
        </Carousel>
      </div>
    </div>
  );
};

export default MyComponent;
