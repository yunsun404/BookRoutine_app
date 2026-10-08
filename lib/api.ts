import AsyncStorage from "@react-native-async-storage/async-storage";

// const BASE_URL = 'http://10.10.22.134:3000/api/v1'; // 내 방 와이파이
//const BASE_URL = 'http://localhost:3000/api/v1'; // 백엔드 주소로 바꿔줘
//const BASE_URL = "http://172.20.1.230:3000/api/v1"; // 차319 와이파이
// EXPO_PUBLIC_API_BASE_URL(.env)이 있으면 그걸 쓰고, 없으면 로컬호스트로 폴백
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1`
  : "http://localhost:3000/api/v1";

// 기본 요청 함수
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await AsyncStorage.getItem("access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 서버 IP가 바뀌었거나 서버가 꺼져 있으면 fetch는 수십 초~무한히 응답을 기다립니다.
  // 10초가 지나면 요청을 끊고 에러를 던져서 "무한 로딩" 대신 원인을 보여주게 합니다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(
        `서버 응답이 없어요 (${BASE_URL}). 서버 실행 여부와 IP 주소를 확인해주세요.`,
      );
    }
    throw new Error(`서버에 연결할 수 없어요 (${BASE_URL}).`);
  } finally {
    clearTimeout(timer);
  }
  console.log("요청 주소:", `${BASE_URL}${endpoint}`);
  console.log("요청 body:", options.body);

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
      "/auth/register",
      { method: "POST", body: JSON.stringify(body) },
    ),

  // 로그인
  login: (body: { username: string; password: string }) =>
    request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 토큰 갱신
  refresh: (refresh_token: string) =>
    request<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  // 로그아웃
  logout: (body: { refresh_token: string }) =>
    request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 탈퇴
  deleteAccount: (body: {}) =>
    request<{ success: boolean }>("/auth/delete", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};

// ────────────────────────────────────────
// 사용자 (Users)
// ────────────────────────────────────────

export const userApi = {
  // 내 프로필 조회 (최신 확장 데이터 타입 반영)
  getMe: () =>
    request<{
      user_id: string;
      username: string;
      nickname: string;
      age?: number | null;
      email: string;
      password: string;
      profile_image?: string | null;
      reading_style?: object | null;
      reading_habit?: object | null;
      favorite_genre?: object | null;
      notifications_enabled?: boolean;
      created_at: Date;
    }>("/users/me"),

  // 프로필 수정
  updateMe: (body: {
    username?: string;
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
      username: string;
      nickname: string;
      age?: number;
      email?: string;
      password?: string;
      profile_image?: string;
      reading_style?: object;
      reading_habit?: object;
      favorite_genre?: object;
      updated_at: Date;
    }>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),

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

  // FCM 디바이스 토큰 등록 (알림 권한 승인 직후 / 로그인 직후 호출)
  updateFcmToken: (fcm_token: string) =>
    request<{ success: boolean }>("/users/me/fcm-token", {
      method: "PATCH",
      body: JSON.stringify({ fcm_token }),
    }),

  // 마이페이지 > 알림 설정 화면의 켜기/끄기 스위치
  updateNotificationSettings: (notifications_enabled: boolean) =>
    request<{ success: boolean; notifications_enabled: boolean }>(
      "/users/me/notification-settings",
      {
        method: "PATCH",
        body: JSON.stringify({ notifications_enabled }),
      },
    ),
};

// ────────────────────────────────────────
// 알림 (Notifications)
// ────────────────────────────────────────

export const notificationApi = {
  // 알림 목록 조회 (최신순)
  getList: () =>
    request<{
      notifications: {
        notification_id: string;
        type: string | null;
        title: string | null;
        content: string | null;
        is_read: boolean;
        scheduled_at: string | null;
        sent_at: string | null;
        created_at: string;
      }[];
    }>("/notifications"),

  // 알림 읽음 처리
  markAsRead: (notification_id: string) =>
    request<{ success: boolean; is_read: boolean }>(
      `/notifications/${notification_id}/read`,
      { method: "PATCH" },
    ),
};

// ────────────────────────────────────────
// 그룹 (Group) - 새로 병합된 섹션
// ────────────────────────────────────────

export const groupApi = {
  // 그룹 생성
  create: (body: {
    group_name: string;
    people_count?: number;
    book_id?: string;
    isbn?: string;
    title?: string;
    author?: string;
    total_pages?: number;
    cover_url?: string;
    target_date?: Date;
  }) =>
    request<{
      new_group: {
        group_name: string;
        people_count: number;
        invite_code: string;
        created_by: string;
        created_at: Date;
      };
      new_group_member: {
        group_id: string;
        user_id: string;
        role: number;
        joined_at: Date;
      };
      new_group_book: {
        group_id: string;
        book_id: string;
        target_date: Date;
        created_at: Date;
      } | null;
    }>("/groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 책 검색
  searchBooks: (title: string) =>
    request<
      {
        book_id: string;
        title: string;
        author?: string;
        cover_url?: string;
      }[]
    >(`/reading-goals/search?title=${encodeURIComponent(title)}`),

  // 그룹 목록 조회
  getList: () =>
    request<
      {
        group_id: string;
        group_name: string;
        people_count?: number;
        invite_code?: string;
        created_by: string;
        created_at: Date;
        group_books: [
          {
            book_id?: string;
          },
        ];
        _count: [
          {
            group_members?: number;
          },
        ];
      }[]
    >("/groups"),

  // 그룹 상세 조회
  getDetail: (group_id: string) =>
    request<{
      group_id: string;
      group_name: string;
      people_count?: number;
      invite_code?: string;
      created_by: string;
      created_at: Date;
      group_books: [
        {
          book_id?: string;
          target_date?: Date;
          book: { title: string };
        },
      ];
      creator: { nickname: string; }
    }>(`/groups/${group_id}`),

  // 그룹 입장
  joinGroup: (body: { invite_code: string }) =>
    request<{
      group_id: string;
      user_id: string;
      role: number;
      joined_at: Date;
    }>(`/groups/join`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 그룹 퇴장
  leaveGroup: (group_id: string) =>
    request<{ success: boolean }>(`/groups/${group_id}/leave`, {
      method: "POST",
    }),

  // 그룹 타래 조회
  getGroupThread: (group_id: string) =>
    request<
      {
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
        user: { nickname: string };
        book: { title: string };
      }[]
    >(`/groups/${group_id}/threads`),

  // 독서방 활성 여부
  getReadingRoomStatus: (group_id: string) =>
    request<{ is_active: boolean }>(`/groups/${group_id}/realtime-status`),

  // 그룹 편집
  updateGroup: (
    group_id: string,
    body: {
      group_name?: string;
      people_count?: number;
      book_id?: string;
      isbn?: string;
      title?: string;
      author?: string;
      total_pages?: number;
      cover_url?: string;
      target_date?: Date;
    },
  ) =>
    request<{
      update_group: {
        group_name: string;
        people_count: number;
      };
      update_group_book: {
        book_id: string;
        target_date: Date;
      }
    }>(`/groups/${group_id}/update`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // 그룹 삭제
  deleteGroup: (group_id: string) =>
    request<{}>(`/groups/${group_id}`, {
      method: "DELETE",
    }),
};

// ────────────────────────────────────────
// 실시간 독서방 (reading-room)
// ────────────────────────────────────────

export const readingroomApi = {
  // 독서방 생성
  start: (body: {
    user_id: string;
    group_id: string;
    book_id: string;
    started_by: string;
    is_active: boolean;
    started_at: Date;
  }) =>
    request<{
      create: {
        user_id: string;
        group_id: string;
        book_id: string;
        started_by: string;
        is_active: boolean;
        started_at: Date;
        room_id: string;
      };
      enter: { user_id: string; room_id: string; entered_at: Date };
    }>("/reading-room/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 독서방 입장 알림
  enter: (body: { group_id: string; user_id: string }) =>
    request<{ success: boolean }>("/reading-room/enter", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 현재 독서방 참여자 조회
  getUsers: (room_id: string, date: string) =>
    request<{ users: object[] }>(
      `/reading-room/users?room_id=${room_id}&date=${date}`,
    ),

  // 집중도 측정 결과 저장
  saveFocus: (body: {
    room_id: string;
    user_id: string;
    focus_score: number;
  }) =>
    request<{ success: boolean }>("/reading-room/focus", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 딴짓 알림
  sendStatus: (body: { group_id: string; user_id: string; status: string }) =>
    request<{ user_id: string }>("/reading-room/status", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 독서 활동 로그 조회
  getLogs: (body: { room_id: string; date: string }) =>
    request<{ logs: object[] }>("/reading-room/logs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ────────────────────────────────────────
// 추천 (Recommendation) - 장르유사도/난이도매칭/완독패턴 기반 추천
// ────────────────────────────────────────

export const bookApi = {
  // 추천 도서 목록 조회 (장르/난이도/완독패턴 가중합 정렬된 top-N)
  getRecommendations: (limit?: number) =>
    request<
      {
        book_id: string;
        title: string;
        author: string | null;
        cover_url: string | null;
        genre_score: number;
        difficulty_score: number;
        completion_score: number;
        my_score: number;
      }[]
    >(`/recommendation${limit ? `?limit=${limit}` : ""}`),
};
