import { getAccessToken, isAuthEndpoint, sendWithAuth } from "./auth/session";

// EXPO_PUBLIC_API_BASE_URL(.env)이 있으면 그걸 쓰고, 없으면 로컬호스트로 폴백
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1`
  : "http://localhost:3000/api/v1";

// 기본 요청 함수
// 저장된 access 토큰을 Authorization 헤더로 붙임. 401(토큰 만료)이면 갱신 후 1번 다시 보내고,
// 갱신도 안 되면 세션 만료 처리(로그인 화면으로) — lib/auth/session.ts
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // 서버 IP가 바뀌었거나 서버가 꺼져 있으면 fetch는 수십 초~무한히 응답을 기다립니다.
  // 10초가 지나면 요청을 끊고 에러를 던져서 "무한 로딩" 대신 원인을 보여주게 합니다.
  const send = async (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      return await fetch(`${BASE_URL}${endpoint}`, {
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
  };

  const response = isAuthEndpoint(endpoint)
    ? await send(await getAccessToken())
    : await sendWithAuth(send);
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

  // 토큰 갱신 (백엔드는 { refreshToken } 이름으로 받음. 401 자동 갱신은 lib/auth/session.ts)
  refresh: (refreshToken: string) =>
    request<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  // 로그아웃 (백엔드는 { refreshToken } 이름으로 받음 → 서버에 저장된 refresh 토큰 삭제)
  logout: (refreshToken: string) =>
    request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
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
  // 내 프로필 조회 (최신 확장 데이터 타입 반영) — 토큰은 request() 가 붙임
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
        group_members: [
          {
            joined_at: Date;
          }
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

  // 국립중앙도서관 사서 추천 (최근 추천순, 내 책장에 있는 책 제외)
  // - 선호 장르 중 사서 추천이 있는 장르(철학/역사/인문학/경제/과학/외국도서)가 있으면 그 장르 (genre 생략 시 첫 번째)
  // - 없으면 전체 최신 사서 추천 (genre: null)
  getLibrarianRecommendations: (genre?: string, limit = 10) =>
    request<{
      genres: string[]; // 칩으로 보여줄 장르
      genre: string | null; // 지금 보여주는 장르
      items: {
        isbn: string;
        title: string;
        author: string | null;
        cover_url: string | null;
        publisher: string | null;
        category: string; // 문학 / 인문과학 / 사회과학 / 자연과학
        recommended_at: string; // "2026.10"
      }[];
    }>(`/recommendation/librarian?limit=${limit}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`),

  // 또래가 읽고 있는 책 — 같은 연령대 사용자 책장 기준, 부족하면 전체 사용자 인기 책 (scope: "all")
  getPeerRecommendations: (limit = 10) =>
    request<{
      scope: "peer" | "all";
      age_group: number | null; // 20 → 20대
      items: {
        book_id: string;
        title: string;
        author: string | null;
        cover_url: string | null;
        reader_count: number;
      }[];
    }>(`/recommendation/peers?limit=${limit}`),
};
