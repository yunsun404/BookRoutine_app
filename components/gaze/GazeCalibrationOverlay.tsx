/**
 * 개인 보정 화면 (= 독서 전 카메라 초기 설정)
 *
 *  ⓪ 안내        : 넘겨 보는 카드 3장 (폰 위치·거리 / 눈으로만 보기 / 시작) → [시작하기]
 *  ① 자세 맞추기  : 얼굴 아이콘(카메라 영상은 보여 주지 않음) + 체크리스트(거리·각도·눈·밝기). 모두 ✅ 상태가 잠깐 유지되면 자동 진행
 *                   아이콘 색: 회색 = 얼굴 찾는 중 / 주황 = 자세 고치는 중 / 초록 = 좋음
 *  ② 점 따라보기  : 점 5개가 차례로 나타남 → 그동안의 모델 출력을 모음
 *                   시간 설정은 lib/gaze/calibrationTiming.ts (기본 'fast', 점 하나 약 1.5초)
 *                   점이 움직이기 시작한 시각을 shownAt 으로 잡음 → 계산 쪽 settled() 가 0.7초를 버림
 *                   (= 이동 0.3초 + 도착 후 0.4초). 그 뒤 "시선이 안정적인" 샘플만 모으고,
 *                   필요한 개수가 차면 바로 다음 점. 최대 시간 안에 못 모으면 모은 만큼으로 넘어감
 *  ③ 가운데 응시  : 마지막 점에서 가운데로 이동 → 가운데 점 3초 → "가만히 볼 때 흔들림"(잡음) 측정
 *                   (예전 값 그대로, 안정 필터 없음 — 흔들림이 작게 재지지 않게)
 *  ④ 결과        : 시선 오차(cm) 표시 → [시작하기] / [다시 하기]
 *  언제든 [건너뛰기] → 보정 없이 시작 (처음 5초 자동 기준, 고개 위주 판정)
 *
 * 카메라는 이 컴포넌트 밖(부모)에 있음: onPhaseChange 로 단계를 알려 주면 부모가 미리보기 크기를 바꿈
 * 좌표 기준: 점 영역 (오버레이에서 SafeArea 바깥 = 상태바·카메라 구멍·아래 바 부분을 뺀 곳)
 *            판정도 같은 크기를 "화면"으로 사용
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  CALIBRATION_TIMING,
  DEFAULT_CALIBRATION_TIMING,
  dotStepStatus,
  FIXATION_TIMING,
  isStableSample,
  retryTimingAfter,
  safeAreaGaps,
  withRejectedSamples,
  type CalibrationTiming,
  type CalibrationTimingName,
  type StableSample,
} from '../../lib/gaze/calibrationTiming';
import {
  CALIBRATION_POLICY,
  calibrationTargets,
  computeCalibration,
  settled,
  type CalibPointData,
  type GazeCalibration,
  type GazeObs,
  type Pt,
} from '../../lib/gaze/gazeCalibration';
import { checkPosture, type PostureItem } from '../../lib/gaze/postureCheck';
import type { GazeSample } from '../../lib/gaze/useGazeSampler';

export type CalibrationPhase = 'intro' | 'posture' | 'dots' | 'fixation' | 'result';

/** 도착 신호(점이 "톡" 커졌다 돌아옴) 길이 */
const ARRIVE_POP_MS = 280;
/** 점 반지름 (styles.dot 크기의 절반) */
const DOT_RADIUS = 14;
const POSTURE_OK_STREAK = 3; // 연속 3번(약 0.75초) 자세 OK → 자동 진행
const POSTURE_FORCE_MS = 10_000; // 10초 지나면 "그래도 진행" 버튼 표시
/** 부모가 큰 미리보기를 놓는 영역 높이 (자세 단계에서 이 아래에 안내를 그림) */
export const CALIBRATION_PREVIEW_SPACE = 300;

/** 보정 시작 전 안내 카드 */
const INTRO_CARDS = [
  { icon: '📱', title: '폰을 눈높이에 두세요', desc: '책을 읽을 때처럼 들고,\n얼굴에서 30~40cm 떨어뜨려 주세요.' },
  { icon: '👀', title: '눈으로만 점을 봐 주세요', desc: '점이 나타나면 머리는 그대로 두고\n눈으로만 따라가 주세요.' },
  { icon: '✨', title: '준비되면 시작해요', desc: '자세를 맞춘 뒤 점 5개와 가운데 점을\n차례로 보면 끝나요. 15초 정도 걸려요.' },
] as const;

/** 개발 화면 비교용 기록 */
export interface CalibrationRunStats {
  timing: CalibrationTimingName;
  /** 첫 점이 나타난 때부터 결과가 나올 때까지 (ms) */
  durationMs: number;
  /** 점마다 계산에 쓰인 샘플 수 (settled 기준) */
  perPointSamples: number[];
  /** 샘플이 모자라 계산에서 빠진 점 수 */
  droppedPoints: number;
  /** 점 영역 위쪽에 더한 여백 (dp) — 카메라 구멍 피하기 확인용 */
  areaTopGap: number;
}

interface Props {
  subscribe: (fn: (s: GazeSample) => void) => () => void;
  onDone: (cal: GazeCalibration | null) => void;
  onPhaseChange?: (phase: CalibrationPhase) => void;
  /** 점 단계 시간 설정 (기본 'fast'). 개발 화면에서 예전 방식과 비교할 때만 바꿈 */
  timing?: CalibrationTimingName;
  /** 결과가 나올 때 한 번 (개발 화면 비교용) */
  onStats?: (stats: CalibrationRunStats, cal: GazeCalibration) => void;
}

export function GazeCalibrationOverlay({
  subscribe,
  onDone,
  onPhaseChange,
  timing = DEFAULT_CALIBRATION_TIMING,
  onStats,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  /** 지금 쓰는 방식: 빠른 방식이 실패하면 [다시 하기]부터 예전(천천히) 방식 */
  const [activeTiming, setActiveTiming] = useState<CalibrationTimingName>(timing);
  const [slowRetry, setSlowRetry] = useState(false);
  useEffect(() => {
    setActiveTiming(timing); // 개발 화면에서 방식을 바꾸면 따라감
    setSlowRetry(false);
  }, [timing]);
  const dotTiming = CALIBRATION_TIMING[activeTiming];

  const [overlayWidth, setOverlayWidth] = useState(0);
  const [gaps, setGaps] = useState<{ top: number; bottom: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [phase, setPhase] = useState<CalibrationPhase>('intro');
  const [introPage, setIntroPage] = useState(0);
  const [posture, setPosture] = useState<{ ok: boolean; items: PostureItem[] }>({ ok: false, items: [] });
  const [canForce, setCanForce] = useState(false);
  const [dotIndex, setDotIndex] = useState(0);
  const [result, setResult] = useState<GazeCalibration | null>(null);

  const overlayRef = useRef<View>(null);
  const introScrollRef = useRef<ScrollView>(null);

  // 수집 데이터 (화면 갱신과 무관 → ref)
  const pointsRef = useRef<CalibPointData[]>([]);
  const currentRef = useRef<CalibPointData | null>(null);
  /** 지금 점에서 안정 필터로 걸러 낸 샘플 (모자랄 때 채워 넣기용) */
  const rejectedRef = useRef<GazeObs[]>([]);
  /** 지금 모으는 점에 쓰는 시간 설정 (안정 필터 여부 포함) */
  const currentTimingRef = useRef<CalibrationTiming>(dotTiming);
  /** 바로 앞 샘플 (안정 판단용, 점이 바뀌어도 이어서 씀) */
  const lastSampleRef = useRef<StableSample | null>(null);
  const okStreakRef = useRef(0);
  const dotsStartedAtRef = useRef(0);

  // 점 위치 (점 단계·가운데 응시 단계가 같이 씀 → 이전 위치에서 이어서 움직임)
  const dotPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // 점 크기 (도착 신호용)
  const dotScale = useRef(new Animated.Value(1)).current;

  /** 점을 target 으로 부드럽게 옮기는 애니메이션 (start 는 부르는 쪽에서) */
  const moveDotTo = (target: Pt, ms: number) =>
    Animated.timing(dotPos, {
      toValue: target,
      duration: ms,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

  const targets: Pt[] = size ? calibrationTargets(size.width, size.height) : [];

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /** 오버레이가 화면에서 놓인 위치를 재서, SafeArea 바깥에 걸친 만큼만 점 영역을 줄임 */
  const measureOverlay = useCallback(() => {
    overlayRef.current?.measureInWindow((_x, y, w, h) => {
      setOverlayWidth(w);
      setGaps(safeAreaGaps({ windowY: y, height: h }, windowHeight, insets));
    });
  }, [windowHeight, insets]);

  const startPosture = useCallback(() => {
    pointsRef.current = [];
    currentRef.current = null;
    okStreakRef.current = 0;
    setResult(null);
    setCanForce(false);
    setPhase('posture');
  }, []);

  const startDots = useCallback(() => {
    if (phaseRef.current !== 'posture') return;
    phaseRef.current = 'dots'; // 다음 샘플이 또 부르지 않게 바로 바꿔 둠
    okStreakRef.current = 0;
    pointsRef.current = [];
    dotsStartedAtRef.current = Date.now();
    setDotIndex(0);
    setPhase('dots');
  }, []);

  // 샘플 받기: 자세 단계면 체크, 점 단계면 수집 (안정적인 샘플만)
  useEffect(
    () =>
      subscribe((s) => {
        if (phaseRef.current === 'intro') return;
        if (phaseRef.current === 'posture') {
          const p = checkPosture(s);
          setPosture(p);
          okStreakRef.current = p.ok ? okStreakRef.current + 1 : 0;
          if (okStreakRef.current >= POSTURE_OK_STREAK) startDots();
          return;
        }
        if (!s.faceDetected || !s.gaze) return;
        const sample: StableSample = { gaze: s.gaze, yaw: s.yaw, pitch: s.pitch };
        const prev = lastSampleRef.current;
        lastSampleRef.current = sample;
        const cur = currentRef.current;
        if (!cur) return;
        const obs: GazeObs = { t: s.timestamp, ...sample };
        if (isStableSample(prev, sample, currentTimingRef.current)) cur.obs.push(obs);
        else rejectedRef.current.push(obs);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscribe],
  );

  // 자세 단계 10초 지나면 "그래도 진행" 표시
  useEffect(() => {
    if (phase !== 'posture') return;
    const t = setTimeout(() => setCanForce(true), POSTURE_FORCE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  /**
   * 점 하나 진행: [이동(선택)] → 도착 신호(톡) → (대기) → 값 모으기 → onDone(point)
   *  - shownAtFrom 'move' : 이동을 시작할 때 shownAt → 계산 쪽 settled() 가 이동 중·도착 직후 값을 버림
   *  - shownAtFrom 'hold' : 도착 후 대기가 끝난 때 shownAt (예전 방식, 가운데 응시)
   *  - minMs 이상 지나고 settled 샘플이 targetSamples 개면 끝, maxMs 가 지나면 모은 만큼으로 끝
   *  - 반환값 = 정리 함수 (화면을 나가거나 단계가 바뀌면 애니메이션·타이머를 모두 멈춤)
   */
  const runDotStep = (
    target: Pt,
    opts: { move: boolean; timing: CalibrationTiming; onDone: (point: CalibPointData) => void },
  ) => {
    const t = opts.timing;
    currentRef.current = null;
    currentTimingRef.current = t;
    let poll: ReturnType<typeof setInterval> | null = null;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let pop: Animated.CompositeAnimation | null = null;

    const begin = () => {
      const point: CalibPointData = { target, shownAt: Date.now(), obs: [] };
      rejectedRef.current = [];
      currentRef.current = point;
      poll = setInterval(() => {
        const status = dotStepStatus(
          Date.now() - point.shownAt,
          settled(point).length,
          t,
          CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT,
        );
        if (status === 'wait') return;
        if (poll) clearInterval(poll);
        poll = null;
        currentRef.current = null; // 다 모았으면 바로 수집 멈춤
        const rejected = rejectedRef.current;
        rejectedRef.current = [];
        // 모자라면 걸러 낸 샘플도 채움 (충분하면 그대로)
        opts.onDone(withRejectedSamples(point, rejected, CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT));
      }, t.pollMs);
    };

    // 도착 신호: 점이 "톡" 커졌다 돌아옴 → 눈을 점으로 끌어당김
    const arrive = () => {
      dotScale.setValue(1);
      pop = Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.7, duration: ARRIVE_POP_MS * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: ARRIVE_POP_MS * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]);
      pop.start();
      if (t.shownAtFrom === 'hold') hold = setTimeout(begin, t.arriveHoldMs);
    };

    if (t.shownAtFrom === 'move') begin(); // 점이 움직이기 시작한 때부터 시간 셈

    const move = opts.move ? moveDotTo(target, t.moveMs) : null;
    if (move) {
      move.start(({ finished }) => {
        if (finished) arrive(); // 중간에 멈춘 경우(화면 나감 등)는 진행하지 않음
      });
    } else {
      dotPos.setValue(target);
      arrive();
    }

    return () => {
      move?.stop();
      pop?.stop();
      if (hold) clearTimeout(hold);
      if (poll) clearInterval(poll);
      currentRef.current = null;
    };
  };

  // 점 단계: 첫 점은 그 자리에 바로, 나머지는 이전 점에서 이동
  useEffect(() => {
    if (phase !== 'dots' || !targets.length) return;
    return runDotStep(targets[dotIndex], {
      move: dotIndex > 0,
      timing: dotTiming,
      onDone: (point) => {
        pointsRef.current.push(point);
        if (dotIndex + 1 < targets.length) setDotIndex(dotIndex + 1);
        else setPhase('fixation');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dotIndex, size]);

  // 가운데 응시: 마지막 점에서 가운데로 이동 → 도착 후 최소 3초, 값이 5개 모이면 계산 (최대 6초)
  useEffect(() => {
    if (phase !== 'fixation' || !size) return;
    return runDotStep(
      { x: size.width / 2, y: size.height / 2 },
      {
        move: true,
        timing: FIXATION_TIMING,
        onDone: (point) => {
          const cal = computeCalibration(pointsRef.current, point, size);
          setResult(cal);
          setPhase('result');
          if (onStats) {
            const perPointSamples = pointsRef.current.map((p) => settled(p).length);
            onStats(
              {
                timing: activeTiming,
                durationMs: Date.now() - dotsStartedAtRef.current,
                perPointSamples,
                droppedPoints: perPointSamples.filter((n) => n < CALIBRATION_POLICY.MIN_SAMPLES_PER_POINT).length,
                areaTopGap: gaps?.top ?? 0,
              },
              cal,
            );
          }
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, size]);

  // ── 안내 카드 넘기기
  const introCardWidth = Math.max(overlayWidth - 48, 1);
  const goIntroPage = (i: number) => {
    const next = Math.min(Math.max(i, 0), INTRO_CARDS.length - 1);
    introScrollRef.current?.scrollTo({ x: next * introCardWidth, animated: true });
    setIntroPage(next);
  };
  const onIntroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIntroPage(Math.round(e.nativeEvent.contentOffset.x / introCardWidth));
  };
  const lastIntro = introPage >= INTRO_CARDS.length - 1;

  const showDot = phase === 'dots' || phase === 'fixation';

  return (
    <View ref={overlayRef} style={styles.overlay} onLayout={measureOverlay}>
      {/* 점 영역: SafeArea 안쪽만 (카메라 구멍·상태바·아래 바 피하기). 측정 전에는 그리지 않음 */}
      {gaps && (
        <View
          pointerEvents="none"
          style={[styles.dotArea, { top: gaps.top, bottom: gaps.bottom }]}
          onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          {showDot && (
            // 점 하나를 계속 두고 위치만 움직임 (left/top 은 반지름만큼 당겨서 점 중심 = dotPos)
            <Animated.View
              style={[styles.dot, { transform: [...dotPos.getTranslateTransform(), { scale: dotScale }] }]}
            />
          )}
        </View>
      )}

      {phase === 'intro' && (
        <View style={[styles.introWrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <ScrollView
            ref={introScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onIntroScrollEnd}
            style={styles.introScroll}
          >
            {INTRO_CARDS.map((c, i) => (
              <View key={i} style={[styles.introCard, { width: introCardWidth }]}>
                <Text style={styles.introIcon}>{c.icon}</Text>
                <Text style={styles.introStep}>
                  {i + 1} / {INTRO_CARDS.length}
                </Text>
                <Text style={styles.introTitle}>{c.title}</Text>
                <Text style={styles.introDesc}>{c.desc}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.introDots}>
            {INTRO_CARDS.map((_, i) => (
              <View key={i} style={[styles.introDot, i === introPage && styles.introDotActive]} />
            ))}
          </View>

          <View style={styles.row}>
            {introPage > 0 ? (
              <Pressable style={styles.ghostBtn} onPress={() => goIntroPage(introPage - 1)}>
                <Text style={styles.ghostText}>이전</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.ghostBtn} onPress={() => onDone(null)}>
                <Text style={styles.ghostText}>건너뛰기</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.primaryBtn}
              onPress={() => (lastIntro ? startPosture() : goIntroPage(introPage + 1))}
            >
              <Text style={styles.primaryText}>{lastIntro ? '시작하기' : '다음'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'posture' && (
        <PostureFace status={postureStatus(posture)} />
      )}

      {phase === 'posture' && (
        <View style={[styles.panel, { marginTop: CALIBRATION_PREVIEW_SPACE }]}>
          <Text style={styles.title}>집중도 측정 준비</Text>
          <Text style={styles.desc}>책을 읽을 때처럼 폰을 들고, 화면 위쪽 카메라를 바라봐 주세요.</Text>
          {slowRetry && <Text style={styles.desc}>이번에는 천천히 다시 해 볼게요.</Text>}
          <View style={styles.list}>
            {posture.items.map((i) => (
              <Text key={i.key} style={[styles.item, { color: i.ok ? '#2BA84A' : '#E5484D' }]}>
                {i.ok ? '✅' : '⚠️'} {i.label}
                {i.ok ? '' : ` — ${i.key === 'face' ? '얼굴이 카메라에 보이게 해 주세요' : i.hint}`}
              </Text>
            ))}
            {posture.items.length === 0 && <Text style={styles.item}>카메라 준비 중…</Text>}
          </View>
          <Text style={styles.privacy}>카메라 영상은 화면에 나오지 않고, 기기 안에서만 처리돼요.</Text>
          <View style={styles.row}>
            <Pressable style={styles.ghostBtn} onPress={() => onDone(null)}>
              <Text style={styles.ghostText}>건너뛰기</Text>
            </Pressable>
            {canForce && (
              <Pressable style={styles.primaryBtn} onPress={startDots}>
                <Text style={styles.primaryText}>그래도 진행</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {phase === 'result' && result && (
        <View style={[styles.panel, styles.resultPanel]}>
          <Text style={styles.title}>{result.quality === 'poor' ? '보정 완료 (고개 위주 측정)' : '보정 완료'}</Text>
          <Text style={styles.big}>
            {Number.isFinite(result.errorCm) ? `시선 오차 약 ${result.errorCm.toFixed(1)}cm` : '시선 측정값 부족'}
          </Text>
          <Text style={styles.desc}>{result.summary}</Text>
          {!Number.isFinite(result.errorCm) && (
            <Text style={styles.desc}>
              얼굴과 두 눈이 화면에 잘 보이게 하고 [다시 하기]를 눌러 주세요.
              {activeTiming === 'fast' ? ' 다시 할 때는 점을 천천히 보여 드릴게요.' : ''} 그대로 시작하면 고개 방향
              위주로 측정해요.
            </Text>
          )}
          <View style={styles.row}>
            <Pressable
              style={styles.ghostBtn}
              onPress={() => {
                const next = retryTimingAfter(activeTiming, result);
                setSlowRetry(next !== activeTiming);
                setActiveTiming(next);
                startPosture();
              }}
            >
              <Text style={styles.ghostText}>다시 하기</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => onDone(result)}>
              <Text style={styles.primaryText}>독서 시작</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─────────── 자세 맞추기: 카메라 영상 대신 얼굴 아이콘 ─────────── */
type PostureStatus = 'search' | 'adjust' | 'ok';

function postureStatus(p: { ok: boolean; items: PostureItem[] }): PostureStatus {
  if (p.ok) return 'ok';
  const faceFound = p.items.length > 0 && !p.items.some((i) => i.key === 'face' && !i.ok);
  return faceFound ? 'adjust' : 'search';
}

const POSTURE_FACE = {
  search: { icon: 'scan-outline', color: '#A0A3BD', soft: '#ECECF3', text: '얼굴을 찾고 있어요' },
  adjust: { icon: 'happy-outline', color: '#E5A100', soft: '#FFF3D6', text: '아래 안내대로 맞춰 주세요' },
  ok: { icon: 'happy', color: '#2BA84A', soft: '#E3F6E8', text: '좋아요! 그대로 있어 주세요' },
} as const;

function PostureFace({ status }: { status: PostureStatus }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // 찾는 중에는 바깥 링이 천천히 퍼짐, 그 외에는 멈춤
    if (status !== 'search') {
      ring.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [status, ring]);

  const f = POSTURE_FACE[status];
  return (
    <View pointerEvents="none" style={styles.faceArea}>
      <View style={styles.faceStage}>
        <Animated.View
          style={[
            styles.faceRing,
            {
              borderColor: f.color,
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [status === 'search' ? 0.6 : 0, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
            },
          ]}
        />
        <View style={[styles.faceCircle, { backgroundColor: f.soft, borderColor: f.color }]}>
          <Ionicons name={f.icon} size={96} color={f.color} />
        </View>
      </View>
      <Text style={[styles.faceText, { color: f.color }]}>{f.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FBFBFD', zIndex: 10 },
  dotArea: { position: 'absolute', left: 0, right: 0 },
  panel: { paddingHorizontal: 24, gap: 10 },
  resultPanel: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2233' },
  desc: { fontSize: 14, lineHeight: 21, color: '#6E7191' },
  big: { fontSize: 26, fontWeight: '800', color: '#6B7BFF' },
  list: { gap: 6, marginTop: 4 },
  item: { fontSize: 14, fontWeight: '600', color: '#1F2233' },
  privacy: { fontSize: 12, color: '#A0A3BD', marginTop: 2 },
  faceArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CALIBRATION_PREVIEW_SPACE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  faceStage: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  faceRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3 },
  faceCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceText: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ghostBtn: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#ECECF3',
    alignItems: 'center', justifyContent: 'center',
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: '#6E7191' },
  primaryBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#6B7BFF', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  introWrap: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 24, justifyContent: 'center' },
  introScroll: { flexGrow: 0 },
  introCard: {
    alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 20,
    backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#ECECF3',
  },
  introIcon: { fontSize: 48 },
  introStep: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#1F2233', textAlign: 'center' },
  introDesc: { fontSize: 15, lineHeight: 23, color: '#6E7191', textAlign: 'center' },
  introDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  introDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ECECF3' },
  introDotActive: { width: 20, backgroundColor: '#6B7BFF' },
  dot: {
    position: 'absolute', left: -DOT_RADIUS, top: -DOT_RADIUS,
    width: DOT_RADIUS * 2, height: DOT_RADIUS * 2, borderRadius: DOT_RADIUS, backgroundColor: '#6B7BFF', borderWidth: 6, borderColor: '#C9CFFF' },
});
