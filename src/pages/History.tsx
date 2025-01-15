import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/firebaseConfig';
import { Card, Text, Stack, Loader, Button, Grid, Flex } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Helmet } from 'react-helmet';

interface HistoryItem {
  id: string;
  filmId: string;
  filmName: string;
  episodeName: string;
  serverName: string;
  timestamp: Date;
  lastWatched: string;
  image: string;
}

function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user:any) => {
      setAuthChecked(true);
      if (!user) {
        notifications.show({
          title: 'Warning',
          message: 'Please login to view history',
          color: 'yellow'
        });
        navigate('/');
      } else {
        fetchHistory(user.uid);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [navigate]);

  const fetchHistory = async (userId: string) => {
    try {
      const historyRef = collection(db, 'watch-history', userId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      const historyData: HistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        } as HistoryItem);
      });

      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load watch history',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWatchAgain = (filmId: string, serverName: string, episode: string) => {
    const encodedServer = encodeURIComponent(serverName);
    const encodedEpisode = encodeURIComponent(episode);
    navigate(`/detail/${filmId}?type=${encodedServer}&episode=${encodedEpisode}`);
  };

  // Hiển thị loading khi đang kiểm tra auth hoặc đang tải dữ liệu
  if (!authChecked || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Lịch sử xem phim</h1>
<Helmet>
  <title>Lịch sử xem phim</title>
</Helmet>
      {history.length === 0 ? (
        <Text c="dimmed">Không có lịch sử xem phim</Text>
      ) : (
        <Grid>
          {history.map((item) => (
            <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                <Card key={item.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack>
                  <Flex justify="center" align="center" direction="column">
                  <LazyLoadImage style={{objectFit:"cover", height:"150px", width:"auto", borderRadius:"8px"}} src={item.image} alt={item?.filmName} />
                  <Text fw={500} size="lg">{item.filmName}</Text>
                      </Flex>
                      
                    <Text size="sm" c="dimmed">
                      Tập: {item.episodeName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Định dạng: {item.serverName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Xem lần cuối: {item.timestamp.toLocaleString()}
                    </Text>
                    <Button
                      variant="light"
                      color="blue"
                      fullWidth
                      mt="md"
                      radius="md"
                      onClick={() => handleWatchAgain(item.filmId, item.serverName, item.episodeName)}
                    >
                      Xem tiếp
                    </Button>
                  </Stack>
                </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default History;