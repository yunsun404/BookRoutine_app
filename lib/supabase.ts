import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://vdzyacisqouvpsxuqltt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenlhY2lzcW91dnBzeHVxbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI5MDEsImV4cCI6MjA5Mzg4ODkwMX0.Nf-9mSWWUGNfCxbJrcnEYxUyJuNfn_k0B5-7s9O4rCo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // RN에는 localStorage가 없어서 명시 필요
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // RN은 URL 기반 세션 복구를 쓰지 않음
  },
  // realtime.transport 지정 삭제: RN/브라우저 내장 WebSocket을 자동 사용
});

// 개발 중에만 실행되는 연결 점검
if (__DEV__) {
  (async () => {
    try {
      const { error } = await supabase
        .from("_dummy_check_")
        .select("*")
        .limit(0);

      // 테이블 없음 계열 에러는 서버가 살아있다는 뜻
      if (error && !["PGRST204", "PGRST205", "42P01"].includes(error.code)) {
        console.error("⚠️ [Supabase 연결 에러]:", error.message, error.code);
        console.error("💡 대시보드에서 프로젝트가 Paused인지 확인하세요.");
      } else {
        console.log("✅ [Supabase] 서버 연결 정상");
      }
    } catch (err: any) {
      console.error("🚨 [Supabase 네트워크 에러]:", err?.message || err);
    }
  })();
}
