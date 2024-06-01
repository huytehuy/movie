import { Button, Grid, LoadingOverlay } from "@mantine/core";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
interface PlayUrl {
    url: string;
    name: string;
}
const SportDetail = () => {
    const [data, setData] = useState<PlayUrl[]>([]);
    const [link, setLink] = useState();
    const [reloadIframe, setReloadIframe] = useState(false);
    const [active, setActive] = useState('');
    const { id } = useParams();
    const [visible, setVisible] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setVisible(true)
            try {
                const response = await axios.get(`https://api.vebo.xyz/api/match/${id}/meta`, {
                });
                setData(response.data?.data?.play_urls);
                if (response.data?.data?.play_urls?.length > 0) {
                    setLink(response.data.data.play_urls[0]?.url);
                    setActive(response.data?.data?.play_urls[0]?.name);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setVisible(false);
        };
        fetchData()
    }, [id])
    console.log(data)
    const handleButtonClick = (url: any, name: any) => {
        setLink(url);
        setReloadIframe(true); // Set reloadIframe to true to reload the iframe
        setActive(name);
    };

    const handleIframeLoad = () => {
        if (reloadIframe) {
            setReloadIframe(false); // Reset reloadIframe to false after reloading the iframe
        }
    };

    useEffect(() => {
        console.log(iframeRef)
        const handleFullscreen = () => {
            if (iframeRef.current) {
                iframeRef.current.focus();

                // Ép kiểu để bỏ qua kiểm tra loại của TypeScript
                const iframe: any = iframeRef.current;

                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                } else if (iframe.mozRequestFullScreen) {
                    iframe.mozRequestFullScreen();
                } else if (iframe.webkitRequestFullscreen) {
                    iframe.webkitRequestFullscreen();
                } else if (iframe.msRequestFullscreen) {
                    iframe.msRequestFullscreen();
                }
            }
        };

        if (iframeRef.current) {
            iframeRef.current.addEventListener('load', handleFullscreen);
        }

        return () => {
            if (iframeRef.current) {
                iframeRef.current.removeEventListener('load', handleFullscreen);
            }
        };
    }, [link]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
            <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            <Helmet>
                <title>Trực tiếp bóng đá</title>
            </Helmet>
            {isMobile ? <iframe
                ref={iframeRef}
                width="100%"
                height="300"
                src={`https://xem.bdhub.xyz/v7/?link=${link}&is_live=0&theme_id=vebotv`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={handleIframeLoad}
            /> : <iframe
                ref={iframeRef}
                className="iframe-container"
                src={`https://xem.bdhub.xyz/v7/?link=${link}&is_live=0&theme_id=vebotv`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen
                onLoad={handleIframeLoad}
            />}

            <div style={{ marginTop: 10 }}>
                <Grid>
                    {data.map((value, index) => (
                        <Grid.Col key={index} span='content'><Button style={{ marginRight: 10 }} color={active == value.name ? '#1c3246' : 'blue'} key={index} onClick={() => handleButtonClick(value?.url, value?.name)}>{value.name}</Button></Grid.Col>
                    ))}
                </Grid>
            </div>

        </div>)
}
export default SportDetail