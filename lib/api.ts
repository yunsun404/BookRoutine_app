import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://10.10.22.134:3000/api/v1'; // 백엔드 주소로 바꿔줘
const BASE_URL = 'http://localhost:3000/api/v1'; // 백엔드 주소로 바꿔줘

// 기본 요청 함수
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('access_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  console.log('요청 주소:', `${BASE_URL}${endpoint}`);
  console.log('요청 body:', options.body);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // 204 No Content 같은 경우 json 파싱 스킵
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ────────────────────────────────────────
// 인증 (Auth)
// ────────────────────────────────────────

export const authApi = {
  // 회원가입
  register: (body: {
    username: string;
    email: string;
    password: string;
    nickname: string;
    // age: number | null;
    // profile_image: string | null;
    // reading_style: JSON | null;
    // reading_habit: JSON | null;
    // favorite_genre: JSON | null;
  }) =>
    request<{ user_id: string; access_token: string; refresh_token: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // 로그인
  login: (body: { username: string; password: string }) =>
    request<{ access_token: string; refresh_token: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // 토큰 갱신
  refresh: (refresh_token: string) =>
    request<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  // 로그아웃
  logout: (body: { refresh_token: string }) =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 탈퇴
  deleteAccount: (body: {}) =>
    request<{ success: boolean }>('/auth/delete', {
      method: 'DELETE',
      body: JSON.stringify(body),
    })
};

// ────────────────────────────────────────
// 사용자 (Users)
// ────────────────────────────────────────

export const userApi = {
  // 내 프로필 조회
  getMe: () =>
    request<{
      user_id: string;
      nickname: string;
      profile_image?: string;
      reading_style?: JSON;
      favorite_genre?: JSON;
    }>('/users/me'),

  // 프로필 수정
  updateMe: (body: {
    nickname?: string;
    profile_image?: string;
    reading_style?: JSON;
    favorite_genre?: JSON;
  }) =>
    request<{ user_id: string; nickname: string; updated_at: string }>(
      '/users/me',
      { method: 'PATCH', body: JSON.stringify(body) }
    ),

  // 특정 사용자 프로필 조회
  getUser: (user_id: string) =>
    request<{
      user_id: string;
      nickname: string;
      profile_image?: string;
      bookshelf: object[];
      stats: object;
      favorite_genre?: JSON;
    }>(`/users/${user_id}`),
};

// ────────────────────────────────────────
// 실시간 독서방 (reading-room)
// ────────────────────────────────────────

export const readingroomApi = {
  // 독서방 생성
  start: (body: { user_id: string; group_id: string; book_id: string; started_by: string; is_active: boolean; started_at: Date; }) =>
    request<{
      create: { user_id: string, group_id: string, book_id: string, started_by: string, is_active: boolean, started_at: Date, room_id: string };
      enter: { user_id: string, room_id: string, entered_at: Date };
    }>('/reading-room/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 독서방 입장 알림
  enter: (body: { group_id: string; user_id: string }) =>
    request<{ success: boolean }>('/reading-room/enter', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 현재 독서방 참여자 조회
  getUsers: (room_id: string, date: string) =>
    request<{ users: object[] }>(
      `/reading-room/users?room_id=${room_id}&date=${date}`
    ),

  // 집중도 측정 결과 저장
  saveFocus: (body: {
    room_id: string;
    user_id: string;
    focus_score: number;
  }) =>
    request<{ success: boolean }>('/reading-room/focus', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 딴짓 알림
  sendStatus: (body: {
    group_id: string;
    user_id: string;
    status: string;
  }) =>
    request<{ user_id: string }>('/reading-room/status', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 독서 활동 로그 조회
  getLogs: (body: { room_id: string; date: string }) =>
    request<{ logs: object[] }>('/reading-room/logs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
