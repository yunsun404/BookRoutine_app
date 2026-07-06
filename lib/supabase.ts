import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vdzyacisqouvpsxuqltt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenlhY2lzcW91dnBzeHVxbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI5MDEsImV4cCI6MjA5Mzg4ODkwMX0.Nf-9mSWWUGNfCxbJrcnEYxUyJuNfn_k0B5-7s9O4rCo";

// Node.js 환경에서만 ws 주입, 브라우저/앱에서는 기본 WebSocket 사용
const getRealtimeOptions = () => {
  if (typeof WebSocket === 'undefined') {
    const ws = require('ws');
    return { realtime: { transport: ws } };
  }
  return {};
};
 
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  getRealtimeOptions()
 )
