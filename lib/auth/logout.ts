import { getRefreshToken } from "@/constants/api";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";

/**
 * 로그아웃 (Header 메뉴 · 로그아웃 화면 · 설정 화면이 같이 씀)
 * 1. 서버에 저장된 refresh 토큰 지우기 (실패해도 이 기기에서는 로그아웃)
 * 2. 로그인 상태·토큰 지우기
 * 3. 로그인 화면으로 이동
 */
export async function performLogout(): Promise<void> {
  try {
    await authApi.logout(await getRefreshToken());
  } catch (error) {
    console.error("로그아웃 오류:", error);
  } finally {
    await useAuthStore.getState().clearAuth();
    router.replace("/");
  }
}
