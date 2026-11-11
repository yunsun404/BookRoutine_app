/**
 * 보정 화면(GazeCalibrationOverlay)의 점 단계 시간 설정 + "시선이 안정적인가" 판단 (순수 로직)
 *
 * 계산 로직(gazeCalibration.ts)은 그대로 — 여기 값은 "언제·어떤 샘플을 모으는가"만 정함
 *   계산 쪽 settled(): 점의 shownAt 부터 SETTLE_MS(0.7초) 동안의 샘플은 버림
 *
 * FAST (기본, 점 하나 목표 약 1.5초)
 *   점이 움직이기 시작한 시각 = shownAt → 이동 0.3초 + 도착 후 0.4초 = 버리는 0.7초
 *   그 뒤 "안정적인" 샘플만 모으고, 3개가 차면 바로 다음 점. 2.5초 안에 못 모으면 모은 만큼으로 넘어감
 *   (2개 미만이면 계산 쪽에서 그 점을 뺌)
 *   0.7초 + 3개 × 0.25초(보정 중 샘플 간격) ≈ 1.5초
 * LEGACY (예전 값, 개발 화면에서 비교용)
 *   이동 0.45초 → 도착 후 0.3초 대기 → 그때부터 shownAt → 최소 1.5초, 4개, 최대 5초 → 점 하나 약 2.5초
 *
 * 가운데 응시(흔들림 측정)는 두 방식 모두 예전 그대로 (FIXATION_TIMING).
 * 흔들리는 샘플을 걸러 내면 흔들림이 작게 재져서 멍때림 기준이 틀어지므로 안정 필터를 쓰지 않음.
 */
import type { Pt } from './gazeCalibration';

export type CalibrationTimingName = 'fast' | 'legacy';

export interface CalibrationTiming {
  name: CalibrationTimingName;
  /** 점이 다음 자리로 움직이는 시간 */
  moveMs: number;
  /** 도착 후 값을 모으기 전에 더 기다리는 시간 */
  arriveHoldMs: number;
  /** shownAt 을 언제로 잡을지: 'move' = 점이 움직이기 시작한 때 / 'hold' = 도착 후 대기가 끝난 때 */
  shownAtFrom: 'move' | 'hold';
  /** shownAt 부터 최소 이만큼은 보여 줌 (0 = 다 모이면 바로) */
  minMs: number;
  /** shownAt 부터 이 시간이 지나면 모자라도 넘어감 */
  maxMs: number;
  /** 이만큼 모이면 다음 점 (계산 쪽 settled() 기준 개수) */
  targetSamples: number;
  /** "다 모였나" 확인 간격 */
  pollMs: number;
  /** 바로 앞 샘플과 시선(모델 출력, cm) 차이가 이보다 작아야 모음. null = 안정 필터 끔 */
  stableGazeCm: number | null;
  /** 바로 앞 샘플과 고개 각도(yaw·pitch) 차이가 이보다 작아야 모음. null = 확인 안 함 */
  stableHeadDeg: number | null;
}

export const CALIBRATION_TIMING: Record<CalibrationTimingName, CalibrationTiming> = {
  fast: {
    name: 'fast',
    moveMs: 300,
    arriveHoldMs: 0,
    shownAtFrom: 'move',
    minMs: 0,
    maxMs: 2_500,
    targetSamples: 3,
    pollMs: 100,
    stableGazeCm: 2.0,
    stableHeadDeg: 3,
  },
  legacy: {
    name: 'legacy',
    moveMs: 450,
    arriveHoldMs: 300,
    shownAtFrom: 'hold',
    minMs: 1_500,
    maxMs: 5_000,
    targetSamples: 4,
    pollMs: 200,
    stableGazeCm: null,
    stableHeadDeg: null,
  },
};

export const DEFAULT_CALIBRATION_TIMING: CalibrationTimingName = 'fast';

/** 가운데 응시 단계 (두 방식 공통, 예전 값 그대로) */
export const FIXATION_TIMING: CalibrationTiming = {
  name: 'legacy',
  moveMs: 450,
  arriveHoldMs: 300,
  shownAtFrom: 'hold',
  minMs: 3_000,
  maxMs: 6_000,
  targetSamples: 5,
  pollMs: 200,
  stableGazeCm: null,
  stableHeadDeg: null,
};

/** 안정 판단에 쓰는 샘플 정보 */
export interface StableSample {
  gaze: Pt;
  yaw: number | null;
  pitch: number | null;
}

/**
 * 이 샘플을 모아도 되는가
 *  - 필터가 꺼져 있으면 항상 true
 *  - 비교할 앞 샘플이 없으면 false (안정한지 알 수 없음)
 *  - 시선 차이 ≤ stableGazeCm, 고개 각도 차이 ≤ stableHeadDeg (각도 값이 없으면 고개 확인은 건너뜀)
 */
export function isStableSample(
  prev: StableSample | null,
  cur: StableSample,
  timing: Pick<CalibrationTiming, 'stableGazeCm' | 'stableHeadDeg'>,
): boolean {
  if (timing.stableGazeCm === null) return true;
  if (!prev) return false;
  if (Math.hypot(cur.gaze.x - prev.gaze.x, cur.gaze.y - prev.gaze.y) > timing.stableGazeCm) return false;
  if (timing.stableHeadDeg !== null) {
    const lim = timing.stableHeadDeg;
    if (prev.yaw !== null && cur.yaw !== null && Math.abs(cur.yaw - prev.yaw) > lim) return false;
    if (prev.pitch !== null && cur.pitch !== null && Math.abs(cur.pitch - prev.pitch) > lim) return false;
  }
  return true;
}

/** 점 하나 예상 시간 (ms): 샘플이 interval 마다 들어오고 전부 안정적이라고 할 때. 확인·설명용 */
export function expectedDotMs(t: CalibrationTiming, settleMs: number, intervalMs: number): number {
  const afterShown = Math.max(t.minMs, settleMs + t.targetSamples * intervalMs);
  const beforeShown = t.shownAtFrom === 'move' ? 0 : t.moveMs + t.arriveHoldMs;
  return beforeShown + Math.min(afterShown, t.maxMs);
}

/** 개발 화면 비교용: 보정 1회 기록 */
export interface CalibrationRun {
  timing: CalibrationTimingName;
  errorCm: number; // 측정 못 하면 Infinity
  durationMs: number;
}

const medianOf = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * 방식별 요약: 횟수, 오차 중앙값(측정된 것만), 측정 실패 횟수, 걸린 시간 중앙값
 * 판단 기준(제안): 새 방식 오차 중앙값이 예전보다 0.5cm 넘게 나쁘지 않으면 OK
 */
export function summarizeRuns(runs: CalibrationRun[]) {
  const out = {} as Record<
    CalibrationTimingName,
    { count: number; medianErrorCm: number | null; failed: number; medianDurationMs: number | null }
  >;
  for (const name of ['fast', 'legacy'] as const) {
    const mine = runs.filter((r) => r.timing === name);
    const errs = mine.map((r) => r.errorCm).filter((e) => Number.isFinite(e));
    out[name] = {
      count: mine.length,
      medianErrorCm: errs.length ? medianOf(errs) : null,
      failed: mine.length - errs.length,
      medianDurationMs: mine.length ? medianOf(mine.map((r) => r.durationMs)) : null,
    };
  }
  return out;
}

/**
 * 보정 영역을 SafeArea 안쪽으로: 오버레이가 화면에서 놓인 위치를 보고 모자란 만큼만 여백
 *  windowY/height = 오버레이의 화면 위치·높이, windowHeight = 화면 높이
 */
export function safeAreaGaps(
  layout: { windowY: number; height: number },
  windowHeight: number,
  insets: { top: number; bottom: number },
): { top: number; bottom: number } {
  const top = Math.max(0, insets.top - layout.windowY);
  const bottom = Math.max(0, layout.windowY + layout.height - (windowHeight - insets.bottom));
  return { top, bottom };
}
