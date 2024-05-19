import { Badge, Box, LoadingOverlay, Paper, Stack, Text, Image } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";
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
                            <Link key={index} to={`/sportDetail/${value.id}`} style={{width:'100%'}}>
                            <Paper shadow="xs" p="xl" style={{ width: '100%',display:'flex',alignItems:'center' }}>

                                <Box style={{ display: 'flex', alignItems: 'center',width:400 }}>
                                    <Badge size="md" w={80} mr={15} color="blue">{value?.parse_data == null ? value?.match_status : value?.parse_data?.time}</Badge>
                                    <Box>
                                        <Box style={{display:'flex'}}>
                                        <Badge mr={5} size="md">{value?.scores?.home}</Badge>
                                            <Image height={25} style={{ objectFit: 'contain' }} src={value?.home?.logo} />
                                            <Text>{value?.home?.name}</Text>
                                        </Box>
                                        <Box style={{ display: 'flex' }}>
                                        <Badge mr={5} size="md">{value?.scores?.away}</Badge>
                                            <Image height={25} style={{ objectFit: 'contain' }} src={value?.away?.logo} />
                                            <Text>{value?.away?.name}</Text>
                                        </Box>
                                    </Box>
                                </Box>
                                <Box style={{display:'flex'}}>
                                <Image mr={5} src={value?.tournament?.logo} height={25} style={{ objectFit: 'contain' }}/>
                                <Box>{value?.tournament?.name}</Box>
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