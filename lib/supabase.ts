import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // 앱에서 Supabase가 URL 기능을 정상적으로 쓰도록 (이미 설치돼 있음)
// import ws from "ws"; : Node.js 전용 라이브러리로, 휴대폰 앱에는 웹소켓 기능이 이미 들어 있어 앱에서는 오류가 남. (Node.js 서버에서 실행할 때를 위한 설정)

const supabaseUrl = "https://vdzyacisqouvpsxuqltt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenlhY2lzcW91dnBzeHVxbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI5MDEsImV4cCI6MjA5Mzg4ODkwMX0.Nf-9mSWWUGNfCxbJrcnEYxUyJuNfn_k0B5-7s9O4rCo";

// 웹 브라우저 환경과 모바일/Node 환경 모두에서 에러 없이 동작하도록 조건부 설정을 적용한다.
const isBrowser = typeof window !== "undefined";

// 앱(React Native)과 웹 브라우저 모두 웹소켓을 기본으로 갖고 있어서 별도 설정이 필요 없다.
// (예전의 `ws` 라이브러리는 Node.js 서버용이라 앱에서 불러오면 빌드가 실패함)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  // realtime: {
  //   transport: isBrowser ? undefined : (ws as any),
  // },
});

// Supabase 연결 상태 점검 및 에러 로그 출력 함수
(async () => {
  try {
    // 간단한 핑(Ping) 역할을 하는 쿼리 테스트
    const { error } = await supabase.from("_dummy_check_").select("*").limit(0);

    // Table not found(PGRST204/PGRST205)나 42P01은 서버가 정상 작동 중이라는 의미입니다.
    if (error && !["PGRST204", "PGRST205", "42P01"].includes(error.code)) {
      console.error("⚠️ [Supabase 연결 에러 발생]:", error.message);
      console.error("👉 에러 코드:", error.code);
      console.error("💡 팁: Supabase 대시보드에서 프로젝트가 Paused 상태인지 확인하세요.");
    } else {
      console.log("✅ [Supabase] 서버 연결 정상");
    }
  } catch (err: any) {
    console.error("🚨 [Supabase 치명적 네트워크 에러]:", err?.message || err);
  }
})();