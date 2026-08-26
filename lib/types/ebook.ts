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

export interface FocusFrameSample {
  timestamp: number;
  faceDetected: boolean;
  isFocused: boolean;
  yaw?: number;
  pitch?: number;
}

export interface FocusSampleInput {
  bucketStart: string;
  bucketEnd: string;
  focusedRatio: number;
  faceDetected?: boolean;
  interruption?: boolean;
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