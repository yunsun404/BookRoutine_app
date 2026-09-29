import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = "https://vdzyacisqouvpsxuqltt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenlhY2lzcW91dnBzeHVxbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI5MDEsImV4cCI6MjA5Mzg4ODkwMX0.Nf-9mSWWUGNfCxbJrcnEYxUyJuNfn_k0B5-7s9O4rCo";

// 웹 브라우저 환경과 모바일/Node 환경 모두에서 에러 없이 동작하도록 조건부 설정을 적용한다.
const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: isBrowser ? undefined : (ws as any),
  },
});

// Supabase 연결 상태 점검 및 에러 로그 출력 함수 
(async () => {
  try {
    // 간단한 핑(Ping) 역할을 하는 쿼리 테스트
    const { error } = await supabase.from("_dummy_check_").select("*").limit(0);

    // Table not found(PGRST204/PGRST205)나 42P01은 서버가 정상 작동 중이라는 의미입니다.
    if (error && !['PGRST204', 'PGRST205', '42P01'].includes(error.code)) {
      console.error("⚠️ [Supabase 연결 에러 발생]:", error.message);
      console.error("👉 에러 코드:", error.code);
      console.error("💡 팁: Supabase 대시보드에서 프로젝트가 Paused 상태인지 확인하세요.");
    } else {
      console.log("✅ [Supabase] 서버 연결 정상");
    }
  } catch (err: any) {
    console.error("🚨 [Supabase 치명적 네트워크 에러]:", err?.message || err);
  }
  }) ();