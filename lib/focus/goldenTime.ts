/**
 * 골든타임 계산 (앱용) — 서버 utils/focus-reward.util.ts 의 findGoldenTime 과 "같은 규칙"
 *   서버와 다르게 나오면 결과 화면과 어긋나므로, 규칙·숫자를 바꿀 때는 반드시 서버와 함께 바꿀 것
 *
 * 규칙 (서버와 동일)
 *  - 집중 버킷 = 버킷 길이 중 집중 시간이 70% 이상
 *  - 집중 안 된 버킷 1개까지는 봐주고 이어감 (구간 끝에는 포함 안 함)
 *  - 버킷 사이가 5초 넘게 비면 끊김
 *  - 최소 길이 = max(5분, 지금까지 버킷 합계의 20%)
 *
 * 앱에서 추가로 알려 주는 것: "지금 이어지고 있는 집중 구간" (실시간 표시용)
 */
import type { FocusSampleInput } from '../types/ebook';

export const GOLDEN_TIME_POLICY = {
  MIN_BUCKET_FOCUS_RATE: 0.7,
  MAX_MISS_BUCKETS: 1,
  MIN_DURATION_SEC: 300,
  MIN_SESSION_RATIO: 0.2,
  GAP_TOLERANCE_MS: 5_000,
} as const;

export interface GoldenStatus {
  /** 지금까지 조건을 만족한 가장 긴 골든타임 (없으면 null) */
  best: { start: number; end: number } | null;
  /** 지금 이어지고 있는 집중 구간 (마지막 버킷이 이 구간에 포함될 때만) */
  current: { start: number; end: number; ms: number } | null;
  /** 골든타임으로 인정되려면 필요한 최소 길이 (ms) */
  minMs: number;
}

const t = (iso: string) => new Date(iso).getTime();

export function goldenStatus(buckets: FocusSampleInput[]): GoldenStatus {
  const P = GOLDEN_TIME_POLICY;
  const sorted = [...buckets].sort((a, b) => t(a.bucketStart) - t(b.bucketStart));
  const totalSec = sorted.reduce((acc, b) => acc + (t(b.bucketEnd) - t(b.bucketStart)) / 1000, 0);
  const minMs = Math.max(P.MIN_DURATION_SEC, totalSec * P.MIN_SESSION_RATIO) * 1000;

  type Streak = { start: number; goodEnd: number; lastEnd: number; misses: number };
  let cur: Streak | null = null;
  let best: { start: number; end: number; ms: number } | null = null;

  for (const b of sorted) {
    const s = t(b.bucketStart);
    const e = t(b.bucketEnd);
    const sec = (e - s) / 1000;
    const isGood = sec > 0 && b.focusedSec / sec >= P.MIN_BUCKET_FOCUS_RATE;
    const isContinuous = cur !== null && s - cur.lastEnd <= P.GAP_TOLERANCE_MS;

    if (!cur || !isContinuous) {
      cur = isGood ? { start: s, goodEnd: e, lastEnd: e, misses: 0 } : null;
    } else if (isGood) {
      cur.goodEnd = e;
      cur.lastEnd = e;
      cur.misses = 0;
    } else {
      cur.misses += 1;
      if (cur.misses > P.MAX_MISS_BUCKETS) cur = null;
      else cur.lastEnd = e;
    }

    if (cur) {
      const ms = cur.goodEnd - cur.start;
      if (!best || ms > best.ms) best = { start: cur.start, end: cur.goodEnd, ms };
    }
  }

  const last = sorted[sorted.length - 1];
  const current = cur && last && cur.lastEnd === t(last.bucketEnd)
    ? { start: cur.start, end: cur.goodEnd, ms: cur.goodEnd - cur.start }
    : null;

  return {
    best: best && best.ms >= minMs ? { start: best.start, end: best.end } : null,
    current,
    minMs,
  };
}
