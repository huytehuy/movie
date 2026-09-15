import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  PasswordInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { IconAlertCircle, IconLock, IconLogout, IconRefresh } from '@tabler/icons-react';
import { Helmet } from 'react-helmet-async';
import { auth, db } from '../firebase/firebaseConfig';

const PAGE_SIZE = 100;

interface LogRow {
  id: string;
  deviceId: string;
  device: string;
  ip: string;
  platform: string;
  filmId: string;
  filmName: string;
  episodeName: string;
  serverName: string;
  watchedAt: Date | null;
}

/** Rút gọn deviceId cho dễ đọc */
const shortId = (id: string) => (id.length > 10 ? `${id.slice(0, 8)}...` : id);

const formatTime = (date: Date | null) =>
  date
    ? date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Không rõ';

const toRow = (doc: QueryDocumentSnapshot<DocumentData>): LogRow => {
  const data = doc.data();
  // timestamp là serverTimestamp (chuẩn hơn); watchedAt là giờ máy người xem,
  // dùng làm dự phòng khi bản ghi vừa tạo và server chưa gán timestamp.
  const stamp = data.timestamp?.toDate?.() ?? (data.watchedAt ? new Date(data.watchedAt) : null);
  return {
    id: doc.id,
    deviceId: String(data.deviceId || ''),
    device: String(data.device || ''),
    ip: String(data.ip || ''),
    platform: String(data.platform || ''),
    filmId: String(data.filmId || ''),
    filmName: String(data.filmName || ''),
    episodeName: String(data.episodeName || ''),
    serverName: String(data.serverName || ''),
    watchedAt: stamp,
  };
};

/**
 * Đổi lỗi Firestore thành câu tiếng Việt nói rõ phải sửa ở đâu.
 * Mã lỗi thật luôn được giữ ở cuối để còn tra cứu được.
 */
const explainFirestoreError = (err: unknown, email: string): string => {
  const code = (err as { code?: string })?.code || '';
  const detail = (err as { message?: string })?.message || String(err);

  if (code === 'permission-denied') {
    return `Firestore từ chối quyền đọc. Tài khoản đang đăng nhập là "${email}" — email này phải nằm trong hàm isAdmin() của firestore.rules, và rules phải được bấm Publish trên Firebase Console.`;
  }
  if (code === 'failed-precondition') {
    return `Firestore thiếu index cho truy vấn này. Mở Console (F12), Firestore in ra sẵn một đường link tạo index — bấm vào đó rồi đợi index build xong. (${detail})`;
  }
  if (code === 'unauthenticated') {
    return 'Phiên đăng nhập đã hết hạn. Đăng xuất rồi đăng nhập lại.';
  }
  if (code === 'unavailable') {
    return 'Không kết nối được tới Firestore. Kiểm tra mạng, hoặc trình chặn quảng cáo đang chặn firestore.googleapis.com.';
  }
  return `Không tải được log: ${detail}`;
};

function LoginForm({ onError }: { onError: (message: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) return;
    setLoading(true);
    onError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error('Đăng nhập admin thất bại:', error);
      onError('Email hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="70vh">
      <Paper withBorder shadow="md" p="xl" radius="md" w={380} maw="100%">
        <form onSubmit={handleSubmit}>
          <Stack>
            <Group gap="xs">
              <IconLock size={20} />
              <Title order={3}>Đăng nhập quản trị</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Khu vực xem log, chỉ dành cho quản trị viên.
            </Text>
            <TextInput
              label="Email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              autoComplete="username"
            />
            <PasswordInput
              label="Mật khẩu"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              autoComplete="current-password"
            />
            <Button type="submit" loading={loading} fullWidth mt="sm">
              Đăng nhập
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}

function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchLogs = useCallback(
    async (after: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!db) return;
      setLoading(true);
      setError('');
      try {
        const logsRef = collection(db, 'watch-logs');
        const q = after
          ? query(logsRef, orderBy('timestamp', 'desc'), startAfter(after), limit(PAGE_SIZE))
          : query(logsRef, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
        const snapshot = await getDocs(q);

        const batch = snapshot.docs.map(toRow);
        setRows((prev) => (after ? [...prev, ...batch] : batch));
        setCursor(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error('Không tải được log:', err);
        setError(explainFirestoreError(err, auth?.currentUser?.email || ''));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user) fetchLogs(null);
  }, [user, fetchLogs]);

  const devices = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      if (!row.deviceId) return;
      map.set(row.deviceId, `${shortId(row.deviceId)} — ${row.device || row.platform || 'Không rõ'}`);
    });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [rows]);

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (deviceFilter && row.deviceId !== deviceFilter) return false;
      if (!keyword) return true;
      return (
        row.filmName.toLowerCase().includes(keyword) ||
        row.filmId.toLowerCase().includes(keyword) ||
        row.ip.toLowerCase().includes(keyword) ||
        row.device.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search, deviceFilter]);

  const topFilm = useMemo(() => {
    const counter = new Map<string, number>();
    visibleRows.forEach((row) => {
      if (!row.filmName) return;
      counter.set(row.filmName, (counter.get(row.filmName) || 0) + 1);
    });
    return Array.from(counter).sort((a, b) => b[1] - a[1])[0];
  }, [visibleRows]);

  if (!authChecked) {
    return (
      <Center mih="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Chưa cấu hình Firebase thì không có gì để đăng nhập, cũng không có log
  if (!auth || !db) {
    return (
      <Center mih="60vh" px="md">
        <Alert icon={<IconAlertCircle size={18} />} color="yellow" title="Chưa cấu hình Firebase">
          Thêm các biến VITE_FIREBASE_* vào file .env (xem .env.example) rồi build lại để dùng
          trang quản trị.
        </Alert>
      </Center>
    );
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Quản trị</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Stack>
          {error && (
            <Center>
              <Alert icon={<IconAlertCircle size={18} />} color="red" w={380} maw="100%">
                {error}
              </Alert>
            </Center>
          )}
          <LoginForm onError={setError} />
        </Stack>
      </>
    );
  }

  return (
    <Stack>
      <Helmet>
        <title>Quản trị — Log xem phim</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>Log xem phim</Title>
          <Text size="sm" c="dimmed">
            {user.email}
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            loading={loading}
            onClick={() => fetchLogs(null)}
          >
            Tải lại
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={() => auth && signOut(auth)}
          >
            Đăng xuất
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={18} />} color="red">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 3 }}>
        <Card withBorder padding="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            Lượt xem
          </Text>
          <Text fw={700} size="xl">
            {visibleRows.length}
          </Text>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            Thiết bị
          </Text>
          <Text fw={700} size="xl">
            {new Set(visibleRows.map((row) => row.deviceId)).size}
          </Text>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            Xem nhiều nhất
          </Text>
          <Text fw={700} size="lg" lineClamp={1}>
            {topFilm ? `${topFilm[0]} (${topFilm[1]})` : '—'}
          </Text>
        </Card>
      </SimpleGrid>

      <Group wrap="wrap">
        <TextInput
          placeholder="Tìm theo tên phim, IP, thiết bị..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Select
          placeholder="Tất cả thiết bị"
          data={devices}
          value={deviceFilter}
          onChange={setDeviceFilter}
          clearable
          searchable
          w={280}
        />
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder miw={860}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={150}>Thời gian</Table.Th>
              <Table.Th>Phim</Table.Th>
              <Table.Th w={110}>Tập</Table.Th>
              <Table.Th w={110}>Nguồn</Table.Th>
              <Table.Th w={170}>Thiết bị</Table.Th>
              <Table.Th w={130}>IP</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>{formatTime(row.watchedAt)}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {row.filmName || row.filmId || '—'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {row.filmId}
                  </Text>
                </Table.Td>
                <Table.Td>{row.episodeName || '—'}</Table.Td>
                <Table.Td>{row.serverName || '—'}</Table.Td>
                <Table.Td>
                  <Text size="sm">{row.device || row.platform || '—'}</Text>
                  <Badge size="xs" variant="light" color="gray">
                    {shortId(row.deviceId)}
                  </Badge>
                </Table.Td>
                <Table.Td>{row.ip || '—'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {!loading && visibleRows.length === 0 && (
        <Center py="xl">
          <Text c="dimmed">Chưa có log nào</Text>
        </Center>
      )}

      {loading && (
        <Center py="md">
          <Loader />
        </Center>
      )}

      {hasMore && !loading && (
        <Center>
          <Button variant="subtle" onClick={() => fetchLogs(cursor)}>
            Tải thêm
          </Button>
        </Center>
      )}
    </Stack>
  );
}

export default Admin;
