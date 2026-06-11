import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://10.10.22.134:3000/api/v1'; // 내 방 와이파이
const BASE_URL = 'http://localhost:3000/api/v1'; // 백엔드 주소로 바꿔줘
// const BASE_URL = 'http://172.20.17.241:3000/api/v1'; // 차319 와이파이

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
  // 회원가입 (최신 확장 필드 유지)
  register: (body: {
    username: string;
    email: string;
    password: string;
    nickname: string;
    age: number | null;
    profile_image: string | null;
    reading_style: object | null;
    reading_habit: object | null;
    favorite_genre: object | null;
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
  // 내 프로필 조회 (최신 확장 데이터 타입 반영)
  getMe: () =>
    request<{
      user_id: string;
      nickname: string;
      age?: number | null;
      email: string;
      password: string;
      profile_image?: string | null;
      reading_style?: object | null;
      reading_habit?: object | null;
      favorite_genre?: object | null;
      created_at: Date;
    }>('/users/me'),

  // 프로필 수정
  updateMe: (body: {
    nickname?: string;
    age?: number;
    email?: string;
    password?: string;
    profile_image?: string;
    reading_style?: object;
    reading_habit?: object;
    favorite_genre?: object;
  }) =>
    request<{
      user_id: string;
      nickname: string;
      age?: number;
      email?: string;
      password?: string;
      profile_image?: string;
      reading_style?: object;
      reading_habit?: object;
      favorite_genre?: object;
      updated_at: Date;
    }>(
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
// 그룹 (Group) - 새로 병합된 섹션
// ────────────────────────────────────────

export const groupApi = {
  // 그룹 생성
  create: (body: { group_name: string; people_count?: number; book_id?: string; target_date?: Date; }) =>
    request<{
      new_group: { group_name: string, people_count: number, invite_code: string, created_by: string, created_at: Date };
      new_group_member: { group_id: string, user_id: string, role: number, joined_at: Date };
      new_group_book: { group_id: string, book_id: string, target_date: Date, created_at: Date } | null;
    }>('/groups', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 그룹 목록 조회
  getList: () =>
    request<{
      group_id: string;
      group_name: string;
      people_count?: number;
      invite_code?: string;
      created_by: string;
      created_at: Date;
      group_books: [{
        book_id?: string;
      }]
    }[]>('/groups'),

  // 그룹 상세 조회
  getDetail: (group_id: string) =>
    request<{
      group_id: string;
      group_name: string;
      people_count?: number;
      invite_code?: string;
      created_by: string;
      created_at: Date;
      group_books: [{
        book_id?: string;
      }]
    }>(`/groups/${group_id}`),

  // 그룹 입장
  joinGroup: (body: { invite_code: string }) =>
    request<{
      group_id: string;
      user_id: string;
      role: number;
      joined_at: Date;
    }>(`/groups/join`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  // 그룹 퇴장
  leaveGroup: (group_id: string) =>
    request<{ success: boolean }>(`/groups/${group_id}/leave`, {
      method: 'POST',
    }),

  // 그룹 타래 조회
  getGroupThread: (group_id: string) =>
    request<{
      thread_id: string;
      user_id: string;
      book_id: string;
      group_id?: string;
      content: string;
      current_page?: number;
      is_public: boolean;
      likes: number;
      created_at: Date;
      updated_at: Date;
    }[]>(`/groups/${group_id}/threads`),

  // 독서방 활성 여부
  getReadingRoomStatus: (group_id: string) =>
    request<{ is_active: boolean }>(`/groups/${group_id}/realtime-status`),

  // 그룹 편집
  updateGroup: (group_id: string, body: {
    group_name?: string;
    people_count?: number;
    book_id?: string;
  }) =>
    request<{
      group_name?: string;
      people_count?: number;
      book_id?: string;
    }>(`/groups/${group_id}/update`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),

  // 그룹 삭제
  deleteGroup: (group_id: string) =>
    request<{}>(`/groups/${group_id}`, {
      method: 'DELETE'
    })
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