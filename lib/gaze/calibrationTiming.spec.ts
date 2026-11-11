import {
  CALIBRATION_TIMING,
  expectedDotMs,
  FIXATION_TIMING,
  isStableSample,
  safeAreaGaps,
  summarizeRuns,
} from './calibrationTiming';
import { CALIBRATION_POLICY } from './gazeCalibration';
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

describe('safeAreaGaps (점이 카메라 자리에 겹치지 않게)', () => {
  it('오버레이가 화면 맨 위부터면 위쪽 여백만큼', () => {
    expect(safeAreaGaps({ windowY: 0, height: 800 }, 800, { top: 32, bottom: 24 })).toEqual({ top: 32, bottom: 24 });
  });

  it('이미 SafeArea 안에 있으면 여백 없음', () => {
    expect(safeAreaGaps({ windowY: 32, height: 744 }, 800, { top: 32, bottom: 24 })).toEqual({ top: 0, bottom: 0 });
  });
});
