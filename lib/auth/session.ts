/**
 * 로그인 토큰 관리 (저장 키, 갱신, 만료 처리) — HTTP 클라이언트 3곳(lib/api.ts, constants/api.ts, lib/api/client.ts)이 같이 씀
 *
 * 흐름
 *   요청 → 401 (access 토큰 만료, 1시간)
 *     → refreshAccessToken(): POST /auth/refresh { refreshToken } 로 새 access 토큰 받기 (동시에 여러 번 와도 1번만)
 *         성공 → 같은 요청을 새 토큰으로 1번 다시 보냄
 *         실패 → expireSession(): 토큰 지우고, 등록된 처리(로그인 화면으로 이동)를 부름
 *   네트워크 오류로 갱신을 못 한 것은 "만료"가 아님 → 로그아웃하지 않고 오류만 던짐
 *
 * 저장소: AsyncStorage (이미 쓰던 곳. SecureStore 는 설치돼 있지 않음)
 * 이 파일은 React·라우터를 모름 → 화면 이동은 app/_layout.tsx 가 setSessionExpiredHandler 로 넣어 줌
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEYS = {
  access: 'access_token',
  /** 백엔드 /auth/refresh·logout 이 받는 이름과 같게 */
  refresh: 'refreshToken',
} as const;

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL
  ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1`
  : 'http://localhost:3000/api/v1';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEYS.access);
}

export async function clearStoredTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEYS.access, TOKEN_KEYS.refresh]);
}

/* ─────────── 갱신 ─────────── */
let refreshing: Promise<string | null> | null = null;

/**
 * 새 access 토큰 받기.
 * @returns 새 토큰 / null = refresh 토큰이 없거나 서버가 거절함(= 다시 로그인 필요)
 * @throws 네트워크 오류 (서버에 못 닿음 → 만료로 보지 않음)
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(TOKEN_KEYS.refresh);
  if (!refreshToken) return null;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  // 백엔드는 DB에 없는 refresh 토큰이면 200 + 빈 응답을 줌 → 빈 응답도 실패로 봄
  const text = await res.text().catch(() => '');
  let data: { access_token?: unknown } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  const token = data?.access_token;
  if (typeof token !== 'string' || token === '') return null;
  await AsyncStorage.setItem(TOKEN_KEYS.access, token);
  return token;
}

/* ─────────── 만료 ─────────── */
let expiredHandler: (() => void) | null = null;

/** 세션이 끝났을 때 할 일 (보통: 로그인 상태 지우고 로그인 화면으로). 해제 함수를 돌려줌 */
export function setSessionExpiredHandler(fn: (() => void) | null) {
  expiredHandler = fn;
  return () => {
    if (expiredHandler === fn) expiredHandler = null;
  };
}

/** 토큰을 지우고 만료 처리를 부름 (여러 요청이 동시에 와도 처리는 1번) */
let expiring: Promise<void> | null = null;
export function expireSession(): Promise<void> {
  if (!expiring) {
    expiring = (async () => {
      await clearStoredTokens();
      expiredHandler?.();
    })().finally(() => {
      expiring = null;
    });
  }
  return expiring;
}

/* ─────────── fetch 공통 ─────────── */
/**
 * 토큰을 붙여 보내고, 401 이면 갱신해서 1번 더 보냄.
 * 갱신도 안 되면 세션 만료 처리 후 마지막 401 응답을 그대로 돌려줌 (부르는 쪽의 기존 오류 처리가 동작하게)
 * @param send 토큰(없으면 null)을 받아 요청을 보내는 함수
 */
export async function sendWithAuth(send: (token: string | null) => Promise<Response>): Promise<Response> {
  const token = await getAccessToken();
  const res = await send(token);
  if (res.status !== 401 || !token) return res;

  const fresh = await refreshAccessToken();
  if (!fresh) {
    await expireSession();
    return res;
  }
  const retried = await send(fresh);
  if (retried.status === 401) await expireSession();
  return retried;
}

/** 로그인·갱신 같은 인증 요청은 401 이 와도 갱신하지 않음 */
export const isAuthEndpoint = (pathOrUrl: string) => /\/auth\//.test(pathOrUrl);
