/**
 * Ghi log xem phim.
 *
 * Trang web không còn đăng nhập, nên "ai xem" được nhận diện bằng:
 *  - deviceId: chuỗi ngẫu nhiên sinh 1 lần rồi lưu trong localStorage của máy đó
 *  - thiết bị/trình duyệt: đọc từ user agent
 *  - IP: hỏi /api/ip (trình duyệt không tự biết IP công khai của nó)
 *
 * Log nằm ở collection `watch-logs` trên Firestore — chỉ ghi, không đọc từ phía
 * người xem (xem firestore.rules). Trang /admin đăng nhập rồi mới đọc được.
 * Lịch sử hiển thị cho chính người xem thì lưu local, không cần đọc Firestore.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const DEVICE_KEY = 'hth_device_id';
const HISTORY_KEY = 'hth_watch_history';
const MAX_LOCAL_HISTORY = 60;

export interface WatchEvent {
  filmId: string;
  filmName: string;
  episodeName: string;
  serverName: string | null;
  image?: string;
}

export interface LocalHistoryItem extends WatchEvent {
  /** filmId|episodeName|serverName — dùng để chống trùng và làm React key */
  key: string;
  watchedAt: string;
}

/** localStorage có thể bị chặn (chế độ riêng tư, cookie bị khoá) — đừng để nổ */
const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* hết dung lượng hoặc bị chặn: bỏ qua */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* bỏ qua */
    }
  },
};

const randomId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* Safari cũ / http không có randomUUID */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** ID cố định của máy này. Sinh lần đầu rồi giữ nguyên cho tới khi xoá dữ liệu trình duyệt. */
export const getDeviceId = (): string => {
  const saved = safeStorage.get(DEVICE_KEY);
  if (saved) return saved;
  const id = randomId();
  safeStorage.set(DEVICE_KEY, id);
  return id;
};

/** Đoán trình duyệt + hệ điều hành từ user agent, ví dụ "Chrome · Windows". */
export const describeDevice = (ua = navigator.userAgent): string => {
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Trình duyệt khác';

  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android TV|GoogleTV/.test(ua) ? 'Android TV'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Hệ điều hành khác';

  return `${browser} · ${os}`;
};

/** Hỏi IP 1 lần cho mỗi phiên rồi dùng lại — tránh gọi /api/ip mỗi lần bấm tập. */
let ipPromise: Promise<string> | null = null;
const getClientIp = (): Promise<string> => {
  if (!ipPromise) {
    ipPromise = fetch('/api/ip')
      .then((res) => (res.ok ? res.json() : { ip: '' }))
      .then((data) => String(data?.ip || ''))
      .catch(() => '');
  }
  return ipPromise;
};

const historyKey = (event: WatchEvent) =>
  `${event.filmId}|${event.episodeName}|${event.serverName || ''}`;

export const readLocalHistory = (): LocalHistoryItem[] => {
  const raw = safeStorage.get(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalHistoryItem[]) : [];
  } catch {
    return [];
  }
};

export const clearLocalHistory = () => safeStorage.remove(HISTORY_KEY);

/** Đẩy tập vừa xem lên đầu danh sách, bỏ bản ghi trùng cũ. */
const saveLocalHistory = (event: WatchEvent) => {
  const key = historyKey(event);
  const item: LocalHistoryItem = { ...event, key, watchedAt: new Date().toISOString() };
  const next = [item, ...readLocalHistory().filter((entry) => entry.key !== key)];
  safeStorage.set(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_LOCAL_HISTORY)));
};

/** Gửi 1 bản ghi lên Firestore. Chạy nền, lỗi chỉ ghi ra console. */
const sendToFirestore = async (event: WatchEvent): Promise<void> => {
  if (!db) return;
  try {
    const ip = await getClientIp();
    await addDoc(collection(db, 'watch-logs'), {
      deviceId: getDeviceId(),
      device: describeDevice(),
      userAgent: navigator.userAgent,
      ip,
      platform: 'web',
      filmId: event.filmId,
      filmName: event.filmName,
      episodeName: event.episodeName,
      serverName: event.serverName || '',
      image: event.image || '',
      timestamp: serverTimestamp(),
      watchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Không gửi được log xem phim:', error);
  }
};

/**
 * Lưu lịch sử local và gửi log lên Firestore.
 *
 * Không chờ Firestore: addDoc chỉ resolve khi server xác nhận, nên mạng chậm
 * hoặc Firestore không với tới được sẽ treo nút chọn tập. Việc xem phim không
 * bao giờ phải đợi việc ghi log.
 */
export const logWatch = (event: WatchEvent): void => {
  saveLocalHistory(event);
  void sendToFirestore(event);
};
