import { BASE_URL, getToken } from '@/constants/api';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  // 다른 API(lib/api.ts, constants/api.ts)와 같은 주소 규칙을 쓰도록 BASE_URL(= .../api/v1)을 재사용합니다.
  // 이전엔 env 값을 그대로 써서 (1) /api/v1 접두사가 빠지고 (2) .env가 없으면 baseURL이 undefined가 되어
  // 웹에서 Expo 개발서버(8081)로 요청이 가 HTML이 200으로 돌아오는 문제가 있었습니다.
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

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // TODO: refresh 로직 or 로그인 화면으로 리다이렉트
    }
    return Promise.reject(err);
  },
);