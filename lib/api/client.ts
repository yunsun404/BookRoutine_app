import { BASE_URL, getToken } from '@/constants/api';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { expireSession, isAuthEndpoint, refreshAccessToken } from '../auth/session';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 401(토큰 만료) → 갱신 후 같은 요청 1번 다시. 갱신도 안 되면 세션 만료(로그인 화면으로) — lib/auth/session.ts */
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const config = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (err.response?.status !== 401 || !config || isAuthEndpoint(config.url ?? '')) {
      return Promise.reject(err);
    }
    if (config._retried) {
      await expireSession();
      return Promise.reject(err);
    }
    const fresh = await refreshAccessToken();
    if (!fresh) {
      await expireSession();
      return Promise.reject(err);
    }
    config._retried = true;
    config.headers.Authorization = `Bearer ${fresh}`;
    return api(config);
  },
);
