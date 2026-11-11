import {
  CALIBRATION_TIMING,
  dotStepStatus,
  expectedDotMs,
  FIXATION_TIMING,
  isStableSample,
  retryTimingAfter,
  safeAreaGaps,
  summarizeRuns,
  withRejectedSamples,
} from './calibrationTiming';
import { CALIBRATION_POLICY, settled } from './gazeCalibration';
import { GAZE_CONFIG } from './gazeConfig';

const s = (x: number, y: number, yaw: number | null = 0, pitch: number | null = 0) => ({ gaze: { x, y }, yaw, pitch });
const { fast, legacy } = CALIBRATION_TIMING;

describe('isStableSample (시선이 안정적일 때만 모으기)', () => {
  it('앞 샘플과 가까우면 모음', () => {
    expect(isStableSample(s(0, 0), s(1, 1), fast)).toBe(true);
  });

  it('시선이 크게 움직이는 중이면 안 모음', () => {
    expect(isStableSample(s(0, 0), s(2, 1), fast)).toBe(false);
  });

  it('고개가 움직이면 안 모음, 각도 값이 없으면 고개 확인은 건너뜀', () => {
    expect(isStableSample(s(0, 0, 0, 0), s(0.5, 0, 4, 0), fast)).toBe(false);
    expect(isStableSample(s(0, 0, 0, 0), s(0.5, 0, 0, -3.5), fast)).toBe(false);
    expect(isStableSample(s(0, 0, null, null), s(0.5, 0, 10, 10), fast)).toBe(true);
  });

  it('비교할 앞 샘플이 없으면 안 모음', () => {
    expect(isStableSample(null, s(0, 0), fast)).toBe(false);
  });

  it('예전 방식·가운데 응시는 필터를 쓰지 않음 (흔들림 측정이 작게 재지지 않게)', () => {
    expect(isStableSample(null, s(9, 9), legacy)).toBe(true);
    expect(isStableSample(s(0, 0), s(9, 9), FIXATION_TIMING)).toBe(true);
  });
});

describe('점 하나 예상 시간', () => {
  const settle = CALIBRATION_POLICY.SETTLE_MS;
  const interval = GAZE_CONFIG.CALIBRATION_INTERVAL_MS;

  it('새 방식은 약 1.5초', () => {
    expect(expectedDotMs(fast, settle, interval)).toBe(1_450);
  });

  it('예전 방식은 약 2.5초', () => {
    expect(expectedDotMs(legacy, settle, interval)).toBe(2_450);
  });

  it('새 방식도 버리는 시간(0.7초)이 이동 시간보다 길어서 도착 후 기다림이 있음', () => {
    expect(settle - fast.moveMs).toBeGreaterThanOrEqual(300);
  });

  it('필요한 샘플 수는 계산 쪽 최소보다 많음', () => {
    expect(fast.targetSamples).toBeGreaterThan(CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT);
  });
});

describe('summarizeRuns (예전·새 방식 비교)', () => {
  it('방식별 오차·시간 중앙값, 측정 실패는 따로 셈', () => {
    const r = summarizeRuns([
      { timing: 'fast', errorCm: 2, durationMs: 9000 },
      { timing: 'fast', errorCm: 3, durationMs: 8000 },
      { timing: 'fast', errorCm: Infinity, durationMs: 10000 },
      { timing: 'legacy', errorCm: 2.5, durationMs: 15000 },
    ]);
    expect(r.fast).toEqual({ count: 3, medianErrorCm: 2.5, failed: 1, medianDurationMs: 9000 });
    expect(r.legacy).toEqual({ count: 1, medianErrorCm: 2.5, failed: 0, medianDurationMs: 15000 });
  });

  it('기록이 없으면 null', () => {
    expect(summarizeRuns([]).legacy).toEqual({ count: 0, medianErrorCm: null, failed: 0, medianDurationMs: null });
  });
});

describe('dotStepStatus (값이 모자라는 기기 대비 안전장치)', () => {
  const min = CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT; // 2

  it('3개 모이면 바로 끝', () => {
    expect(dotStepStatus(1_200, 3, fast, min)).toBe('done');
  });

  it('2.5초 전이면 기다림', () => {
    expect(dotStepStatus(2_000, 1, fast, min)).toBe('wait');
  });

  it('2.5초가 지났고 2개는 모였으면 끝 (예전 동작 그대로)', () => {
    expect(dotStepStatus(2_500, 2, fast, min)).toBe('done');
  });

  it('2.5초가 지났는데 2개도 없으면 5초까지 더 기다림', () => {
    expect(dotStepStatus(2_500, 1, fast, min)).toBe('wait');
    expect(dotStepStatus(4_900, 0, fast, min)).toBe('wait');
  });

  it('5초까지 기다려도 모자라면 걸러 낸 샘플로 채움', () => {
    expect(dotStepStatus(5_000, 1, fast, min)).toBe('fill');
  });

  it('예전 방식은 최소 1.5초를 지키고, 5초에서 끝', () => {
    expect(dotStepStatus(1_000, 4, legacy, min)).toBe('wait');
    expect(dotStepStatus(1_500, 4, legacy, min)).toBe('done');
    expect(dotStepStatus(5_000, 1, legacy, min)).toBe('fill');
  });
});

describe('withRejectedSamples (걸러 낸 샘플 채워 넣기)', () => {
  const settle = CALIBRATION_POLICY.SETTLE_MS;
  const min = CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT;
  const o = (t: number, x = 0) => ({ t, gaze: { x, y: 0 }, yaw: 0, pitch: 0 });

  it('충분하면 그대로', () => {
    const p = { target: { x: 0, y: 0 }, shownAt: 0, obs: [o(settle), o(settle + 250)] };
    expect(withRejectedSamples(p, [o(settle + 100, 9)], min)).toBe(p);
  });

  it('모자라면 걸러 낸 것을 시간순으로 합쳐 계산에 쓸 수 있게 됨', () => {
    const p = { target: { x: 0, y: 0 }, shownAt: 0, obs: [o(settle + 500)] };
    const r = withRejectedSamples(p, [o(settle + 100, 9), o(100, 9)], min);
    expect(r.obs.map((x) => x.t)).toEqual([100, settle + 100, settle + 500]);
    expect(settled(r).length).toBeGreaterThanOrEqual(min);
  });
});

describe('retryTimingAfter (실패하면 천천히 다시)', () => {
  it('빠른 방식이 실패하면 예전 방식으로', () => {
    expect(retryTimingAfter('fast', { errorCm: Infinity })).toBe('legacy');
  });

  it('성공했거나 이미 예전 방식이면 그대로', () => {
    expect(retryTimingAfter('fast', { errorCm: 2.1 })).toBe('fast');
    expect(retryTimingAfter('legacy', { errorCm: Infinity })).toBe('legacy');
  });
});

describe('safeAreaGaps (점이 카메라 자리에 겹치지 않게)', () => {
  it('오버레이가 화면 맨 위부터면 위쪽 여백만큼', () => {
    expect(safeAreaGaps({ windowY: 0, height: 800 }, 800, { top: 32, bottom: 24 })).toEqual({ top: 32, bottom: 24 });
  });

  it('이미 SafeArea 안에 있으면 여백 없음', () => {
    expect(safeAreaGaps({ windowY: 32, height: 744 }, 800, { top: 32, bottom: 24 })).toEqual({ top: 0, bottom: 0 });
  });
});
