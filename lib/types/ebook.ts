export interface EbookListItem {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  book_category: string | null;
  book_intro: string | null;
  total_pages: number | null;
}

export interface EbookListResponse {
  items: EbookListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReadingSession {
  session_id: string;
  user_id: string;
  book_id: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  ended_at: string | null;
  avg_focus_score?: number;
  total_focused_sec?: number;
  total_unfocused_sec?: number;
  interruption_count?: number;
  golden_time_start?: string | null;
  golden_time_end?: string | null;
  reward_points?: number;
  reward_exp?: number;
}

/** 프레임 1개의 집중 판정 결과 */
export type FocusState = 'focused' | 'unfocused' | 'away';

/** 카메라 → 집중 판정 → 버킷 기록기로 들어가는 값 (0.5초마다 1개) */
export interface FocusFrameSample {
  timestamp: number; // Date.now()
  state: FocusState;
  /** unfocused 세부 이유 (앱 안에서만 사용, 서버로 보내지 않음). 'staring' = 멍때림, 'skimming' = 훑어보기 */
  detail?: 'staring' | 'skimming' | 'offscreen' | 'head' | 'eyes-closed';
  yaw?: number; // 머리 좌우 각도 (버킷 평균용, 선택)
  pitch?: number; // 머리 상하 각도 (버킷 평균용, 선택)
}

/** 백엔드로 보내는 30초 버킷 (백엔드 FocusSampleInputDto와 1:1) */
export interface FocusSampleInput {
  bucketStart: string; // ISO
  bucketEnd: string; // ISO
  focusedSec: number; // 화면을 보며 집중한 초
  unfocusedSec: number; // 얼굴은 보이지만 집중 안 한 초
  awaySec: number; // 얼굴이 안 보인 초 (자리 비움)
  interruptionCount: number; // 자리를 비운 횟수
  avgYaw?: number;
  avgPitch?: number;
}

export interface SessionReward {
  sessionId: string;
  rewardPoints: number;
  rewardExp: number;
  avgFocusScore: number;
}

export interface GonguFullText {
  title: string;
  author: string | null;
  content: string;
  sourceUrl: string;
}
