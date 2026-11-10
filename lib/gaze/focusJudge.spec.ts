import { FOCUS_JUDGE_POLICY, FocusJudge, type FocusJudgePolicy, type JudgeInput } from './focusJudge';

const T0 = 1_000_000;
/** 기본: 얼굴 있음, 책 보며 살짝 아래(pitch -10), 시선 (0, -5)cm */
const s = (t: number, o: Partial<JudgeInput> = {}): JudgeInput => ({
  timestamp: T0 + t * 1000,
  faceDetected: true,
  yaw: 2,
  pitch: -10,
  leftEyeOpen: 0.8,
  rightEyeOpen: 0.8,
  gaze: { x: 0, y: -5 },
  ...o,
});

/** 0.5초 간격으로 5초 보정 */
const calibrated = () => {
  const j = new FocusJudge();
  for (let t = 0; t <= 5; t += 0.5) j.judge(s(t, { gaze: { x: (t % 1) - 0.5, y: -5 } }));
  return j;
};

describe('FocusJudge', () => {
  it('보정 5초 동안은 얼굴이 보이면 focused, 끝나면 tracking 으로 전환', () => {
    const j = new FocusJudge();
    const first = j.judge(s(0));
    expect(first).toMatchObject({ phase: 'calibrating', state: 'focused' });
    for (let t = 0.5; t <= 5; t += 0.5) j.judge(s(t));
    expect(j.judge(s(5.5)).phase).toBe('tracking');
    expect(j.baseline).toMatchObject({ yaw: 2, pitch: -10, gaze: { x: 0, y: -5 } });
  });

  it('보정 중 얼굴이 없으면 away, 샘플이 모자라면 보정이 계속됨', () => {
    const j = new FocusJudge();
    for (let t = 0; t <= 6; t += 0.5) expect(j.judge(s(t, { faceDetected: false })).state).toBe('away');
    expect(j.judge(s(6.5)).phase).toBe('calibrating');
  });

  it('평소 모습이면 focused', () => {
    const j = calibrated();
    expect(j.judge(s(6))).toMatchObject({ raw: 'focused', state: 'focused' });
  });

  it('얼굴 없음 → away / 고개 돌림·눈 감음·시선 이탈 → unfocused', () => {
    expect(calibrated().judge(s(6, { faceDetected: false })).raw).toBe('away');
    expect(calibrated().judge(s(6, { yaw: 40 })).raw).toBe('unfocused');
    expect(calibrated().judge(s(6, { pitch: 15 })).raw).toBe('unfocused');
    expect(calibrated().judge(s(6, { leftEyeOpen: 0.05, rightEyeOpen: 0.1 })).raw).toBe('unfocused');
    expect(calibrated().judge(s(6, { gaze: { x: 15, y: -5 } })).raw).toBe('unfocused');
  });

  it('한쪽 눈만 감기거나(윙크) 시선이 조금 움직이는 건 focused', () => {
    expect(calibrated().judge(s(6, { leftEyeOpen: 0.05 })).raw).toBe('focused');
    expect(calibrated().judge(s(6, { gaze: { x: 4, y: -2 } })).raw).toBe('focused');
  });

  it('모델 결과가 없어도(gaze=null) 고개 기준으로 판정', () => {
    const j = new FocusJudge();
    for (let t = 0; t <= 5; t += 0.5) j.judge(s(t, { gaze: null }));
    expect(j.baseline?.gaze).toBeNull();
    expect(j.judge(s(6, { gaze: null })).reason).toBe('집중 (고개 기준)');
    expect(j.judge(s(6.5, { gaze: null, yaw: 40 })).raw).toBe('unfocused');
  });

  it('한 번 튀는 값은 흔들림 보정으로 무시, 계속되면 반영', () => {
    const j = calibrated();
    j.judge(s(6));
    expect(j.judge(s(6.5, { yaw: 40 }))).toMatchObject({ raw: 'unfocused', state: 'focused' });
    expect(j.judge(s(7, { yaw: 40 })).state).toBe('unfocused');
  });

  it('recalibrate 하면 다시 보정 단계', () => {
    const j = calibrated();
    j.recalibrate();
    expect(j.judge(s(10)).phase).toBe('calibrating');
    expect(j.baseline).toBeNull();
  });
});

describe('FocusJudge v2 (개인 보정 사용)', () => {
  const W = 400;
  const H = 800;
  /** 모델 출력이 곧 화면 좌표(dp)인 단순한 보정 */
  const cal = {
    screen: { width: W, height: H },
    map: (g: { x: number; y: number }) => g,
    errorDp: 60,
    errorCm: 0.95,
    noiseDp: 15,
    quality: 'good' as const,
    head: { yaw: 2, pitch: -10 },
    summary: '',
  };
  const at = (t: number, gx: number, gy: number, o: Partial<JudgeInput> = {}) => s(t, { gaze: { x: gx, y: gy }, ...o });
  const withCal = () => {
    const j = new FocusJudge();
    j.setCalibration(cal);
    return j;
  };

  it('보정을 넣으면 바로 판정 단계, 화면 안을 보면 집중', () => {
    const j = withCal();
    const r = j.judge(at(0, 200, 400));
    expect(r).toMatchObject({ phase: 'tracking', raw: 'focused' });
    expect(r.screenGaze).toEqual({ x: 200, y: 400 });
  });

  it('화면 밖(여유 포함)을 보면 offscreen', () => {
    expect(withCal().judge(at(0, 200, 400 + H)).detail).toBe('offscreen');
    expect(withCal().judge(at(0, W + 50, 400)).raw).toBe('focused'); // 여유(60dp) 안쪽
  });

  it('10초 동안 시선이 잡음 수준으로만 움직이고 스크롤이 없으면 멍때림', () => {
    const j = withCal();
    let last;
    for (let t = 0; t <= 11; t += 0.5) last = j.judge(at(t, 200 + ((t * 2) % 3) * 5, 400));
    expect(last).toMatchObject({ state: 'unfocused', detail: 'staring' });
  });

  it('글을 읽듯 좌우로 움직이면 멍때림 아님', () => {
    const j = withCal();
    let last;
    for (let t = 0; t <= 11; t += 0.5) last = j.judge(at(t, 60 + ((t * 2) % 6) * 50, 300 + t * 3));
    expect(last).toMatchObject({ state: 'focused' });
  });

  it('최근 10초 안에 스크롤했으면 멍때림 아님', () => {
    const j = withCal();
    j.notifyScroll(T0 + 5_000);
    let last;
    for (let t = 0; t <= 11; t += 0.5) last = j.judge(at(t, 200, 400));
    expect(last?.state).toBe('focused');
  });

  it('보정의 고개 기준을 사용', () => {
    expect(withCal().judge(at(0, 200, 400, { yaw: 2 + 30 })).detail).toBe('head');
  });

  it('보정 품질이 poor(map=null)면 고개 기준으로만 판정', () => {
    const j = new FocusJudge();
    j.setCalibration({ ...cal, map: null, quality: 'poor' });
    expect(j.judge(at(0, 9999, 9999)).reason).toBe('집중 (고개 기준)');
  });
});

describe('FocusJudge 훑어보기 (빠른 스크롤)', () => {
  const calibrated2 = () => {
    const j = new FocusJudge();
    for (let t = 0; t <= 5; t += 0.5) j.judge(s(t, { gaze: null }));
    return j;
  };

  it('30초 동안 1초에 50dp씩 계속 스크롤하면 훑어보기', () => {
    const j = calibrated2();
    for (let t = 6; t <= 36; t++) j.notifyScroll(T0 + t * 1000, (t - 6) * 50);
    j.judge(s(36, { gaze: null }));
    expect(j.judge(s(36.5, { gaze: null }))).toMatchObject({ state: 'unfocused', detail: 'skimming' });
  });

  it('20초마다 한 화면(600dp)씩 넘기는 빠른 읽기도 집중', () => {
    const j = calibrated2();
    j.notifyScroll(T0 + 10_000, 0);
    j.notifyScroll(T0 + 11_000, 600);
    j.notifyScroll(T0 + 31_000, 600);
    j.notifyScroll(T0 + 32_000, 1200);
    expect(j.judge(s(33, { gaze: null })).raw).toBe('focused');
  });
});

describe('FocusJudge 페이지 모드 (좌우로 넘기는 전자책)', () => {
  const sec = (t: number) => T0 + t * 1000;
  /** 페이지 모드 + 자동 기준 5초 (시선 모델 없음) */
  const paged = (policy: FocusJudgePolicy = FOCUS_JUDGE_POLICY) => {
    const j = new FocusJudge(policy);
    j.setReaderMode('page');
    for (let t = 0; t <= 5; t += 0.5) j.judge(s(t, { gaze: null }));
    return j;
  };
  /** t초마다 한 장씩 앞으로 넘김 (첫 호출은 기준 페이지라 기록 없음) */
  const turns = (j: FocusJudge, times: number[], chars = 400, from = 0) =>
    times.forEach((t, k) => j.notifyPageTurn(sec(t), from + k, chars));

  it('기본은 스크롤 모드', () => {
    expect(new FocusJudge().readerMode).toBe('scroll');
  });

  it('2초마다 400자 페이지를 3장 넘기면 훑어보기', () => {
    const j = paged();
    turns(j, [6, 8, 10, 12]);
    const ps = j.pageStats(sec(12.5));
    expect(ps).toMatchObject({ pages: 3, recentChars: 1200, pageIndex: 3 });
    expect(ps.recentAvgCps).toBeCloseTo(200);
    expect(ps.judgeCps).toBeCloseTo(1200 / 6.5);
    expect(j.judge(s(12.5, { gaze: null }))).toMatchObject({ raw: 'unfocused', detail: 'skimming' });
  });

  it('1분에 한 장씩(약 7자/초) 읽으면 집중', () => {
    const j = paged();
    turns(j, [6, 66, 126, 186]);
    expect(j.judge(s(190, { gaze: null })).raw).toBe('focused');
  });

  it('빠르게 넘긴 뒤 지금 페이지를 오래 읽으면 저절로 풀림', () => {
    const j = paged();
    turns(j, [6, 8, 10, 12]);
    expect(j.judge(s(13, { gaze: null })).raw).toBe('unfocused');
    // 1200자 ÷ (6초 + 60초) ≈ 18자/초 < 25
    expect(j.judge(s(72, { gaze: null })).raw).toBe('focused');
  });

  it('최근 페이지 글자 합이 300자 미만이면 판단하지 않음', () => {
    const j = paged();
    turns(j, [6, 7, 8, 9], 50);
    expect(j.judge(s(9.5, { gaze: null })).raw).toBe('focused');
  });

  it('뒤로 넘긴 건 속도 계산에서 뺌', () => {
    const j = paged();
    j.notifyPageTurn(sec(6), 1, 400);
    j.notifyPageTurn(sec(8), 2, 400); // 1쪽 2초 기록
    j.notifyPageTurn(sec(9), 1, 400); // 뒤로 → 기록 안 함
    j.notifyPageTurn(sec(10), 2, 400); // 1쪽 1초 기록
    expect(j.pageStats(sec(10.5)).pages).toBe(2);
    expect(j.judge(s(10.5, { gaze: null })).raw).toBe('focused'); // 3장이 안 모임
  });

  it('여러 장을 한 번에 건너뛰면 사이 페이지는 0초로 기록 → 훑어보기', () => {
    const j = paged();
    j.notifyPageTurn(sec(6), 1, 400);
    j.notifyPageTurn(sec(30), 5, 400); // 1쪽 24초, 2~4쪽 0초 → 최근 3장 = 0초
    expect(j.pageStats(sec(30.5)).pages).toBe(3);
    expect(j.judge(s(30.5, { gaze: null })).detail).toBe('skimming');
  });

  it('화면이 정한 페이지(setCurrentPage)는 넘김으로 세지 않음', () => {
    const j = paged();
    j.setCurrentPage(4, 400);
    j.setCurrentPage(7, 380); // 다시 나누기로 번호가 바뀜
    expect(j.pageStats(sec(6))).toMatchObject({ pages: 0, pageIndex: 7 });
  });

  it('페이지 모드에서는 스크롤 속도를 보지 않음', () => {
    const j = paged();
    for (let t = 6; t <= 36; t++) j.notifyScroll(sec(t), (t - 6) * 50);
    expect(j.judge(s(36.5, { gaze: null })).raw).toBe('focused');
  });

  it('다시 보정하면 페이지 기록을 비우고, 머문 시간은 보정 뒤부터 다시 셈', () => {
    const j = paged();
    turns(j, [6, 8, 10, 12]);
    j.recalibrate();
    expect(j.pageStats(sec(20))).toMatchObject({ pages: 0, currentCps: null, pageIndex: 3 });
    j.judge(s(20, { gaze: null })); // 이때부터 셈
    expect(j.pageStats(sec(30)).currentCps).toBeCloseTo(40); // 400자 ÷ 10초
  });

  describe('멍때림 (개인 보정 사용)', () => {
    const cal = {
      screen: { width: 400, height: 800 },
      map: (g: { x: number; y: number }) => g,
      errorDp: 60,
      errorCm: 0.95,
      noiseDp: 15,
      quality: 'good' as const,
      head: { yaw: 2, pitch: -10 },
      summary: '',
    };
    const stare = (j: FocusJudge, until: number) => {
      let last;
      for (let t = 0; t <= until; t += 0.5) last = j.judge(s(t, { gaze: { x: 200, y: 400 } }));
      return last!;
    };
    const pagedCal = (policy: FocusJudgePolicy = FOCUS_JUDGE_POLICY) => {
      const j = new FocusJudge(policy);
      j.setReaderMode('page');
      j.setCalibration(cal);
      return j;
    };

    it('창이 15초라 11초 정지로는 아직 아님, 16초 정지 + 넘김 없음이면 멍때림', () => {
      expect(stare(pagedCal(), 11).state).toBe('focused');
      expect(stare(pagedCal(), 16)).toMatchObject({ state: 'unfocused', detail: 'staring' });
    });

    it('최근 15초 안에 페이지를 넘겼으면 멍때림 아님', () => {
      const j = pagedCal();
      j.notifyPageTurn(sec(8), 1, 400);
      expect(stare(j, 16).state).toBe('focused');
    });

    it('PAGE_STARE_ENABLED=false 면 멍때림 판정 안 함', () => {
      expect(stare(pagedCal({ ...FOCUS_JUDGE_POLICY, PAGE_STARE_ENABLED: false }), 20).state).toBe('focused');
    });
  });
});
