import { Badge, Box, LoadingOverlay, Paper, Stack, Text, Image } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

interface Match {
    id: string;
    name: string;
    is_live: boolean;
    match_status: string;
    parse_data?: {
        time: string;
    };
}

const SportComponnet = () => {
    const [data, setData] = useState<Match[]>([]);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setVisible(true)
            try {
                const response = await axios.get(`https://live.vebo.xyz/api/match/live`, {
                });
                setData(response.data?.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setVisible(false)
        };
        fetchData()
        const interval = setInterval(() => {// Fetch data every 2 minutes
        }, 120000);

        // Cleanup interval to avoid memory leaks
        return () => clearInterval(interval);

    }, [])

    console.log(data)
    const liveMatches = data.filter(match => match?.is_live === true);
    liveMatches.sort((a, b) => {
        if (a.match_status === "live" && b.match_status !== "live") {
            return -1; // prioritize "live" matches
        } else if (a.match_status !== "live" && b.match_status === "live") {
            return 1; // prioritize "pending" matches over others
        } else if (a.match_status === "pending" && b.match_status !== "live") {
            return -1; // prioritize "pending" matches
        } else if (a.match_status !== "pending" && b.match_status === "pending") {
            return 1; // prioritize other matches over "pending"
        } else {
            // for other matches, keep the order unchanged
            return 0;
        }
    });
    return (
        <div>
            <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            <Helmet>
        <title>Trực tiếp bóng đá</title>
      </Helmet>
            <Stack
                h={300}
                bg="var(--mantine-color-body)"
                align="flex-start"
                justify="flex-start"
                gap="md"
            >
                {liveMatches.map((value: any, index: any) => {
                    return (

                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Link key={index} to={`/sportDetail/${value.id}`} style={{ width: '100%' }}>
                                <Paper shadow="xs" p="xl" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',position:'relative' }}>
                                    <Box style={{position:'absolute',top:5,display:'flex'}}>
                                        <Image mr={5} src={value?.tournament?.logo} height={25} style={{ objectFit: 'contain' }} />
                                        <Box>{value?.tournament?.name}</Box>
                                    </Box>
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                        <Box style={{ minWidth: 80 }}>{value?.parse_data == null ? value?.match_status : value?.parse_data?.time}</Box>
                                        <Box>
                                            <Stack>
                                                <Box style={{ display: 'flex' }}>
                                                    <Image height={25} style={{ objectFit: 'contain' }} src={value?.home?.logo} />
                                                    <Text>{value?.home?.name}</Text>
                                                </Box>
                                                <Box style={{ display: 'flex' }}>
                                                    <Image height={25} style={{ objectFit: 'contain' }} src={value?.away?.logo} />
                                                    <Text>{value?.away?.name}</Text>
                                                </Box>
                                            </Stack>

                                        </Box>
                                    </Box>
                                    <Box style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Stack>
                                            <Badge size="xl">{value?.scores?.home}</Badge>
                                            <Badge size="xl">{value?.scores?.away}</Badge>
                                        </Stack>
                                        {/* <Image mr={5} src={value?.tournament?.logo} height={25} style={{ objectFit: 'contain' }}/>
                                <Box>{value?.tournament?.name}</Box> */}
                                    </Box>



                                </Paper></Link>


                        </div>
                    );
                })}
            </Stack >
        </div>


    )
}

export default SportComponnet;