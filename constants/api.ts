import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}
