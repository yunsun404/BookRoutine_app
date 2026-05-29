import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface User {
  user_id: string;
  nickname: string;
  profile_image?: string;
  reading_style?: JSON;
  favorite_genre?: JSON;
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access_token: null,
  isLoggedIn: false,

  setAuth: async (user, access_token, refreshToken) => {
    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    set({ user, access_token, isLoggedIn: true });
  },

  restoreToken: async () => {
    const access_token = await AsyncStorage.getItem('access_token');
    if (access_token) {
      set({ access_token, isLoggedIn: true });
    }
  },

  clearAuth: async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refreshToken');
    set({ user: null, access_token: null, isLoggedIn: false });
  },

  updateaccess_token: async (access_token) => {
    await AsyncStorage.setItem('access_token', access_token);
    set({ access_token });
  },
}));
