import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccessToken, isAuthEndpoint, sendWithAuth } from "../lib/auth/session";

// lib/api.ts와 같은 규칙: .env의 EXPO_PUBLIC_API_BASE_URL이 있으면 그걸 쓰고, 없으면 localhost.
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1`
  : "http://localhost:3000/api/v1";

export async function getToken(): Promise<string> {
  const token = await AsyncStorage.getItem("access_token");
  return token ?? "";
}
export async function getRefreshToken(): Promise<string> {
  const token = await AsyncStorage.getItem("refreshToken"); // ✅ 통일
  return token ?? "";
}

export async function getUserId(): Promise<string> {
  const id = await AsyncStorage.getItem("user_id");
  return id ?? "";
}

// 토큰을 붙여 보냄. 401(토큰 만료)이면 갱신 후 1번 다시 보내고,
// 갱신도 안 되면 세션 만료 처리(로그인 화면으로) 후 그 401 응답을 그대로 돌려줌 — lib/auth/session.ts
export async function authFetch(url: string, options: RequestInit = {}) {
  const send = (token: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
        ...options.headers,
      },
    });
  return isAuthEndpoint(url) ? send(await getAccessToken()) : sendWithAuth(send);
}
