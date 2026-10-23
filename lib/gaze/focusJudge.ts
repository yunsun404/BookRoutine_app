/**
 * 집중 판정 (순수 로직, React와 무관 → 테스트 가능)
 *
 * 핵심 아이디어: "절대 기준"이 아니라 "이 사람의 평소 모습"과 비교한다.
 *   - 시선 모델은 노트북 화면 데이터로 학습해서 폰 화면 기준 cm 값이 정확하지 않고, 조명에도 흔들림
 *   - 그래서 시작 5초 동안 "화면을 보고 있을 때"의 머리 각도·시선 값을 재서 기준(baseline)으로 삼고
 *   - 이후에는 기준에서 얼마나 벗어났는지로 판정한다.
 *
 * 판정 순서 (위에서 걸리면 끝)
 *   1. 얼굴 없음                         → away       (자리 비움)
 *   2. 두 눈 모두 감음                   → unfocused  (졸음)
 *   3. 고개가 기준보다 많이 돌아감       → unfocused  (딴 곳 봄)
 *   4. 시선이 기준보다 많이 벗어남       → unfocused  (모델 결과가 있을 때만)
 *   5. 나머지                             → focused
 *
 * 흔들림 보정: 최근 3번(약 1.5초) 판정 중 가장 많은 것을 최종 결과로 사용
 * 자세 변화 보정: 집중 상태일 때 기준값을 아주 천천히 현재 값 쪽으로 이동 (조명·자세가 서서히 바뀌어도 OK)
 */
import type { FocusState } from '../types/ebook';

export const FOCUS_JUDGE_POLICY = {
  /** 시작 보정 시간 */
  CALIBRATION_MS: 5_000,
  /** 보정에 필요한 최소 샘플 수 (0.5초 간격이면 5초에 약 10개) */
  MIN_CALIBRATION_SAMPLES: 6,
  /** 고개 좌우(yaw) 허용 범위 (도) */
  MAX_YAW_DEV_DEG: 25,
  /** 고개 상하(pitch) 허용 범위 (도) */
  MAX_PITCH_DEV_DEG: 20,
  /** 두 눈 뜸 확률이 모두 이 값보다 낮으면 눈 감음 (책 보며 아래를 보면 값이 낮아져서 낮게 잡음) */
  EYES_CLOSED_PROB: 0.15,
  /** 시선 이탈 기준 (cm). 실제 기준 = max(이 값, 보정 때 흔들림 × 3) */
  GAZE_DEV_CM: 10,
  GAZE_SPREAD_K: 3,
  /** 흔들림 보정 창 크기 */
  SMOOTH_WINDOW: 3,
  /** 기준값 적응 속도 (0이면 고정) */
  BASELINE_ADAPT: 0.02,
} as const;

export type FocusJudgePolicy = { [K in keyof typeof FOCUS_JUDGE_POLICY]: number };

/** 판정에 필요한 값 (useGazeSampler 의 GazeSample 이 그대로 들어감) */
export interface JudgeInput {
  timestamp: number;
  faceDetected: boolean;
  yaw: number | null;
  pitch: number | null;
  leftEyeOpen: number | null;
  rightEyeOpen: number | null;
  gaze: { x: number; y: number } | null;
}

export type JudgePhase = 'calibrating' | 'tracking';

export interface JudgeResult {
  /** 최종 판정 (흔들림 보정 후) → 버킷 기록기로 */
  state: FocusState;
  /** 이번 샘플만 본 판정 */
  raw: FocusState;
  /** 왜 그렇게 판정했는지 (화면 표시·조정용) */
  reason: string;
  phase: JudgePhase;
  /** 보정 진행률 0~1 */
  calibrationProgress: number;
}

interface Baseline {
  yaw: number;
  pitch: number;
  gaze: { x: number; y: number } | null;
  gazeThresholdCm: number;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export class FocusJudge {
  private phase: JudgePhase = 'calibrating';
  private calibStart: number | null = null;
  private calibSamples: JudgeInput[] = [];
  private base: Baseline | null = null;
  private recent: FocusState[] = [];
  private lastState: FocusState | null = null;

  constructor(private readonly policy: FocusJudgePolicy = FOCUS_JUDGE_POLICY) {}

  /** 보정 다시 하기 (자세를 크게 바꿨을 때 등) */
  recalibrate() {
    this.phase = 'calibrating';
    this.calibStart = null;
    this.calibSamples = [];
    this.base = null;
    this.recent = [];
    this.lastState = null;
  }

  get baseline(): Readonly<Baseline> | null {
    return this.base;
  }

  judge(s: JudgeInput): JudgeResult {
    if (this.phase === 'calibrating') return this.calibrate(s);

    const { raw, reason } = this.rawJudge(s);
    if (raw === 'focused') this.adapt(s);
    const state = this.smooth(raw);
    return { state, raw, reason, phase: 'tracking', calibrationProgress: 1 };
  }

  /* ───────────── 보정 단계 ───────────── */

  private calibrate(s: JudgeInput): JudgeResult {
    const p = this.policy;
    if (this.calibStart === null) this.calibStart = s.timestamp;

    // 얼굴이 보이고 눈을 뜨고 있을 때만 "화면을 보는 모습"으로 수집
    const usable = s.faceDetected && s.yaw != null && s.pitch != null && !this.eyesClosed(s);
    if (usable) this.calibSamples.push(s);

    const elapsed = s.timestamp - this.calibStart;
    const progress = Math.min(
      1,
      Math.min(elapsed / p.CALIBRATION_MS, this.calibSamples.length / p.MIN_CALIBRATION_SAMPLES),
    );

    if (elapsed >= p.CALIBRATION_MS && this.calibSamples.length >= p.MIN_CALIBRATION_SAMPLES) {
      this.base = this.buildBaseline(this.calibSamples);
      this.phase = 'tracking';
      this.calibSamples = [];
    }

    // 보정 중에는 "얼굴 보이면 집중"으로 기록 (시작하자마자 손해 보지 않게)
    const state: FocusState = s.faceDetected ? 'focused' : 'away';
    return { state, raw: state, reason: '보정 중', phase: 'calibrating', calibrationProgress: progress };
  }

  private buildBaseline(samples: JudgeInput[]): Baseline {
    const p = this.policy;
    const yaw = median(samples.map((x) => x.yaw!));
    const pitch = median(samples.map((x) => x.pitch!));

    const gs = samples.filter((x) => x.gaze).map((x) => x.gaze!);
    let gaze: Baseline['gaze'] = null;
    let gazeThresholdCm: number = p.GAZE_DEV_CM;
    if (gs.length >= Math.ceil(samples.length / 2)) {
      gaze = { x: median(gs.map((g) => g.x)), y: median(gs.map((g) => g.y)) };
      // 보정 중 시선 값이 얼마나 흔들렸는지 (중앙값 기준 거리의 중앙값)
      const spread = median(gs.map((g) => Math.hypot(g.x - gaze!.x, g.y - gaze!.y)));
      gazeThresholdCm = Math.max(p.GAZE_DEV_CM, spread * p.GAZE_SPREAD_K);
    }
    return { yaw, pitch, gaze, gazeThresholdCm };
  }

  /* ───────────── 판정 단계 ───────────── */

  private eyesClosed(s: JudgeInput) {
    const t = this.policy.EYES_CLOSED_PROB;
    return s.leftEyeOpen != null && s.rightEyeOpen != null && s.leftEyeOpen < t && s.rightEyeOpen < t;
  }

  private rawJudge(s: JudgeInput): { raw: FocusState; reason: string } {
    const p = this.policy;
    const b = this.base!;
    if (!s.faceDetected) return { raw: 'away', reason: '얼굴 없음' };
    if (this.eyesClosed(s)) return { raw: 'unfocused', reason: '눈 감음' };

    if (s.yaw != null && Math.abs(s.yaw - b.yaw) > p.MAX_YAW_DEV_DEG) {
      return { raw: 'unfocused', reason: `고개 좌우 ${(s.yaw - b.yaw).toFixed(0)}°` };
    }
    if (s.pitch != null && Math.abs(s.pitch - b.pitch) > p.MAX_PITCH_DEV_DEG) {
      return { raw: 'unfocused', reason: `고개 상하 ${(s.pitch - b.pitch).toFixed(0)}°` };
    }
    if (s.gaze && b.gaze) {
      const d = Math.hypot(s.gaze.x - b.gaze.x, s.gaze.y - b.gaze.y);
      if (d > b.gazeThresholdCm) return { raw: 'unfocused', reason: `시선 이탈 ${d.toFixed(0)}cm` };
    }
    return { raw: 'focused', reason: s.gaze && b.gaze ? '집중 (시선+고개)' : '집중 (고개 기준)' };
  }

  /** 집중 중일 때 기준값을 아주 조금씩 현재 쪽으로 (서서히 바뀌는 자세·조명 따라가기) */
  private adapt(s: JudgeInput) {
    const a = this.policy.BASELINE_ADAPT;
    const b = this.base!;
    if (a <= 0) return;
    if (s.yaw != null) b.yaw += a * (s.yaw - b.yaw);
    if (s.pitch != null) b.pitch += a * (s.pitch - b.pitch);
    if (s.gaze && b.gaze) {
      b.gaze = { x: b.gaze.x + a * (s.gaze.x - b.gaze.x), y: b.gaze.y + a * (s.gaze.y - b.gaze.y) };
    }
  }

  /** 최근 N개 중 가장 많은 상태. 동점이면 직전 최종 상태 유지 (한 번 튄 값으로 바뀌지 않게) */
  private smooth(raw: FocusState): FocusState {
    this.recent.push(raw);
    if (this.recent.length > this.policy.SMOOTH_WINDOW) this.recent.shift();
    const count: Record<FocusState, number> = { focused: 0, unfocused: 0, away: 0 };
    this.recent.forEach((r) => (count[r] += 1));
    const max = Math.max(...Object.values(count));
    const top = (Object.keys(count) as FocusState[]).filter((k) => count[k] === max);
    const next = top.length === 1 ? top[0] : this.lastState && top.includes(this.lastState) ? this.lastState : raw;
    this.lastState = next;
    return next;
  }
}
