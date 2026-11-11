import { userApi } from '@/lib/api';
import { clearStoredTokens, getAccessToken, TOKEN_KEYS } from '@/lib/auth/session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface User {
  user_id: string;
  /** 로그인 아이디 (랭킹에서 내 줄 찾기용. 닉네임은 겹칠 수 있음) */
  username?: string;
  nickname: string;
  age?: number | null;
  profile_image?: string | null;
  reading_style?: object | null;
  reading_habit?: object | null;
  favorite_genre?: object | null;
  points?: number | null;
}

interface AuthState {
  user: User | null;
  access_token: string | null;
  isLoggedIn: boolean;

  // 로그인 후 토큰 + 유저 저장
  setAuth: (user: User, access_token: string, refreshToken: string) => Promise<void>;

  // 앱 시작 시 AsyncStorage에서 토큰 복원
  restoreToken: () => Promise<void>;

  // 로그아웃 (토큰 전부 삭제)
  clearAuth: () => Promise<void>;

  // 토큰 갱신 후 access_token만 교체
  updateaccess_token: (access_token: string) => Promise<void>;

  // 탈퇴
  deleteAuth: () => Promise<void>;

  // 수정된 프로필 반영
  updateUser: (user: Partial<User>) => Promise<void>;

  // 상품 구매 후 포인트 갱신
  updatePoints: (points: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access_token: null,
  isLoggedIn: false,

  setAuth: async (user, access_token, refreshToken) => {
    await AsyncStorage.setItem(TOKEN_KEYS.access, access_token);
    await AsyncStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
    set({ user, access_token, isLoggedIn: true });
  },

  // 앱 시작 시 (app/_layout.tsx 가 화면을 그리기 전에 부름)
  //  - 저장된 토큰이 있으면 /users/me 로 확인 (만료됐으면 request 가 refresh 토큰으로 갱신 후 다시 시도)
  //  - 갱신도 안 되면 세션 만료 처리가 토큰을 지움 → 로그아웃 상태로 시작 (로그인 화면)
  //  - 서버에 못 닿은 경우(네트워크)는 토큰이 남아 있으므로 로그인 상태 유지
  restoreToken: async () => {
    const access_token = await getAccessToken();
    if (!access_token) return;
    set({ access_token, isLoggedIn: true });
    try {
      const me = await userApi.getMe();
      set({ user: me, access_token: (await getAccessToken()) ?? access_token });
    } catch (e) {
      if (!(await getAccessToken())) {
        set({ user: null, access_token: null, isLoggedIn: false });
      } else {
        console.warn('프로필 확인 실패 (네트워크) — 로그인 상태는 유지:', e);
      }
    }
  },

  clearAuth: async () => {
    await clearStoredTokens();
    set({ user: null, access_token: null, isLoggedIn: false });
  },

  updateaccess_token: async (access_token) => {
    await AsyncStorage.setItem(TOKEN_KEYS.access, access_token);
    set({ access_token });
  },

  deleteAuth: async () => {
    await clearStoredTokens();
    set({ user: null, access_token: null, isLoggedIn: false });
  },

  updateUser: async (user: Partial<User>) => {
    set((state) => ({ user: { ...state.user, ...user } as User }));
    console.log('updateUser: ', user);
  },

  updatePoints: async (points: number) => {
    set((state) => ({
      user: state.user ? { ...state.user, points } : state.user,
    }))
  }
}));
