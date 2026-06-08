import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "http://localhost:3000/api/v1";

// 임시. 로그인 화면이 있다면 필요 x
export async function initAuth() {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "bookworm_kim",
        password: "1234",
      }),
    });
    const data = await res.json();
    await AsyncStorage.setItem("access_token", data.access_token);
    await AsyncStorage.setItem("refreshToken", data.refresh_token);

    // ✅ access_token에서 user_id 추출 (JWT payload의 sub 필드)
    const payload = JSON.parse(atob(data.access_token.split(".")[1]));
    await AsyncStorage.setItem("user_id", payload.sub);
  } catch (e) {
    console.error("자동 로그인 실패:", e);
  }
}
/*
실제 로그인 화면에서 입력받은 값. 로그인 화면이 있다면 필요 x
export async function initAuth(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    body: JSON.stringify({ username, password }),
  });
*/
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
