import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = "https://vdzyacisqouvpsxuqltt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenlhY2lzcW91dnBzeHVxbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI5MDEsImV4cCI6MjA5Mzg4ODkwMX0.Nf-9mSWWUGNfCxbJrcnEYxUyJuNfn_k0B5-7s9O4rCo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport: ws as any, // 여기 realtime 옵션 안에 넣어야 함
  },
});
