import { useEffect, useState } from 'react';
import { Card, Text, Stack, Button, Grid, Flex, Center, Title, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Helmet } from 'react-helmet-async';
import { IconTrash } from '@tabler/icons-react';
import { LocalHistoryItem, readLocalHistory, clearLocalHistory } from '../services/watchLog';

/**
 * Lịch sử xem của chính máy này (lưu trong localStorage) — không cần đăng nhập.
 * Log tổng hợp của mọi máy nằm ở trang /admin.
 */
function History() {
  const [history, setHistory] = useState<LocalHistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setHistory(readLocalHistory());
  }, []);

  const handleClear = () => {
    clearLocalHistory();
    setHistory([]);
  };

  const handleWatchAgain = (item: LocalHistoryItem) => {
    const encodedServer = encodeURIComponent(item.serverName || '');
    const encodedEpisode = encodeURIComponent(item.episodeName);
    navigate(`/detail/${item.filmId}?type=${encodedServer}&episode=${encodedEpisode}`);
  };

  return (
    <div>
      <Helmet>
        <title>Lịch sử xem phim</title>
      </Helmet>

      <Group justify="center" align="center" mb="lg" gap="md">
        <Title order={1} ta="center">
          Lịch sử xem phim
        </Title>
        {history.length > 0 && (
          <Button
            variant="subtle"
            color="red"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={handleClear}
          >
            Xoá lịch sử
          </Button>
        )}
      </Group>

      {history.length === 0 ? (
        <Center mt="xl">
          <Text c="dimmed">Không có lịch sử xem phim</Text>
        </Center>
      ) : (
        <Grid>
          {history.map((item) => (
            <Grid.Col span={{ base: 12, xs: 6, md: 4, lg: 3 }} key={item.key}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Stack>
                  <Flex justify="center" align="center" direction="column">
                    <LazyLoadImage
                      style={{ objectFit: 'cover', height: '150px', width: 'auto', borderRadius: '8px' }}
                      src={item.image}
                      alt={item.filmName}
                    />
                    <Text fw={500} size="lg">
                      {item.filmName}
                    </Text>
                  </Flex>

                  <Text size="sm" c="dimmed">
                    Tập: {item.episodeName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Định dạng: {item.serverName || 'Không rõ'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Xem lần cuối: {new Date(item.watchedAt).toLocaleString('vi-VN')}
                  </Text>
                  <Button
                    variant="light"
                    color="blue"
                    fullWidth
                    mt="md"
                    radius="md"
                    onClick={() => handleWatchAgain(item)}
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
