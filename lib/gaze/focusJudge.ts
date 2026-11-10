/**
 * 집중 판정 v2 (순수 로직, React와 무관 → 테스트 가능)
 *
 * 핵심 아이디어: "절대 기준"이 아니라 "이 사람의 평소 모습"과 비교한다.
 *
 * 기준을 정하는 두 가지 방법
 *   (가) 개인 보정을 했으면 (setCalibration)  → 점 5개로 만든 변환식으로 시선을 "화면 좌표"로 바꿔서 판정
 *   (나) 보정을 건너뛰었으면                → 처음 5초 동안 자동으로 고개·시선 기준을 잡음 (v1 방식)
 *
 * 판정 순서 (기획서: ① 영역 → ② 움직임 패턴 → 최종 판정)
 *   1. 얼굴 없음                                   → away       (자리 비움)
 *   2. 두 눈 모두 감음                             → unfocused  (졸음)
 *   3. 고개가 기준보다 많이 돌아감                 → unfocused  (딴 곳 봄)
 *   4. 최근 30초 스크롤 속도가 "읽을 수 있는 속도"보다 훨씬 빠름 → unfocused  (훑어보기, detail='skimming')
 *   5. ① 시선이 화면 밖 (보정 시) / 기준에서 크게 벗어남 (자동 기준 시) → unfocused
 *   6. ② 최근 10초 시선 움직임이 "가만히 볼 때 흔들림" 수준 + 그동안 스크롤 없음
 *                                                  → unfocused  (멍때림, detail='staring')
 *   7. 나머지                                       → focused
 *
 * 페이지 모드 (setReaderMode('page'), 좌우로 넘기는 전자책 화면) 에서는 4·6번만 바뀜
 *   4. 최근 3페이지의 읽기 속도(글자/초)가 기준보다 빠름 → 훑어보기
 *        속도 = 3페이지 글자 합 ÷ (3페이지에 머문 시간 + 지금 페이지에 머문 시간)
 *        → 빠르게 넘긴 뒤 한 페이지를 천천히 읽으면 저절로 풀림
 *   6. "최근 스크롤 없음" 대신 "최근 페이지 넘김 없음" (창 15초, PAGE_STARE_ENABLED 로 끌 수 있음)
 *
 * 한계: 시선이 화면 안에 있고 적당한 속도로 스크롤하면 "읽는 중"으로 봄 (내용 이해 여부는 측정하지 않음)
 * 멍때림·훑어보기는 백엔드로 보낼 때 unfocused 에 포함 (detail 은 앱 안에서만 사용 → 나중에 따로 보내도록 확장 가능)
 */
import type { FocusState } from '../types/ebook';
import type { GazeCalibration } from './gazeCalibration';

export const FOCUS_JUDGE_POLICY = {
  /** (나) 자동 기준: 시간 / 최소 샘플 수 */
  CALIBRATION_MS: 5_000,
  MIN_CALIBRATION_SAMPLES: 6,
  /** 고개 허용 범위 (도) */
  MAX_YAW_DEV_DEG: 25,
  MAX_PITCH_DEV_DEG: 20,
  /** 두 눈 뜸 확률이 모두 이 값보다 낮으면 눈 감음 */
  EYES_CLOSED_PROB: 0.15,
  /** (나) 자동 기준일 때 시선 이탈 기준 (cm) = max(이 값, 흔들림 × K) */
  GAZE_DEV_CM: 10,
  GAZE_SPREAD_K: 3,
  /** (가) 보정 시: 화면 밖 여유 = max(보정 오차 × K, 화면 폭 × 비율) */
  OFFSCREEN_ERROR_K: 1.5,
  OFFSCREEN_MIN_MARGIN_RATIO: 0.15,
  /** (가) 보정 시 멍때림: 이 시간 동안 */
  STARE_WINDOW_MS: 10_000,
  /** 창 안에 최소 이 개수 이상의 시선 값이 있어야 판단 */
  STARE_MIN_SAMPLES: 8,
  /** 움직임이 "가만히 볼 때 흔들림 × K" 이하면 멍때림 */
  STARE_NOISE_K: 1.5,
  /** 흔들림이 너무 작게 잡혀도 최소 이만큼은 허용 (dp) */
  STARE_MIN_SPREAD_DP: 20,
  /** 훑어보기: 최근 이 시간 동안 스크롤한 거리로 속도 계산 */
  SKIM_WINDOW_MS: 30_000,
  /**
   * 이 속도(dp/초)보다 빠르면 훑어보기.
   * 보통 읽기: 한 화면(약 600dp, 20줄) ≈ 30~40초 → 15~20dp/초 / 빠르게 읽기: 20초 → 30dp/초
   * 45dp/초 ≈ 1초에 1.5줄 — 빠른 독자보다도 빠른 속도
   */
  SKIM_MAX_DP_PER_SEC: 45,
  /** 흔들림 보정 창 크기 */
  SMOOTH_WINDOW: 3,
  /** 기준값 적응 속도 (0이면 고정) */
  BASELINE_ADAPT: 0.02,

  /* ── 페이지 모드 전용 (스크롤 모드는 위 값 그대로) ── */
  /** 훑어보기: 최근 이 페이지 수로 읽기 속도 계산 */
  PAGE_SKIM_PAGES: 3,
  /**
   * 이 속도(글자/초, 공백 제외)보다 빠르면 훑어보기.
   * 한국어 묵독: 보통 초당 8~12자, 빠른 독자 15~17자 → 25자/초는 빠른 독자보다도 빠름
   */
  PAGE_SKIM_MAX_CHARS_PER_SEC: 25,
  /** 최근 페이지 글자 합이 이보다 적으면 판단하지 않음 (짧은 페이지 몇 장으로 오판 방지) */
  PAGE_SKIM_MIN_CHARS: 300,
  /** 멍때림: 이 시간 동안 시선 정지 + 페이지 넘김 없음 */
  PAGE_STARE_WINDOW_MS: 15_000,
  /** false 면 페이지 모드에서 멍때림 판정을 하지 않음 */
  PAGE_STARE_ENABLED: true,
} as const;

export type FocusJudgePolicy = {
  [K in keyof typeof FOCUS_JUDGE_POLICY]: (typeof FOCUS_JUDGE_POLICY)[K] extends boolean ? boolean : number;
};

/** 읽기 화면 방식: 'scroll' = 세로 스크롤, 'page' = 좌우로 넘기는 페이지 */
export type ReaderMode = 'scroll' | 'page';

/** 페이지 모드 읽기 속도 (개발 화면 표시용) */
export interface PageStats {
  /** 지금 페이지: 글자 수 ÷ 지금까지 머문 시간 (null = 아직 모름) */
  currentCps: number | null;
  /** 최근 넘긴 페이지들의 평균 (null = 넘긴 페이지 없음) */
  recentAvgCps: number | null;
  /** 판정에 쓰는 값: 최근 페이지 글자 합 ÷ (그 시간 + 지금 페이지 머문 시간) */
  judgeCps: number | null;
  /** 속도 계산에 들어간 페이지 수 (최대 PAGE_SKIM_PAGES) */
  pages: number;
  /** 그 페이지들의 글자 합 */
  recentChars: number;
  /** 지금 페이지 번호 (0부터, null = 모름) */
  pageIndex: number | null;
}

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
/** unfocused 의 세부 이유 (앱 화면 표시용) */
export type FocusDetail = 'staring' | 'skimming' | 'offscreen' | 'head' | 'eyes-closed';

export interface JudgeResult {
  /** 최종 판정 (흔들림 보정 후) → 버킷 기록기로 */
  state: FocusState;
  /** 이번 샘플만 본 판정 */
  raw: FocusState;
  /** 최종 판정이 unfocused 일 때 세부 이유 */
  detail?: FocusDetail;
  /** 왜 그렇게 판정했는지 (화면 표시·조정용) */
  reason: string;
  phase: JudgePhase;
  /** 자동 기준 진행률 0~1 */
  calibrationProgress: number;
  /** 보정했으면 변환된 시선 위치 (dp) */
  screenGaze?: { x: number; y: number };
}

interface AutoBaseline {
  yaw: number;
  pitch: number;
  gaze: { x: number; y: number } | null;
  gazeThresholdCm: number;
}

type Raw = { raw: FocusState; detail?: FocusDetail; reason: string };

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export class FocusJudge {
  private phase: JudgePhase = 'calibrating';
  private calibStart: number | null = null;
  private calibSamples: JudgeInput[] = [];
  private base: AutoBaseline | null = null;
  private cal: GazeCalibration | null = null;
  private recent: Raw[] = [];
  private lastState: FocusState | null = null;
  private screenTrail: { t: number; x: number; y: number }[] = [];
  private lastScrollAt = 0;
  private scrollTrail: { t: number; y: number }[] = [];
  private mode: ReaderMode = 'scroll';
  private lastPageTurnAt = 0;
  /** 지금 보고 있는 페이지. enteredAt=null 이면 다음 판정부터 머문 시간을 셈 (보정 직후 등) */
  private currentPage: { index: number; chars: number; enteredAt: number | null } | null = null;
  /** 최근 앞으로 넘긴 페이지들 (최대 PAGE_SKIM_PAGES 개) */
  private pageTrail: { chars: number; ms: number }[] = [];

  constructor(private readonly policy: FocusJudgePolicy = FOCUS_JUDGE_POLICY) {}

  /** 개인 보정 결과 넣기 → 바로 판정 단계로. null 이면 자동 기준(나)으로 다시 시작 */
  setCalibration(cal: GazeCalibration | null) {
    this.recalibrate();
    this.cal = cal;
    if (cal) {
      this.base = { yaw: cal.head.yaw, pitch: cal.head.pitch, gaze: null, gazeThresholdCm: this.policy.GAZE_DEV_CM };
      this.phase = 'tracking';
    }
  }

  /** 자동 기준 다시 잡기 (보정 결과도 지움) */
  recalibrate() {
    this.phase = 'calibrating';
    this.calibStart = null;
    this.calibSamples = [];
    this.base = null;
    this.cal = null;
    this.recent = [];
    this.lastState = null;
    this.screenTrail = [];
    this.scrollTrail = [];
    // 보정 시간은 읽은 시간이 아님 → 페이지 기록을 비우고, 지금 페이지 머문 시간은 보정 뒤부터 다시 셈
    this.pageTrail = [];
    if (this.currentPage) this.currentPage.enteredAt = null;
  }

  /** 읽기 화면 방식 바꾸기. 바뀌면 페이지 기록을 비움 */
  setReaderMode(mode: ReaderMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.pageTrail = [];
    this.currentPage = null;
  }

  get readerMode(): ReaderMode {
    return this.mode;
  }

  /**
   * [페이지 모드] 사용자가 페이지를 넘겼음 (멍때림·훑어보기 판단용)
   * @param pageChars 새로 연 페이지의 글자 수 (공백 제외, countReadingChars)
   * - 앞으로 넘김: 직전 페이지를 {글자 수, 머문 시간}으로 기록. 2쪽 이상 건너뛰면 사이 페이지는 직전 페이지 글자 수·0초
   * - 뒤로 넘김: 속도 계산에서 뺌 (다시 읽기). "넘김 있음"만 기록
   */
  notifyPageTurn(t: number, pageIndex: number, pageChars: number) {
    this.lastPageTurnAt = Math.max(this.lastPageTurnAt, t);
    const cur = this.currentPage;
    if (cur && cur.enteredAt != null && pageIndex > cur.index) {
      this.pageTrail.push({ chars: cur.chars, ms: Math.max(0, t - cur.enteredAt) });
      for (let k = cur.index + 1; k < pageIndex; k++) this.pageTrail.push({ chars: cur.chars, ms: 0 });
      while (this.pageTrail.length > this.policy.PAGE_SKIM_PAGES) this.pageTrail.shift();
    }
    this.currentPage = { index: pageIndex, chars: pageChars, enteredAt: t };
  }

  /**
   * [페이지 모드] 사용자가 넘긴 게 아니라 화면이 페이지를 정했음 (처음 열 때, 이어 읽기, 글자 크기 변경으로 다시 나눔)
   * 넘김으로 세지 않고, 이미 머물던 시간은 유지
   */
  setCurrentPage(pageIndex: number, pageChars: number) {
    this.currentPage = { index: pageIndex, chars: pageChars, enteredAt: this.currentPage?.enteredAt ?? null };
  }

  /** [페이지 모드] 읽기 속도 (판정·개발 화면용) */
  pageStats(now: number): PageStats {
    const trail = this.pageTrail;
    const chars = trail.reduce((a, p) => a + p.chars, 0);
    const ms = trail.reduce((a, p) => a + p.ms, 0);
    const cur = this.currentPage;
    const dwell = cur?.enteredAt != null ? Math.max(0, now - cur.enteredAt) : 0;
    const cps = (c: number, m: number) => (m > 0 ? c / (m / 1000) : c > 0 ? Infinity : 0);
    return {
      currentCps: cur && dwell > 0 ? cps(cur.chars, dwell) : null,
      recentAvgCps: trail.length ? cps(chars, ms) : null,
      judgeCps: trail.length ? cps(chars, ms + dwell) : null,
      pages: trail.length,
      recentChars: chars,
      pageIndex: cur?.index ?? null,
    };
  }

  /** 멍때림 판단 창 길이 (모드별) */
  private get stareWindowMs(): number {
    return this.mode === 'page' ? this.policy.PAGE_STARE_WINDOW_MS : this.policy.STARE_WINDOW_MS;
  }

  /** 사용자가 스크롤했음 (멍때림·훑어보기 판단용). y = 스크롤 위치(dp) */
  notifyScroll(t: number, y?: number) {
    this.lastScrollAt = Math.max(this.lastScrollAt, t);
    if (y == null) return;
    this.scrollTrail.push({ t, y });
    const from = t - this.policy.SKIM_WINDOW_MS;
    while (this.scrollTrail.length > 1 && this.scrollTrail[0].t < from) this.scrollTrail.shift();
  }

  /** 최근 30초 평균 스크롤 속도 (dp/초) */
  private scrollSpeed(now: number): number {
    const from = now - this.policy.SKIM_WINDOW_MS;
    const pts = this.scrollTrail.filter((p) => p.t >= from);
    let dist = 0;
    for (let i = 1; i < pts.length; i++) dist += Math.abs(pts[i].y - pts[i - 1].y);
    return dist / (this.policy.SKIM_WINDOW_MS / 1000);
  }

  get baseline(): Readonly<AutoBaseline> | null {
    return this.base;
  }

  get calibration(): Readonly<GazeCalibration> | null {
    return this.cal;
  }

  judge(s: JudgeInput): JudgeResult {
    // 보정 직후: 지금 페이지 머문 시간을 이 판정부터 셈
    if (this.currentPage && this.currentPage.enteredAt == null) this.currentPage.enteredAt = s.timestamp;
    if (this.phase === 'calibrating') return this.autoCalibrate(s);

    const screenGaze = this.cal?.map && s.gaze ? this.cal.map(s.gaze) : undefined;
    if (screenGaze) {
      this.screenTrail.push({ t: s.timestamp, ...screenGaze });
      const from = s.timestamp - this.stareWindowMs;
      while (this.screenTrail.length && this.screenTrail[0].t < from) this.screenTrail.shift();
    }

    const r = this.rawJudge(s, screenGaze);
    if (r.raw === 'focused') this.adapt(s);
    const { state, detail } = this.smooth(r);
    return {
      state,
      raw: r.raw,
      detail,
      reason: r.reason,
      phase: 'tracking',
      calibrationProgress: 1,
      screenGaze,
    };
  }

  /* ───────────── (나) 자동 기준 단계 ───────────── */

  private autoCalibrate(s: JudgeInput): JudgeResult {
    const p = this.policy;
    if (this.calibStart === null) this.calibStart = s.timestamp;

    const usable = s.faceDetected && s.yaw != null && s.pitch != null && !this.eyesClosed(s);
    if (usable) this.calibSamples.push(s);

    const elapsed = s.timestamp - this.calibStart;
    const progress = Math.min(
      1,
      Math.min(elapsed / p.CALIBRATION_MS, this.calibSamples.length / p.MIN_CALIBRATION_SAMPLES),
    );

    if (elapsed >= p.CALIBRATION_MS && this.calibSamples.length >= p.MIN_CALIBRATION_SAMPLES) {
      this.base = this.buildAutoBaseline(this.calibSamples);
      this.phase = 'tracking';
      this.calibSamples = [];
    }

    // 기준을 잡는 동안에는 "얼굴 보이면 집중"으로 기록 (시작하자마자 손해 보지 않게)
    const state: FocusState = s.faceDetected ? 'focused' : 'away';
    return { state, raw: state, reason: '기준 잡는 중', phase: 'calibrating', calibrationProgress: progress };
  }

  private buildAutoBaseline(samples: JudgeInput[]): AutoBaseline {
    const p = this.policy;
    const yaw = median(samples.map((x) => x.yaw!));
    const pitch = median(samples.map((x) => x.pitch!));

    const gs = samples.filter((x) => x.gaze).map((x) => x.gaze!);
    let gaze: AutoBaseline['gaze'] = null;
    let gazeThresholdCm: number = p.GAZE_DEV_CM;
    if (gs.length >= Math.ceil(samples.length / 2)) {
      gaze = { x: median(gs.map((g) => g.x)), y: median(gs.map((g) => g.y)) };
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

  private rawJudge(s: JudgeInput, screenGaze?: { x: number; y: number }): Raw {
    const p = this.policy;
    const b = this.base!;
    if (!s.faceDetected) return { raw: 'away', reason: '얼굴 없음' };
    if (this.eyesClosed(s)) return { raw: 'unfocused', detail: 'eyes-closed', reason: '눈 감음' };

    if (s.yaw != null && Math.abs(s.yaw - b.yaw) > p.MAX_YAW_DEV_DEG) {
      return { raw: 'unfocused', detail: 'head', reason: `고개 좌우 ${(s.yaw - b.yaw).toFixed(0)}°` };
    }
    if (s.pitch != null && Math.abs(s.pitch - b.pitch) > p.MAX_PITCH_DEV_DEG) {
      return { raw: 'unfocused', detail: 'head', reason: `고개 상하 ${(s.pitch - b.pitch).toFixed(0)}°` };
    }

    if (this.mode === 'page') {
      // 훑어보기 (페이지 모드): 최근 페이지들을 읽을 수 없을 만큼 빠르게 넘김
      const ps = this.pageStats(s.timestamp);
      if (
        ps.pages >= p.PAGE_SKIM_PAGES &&
        ps.recentChars >= p.PAGE_SKIM_MIN_CHARS &&
        ps.judgeCps != null &&
        ps.judgeCps > p.PAGE_SKIM_MAX_CHARS_PER_SEC
      ) {
        return { raw: 'unfocused', detail: 'skimming', reason: `훑어보기 (${ps.judgeCps.toFixed(0)}자/초)` };
      }
    } else {
      // 훑어보기: 읽을 수 없을 만큼 빠르게 스크롤
      const speed = this.scrollSpeed(s.timestamp);
      if (speed > p.SKIM_MAX_DP_PER_SEC) {
        return { raw: 'unfocused', detail: 'skimming', reason: `훑어보기 (${speed.toFixed(0)}dp/초)` };
      }
    }

    // ① 영역 — (가) 보정 시: 화면 안/밖
    if (this.cal && screenGaze) {
      const { width: W, height: H } = this.cal.screen;
      const margin = Math.max(this.cal.errorDp * p.OFFSCREEN_ERROR_K, W * p.OFFSCREEN_MIN_MARGIN_RATIO);
      const out = screenGaze.x < -margin || screenGaze.x > W + margin || screenGaze.y < -margin || screenGaze.y > H + margin;
      if (out) return { raw: 'unfocused', detail: 'offscreen', reason: '시선 화면 밖' };

      // ② 움직임 패턴 — 멍때림
      if (this.isStaring(s.timestamp)) return { raw: 'unfocused', detail: 'staring', reason: '멍때림 (시선 정지)' };
      return { raw: 'focused', reason: '집중 (시선+고개)' };
    }

    // ① 영역 — (나) 자동 기준: 기준에서 크게 벗어남
    if (!this.cal && s.gaze && b.gaze) {
      const d = Math.hypot(s.gaze.x - b.gaze.x, s.gaze.y - b.gaze.y);
      if (d > b.gazeThresholdCm) return { raw: 'unfocused', detail: 'offscreen', reason: `시선 이탈 ${d.toFixed(0)}cm` };
      return { raw: 'focused', reason: '집중 (시선+고개)' };
    }
    return { raw: 'focused', reason: '집중 (고개 기준)' };
  }

  /** 최근 10초(페이지 모드 15초) 동안 시선이 거의 안 움직였고, 스크롤(페이지 넘김)도 없었는지 */
  private isStaring(now: number): boolean {
    const p = this.policy;
    const cal = this.cal!;
    const trail = this.screenTrail;
    const page = this.mode === 'page';
    if (page && !p.PAGE_STARE_ENABLED) return false;
    const win = this.stareWindowMs;
    const lastActivity = page ? this.lastPageTurnAt : this.lastScrollAt;
    if (trail.length < p.STARE_MIN_SAMPLES) return false;
    if (now - trail[0].t < win * 0.8) return false; // 창이 아직 다 안 참
    if (now - lastActivity < win) return false; // 그동안 스크롤함(페이지 넘김) → 읽는 중

    const mx = median(trail.map((q) => q.x));
    const my = median(trail.map((q) => q.y));
    const spread = median(trail.map((q) => Math.hypot(q.x - mx, q.y - my)));
    return spread <= Math.max(cal.noiseDp * p.STARE_NOISE_K, p.STARE_MIN_SPREAD_DP);
  }

  /** 집중 중일 때 고개 기준을 아주 조금씩 현재 쪽으로 (서서히 바뀌는 자세 따라가기) */
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
  private smooth(r: Raw): { state: FocusState; detail?: FocusDetail } {
    this.recent.push(r);
    if (this.recent.length > this.policy.SMOOTH_WINDOW) this.recent.shift();
    const count: Record<FocusState, number> = { focused: 0, unfocused: 0, away: 0 };
    this.recent.forEach((x) => (count[x.raw] += 1));
    const max = Math.max(...Object.values(count));
    const top = (Object.keys(count) as FocusState[]).filter((k) => count[k] === max);
    const state = top.length === 1 ? top[0] : this.lastState && top.includes(this.lastState) ? this.lastState : r.raw;
    this.lastState = state;
    // 세부 이유: 최종 상태와 같은 판정 중 가장 최근 것
    const detail = state === 'unfocused' ? [...this.recent].reverse().find((x) => x.raw === 'unfocused')?.detail : undefined;
    return { state, detail };
  }
}
