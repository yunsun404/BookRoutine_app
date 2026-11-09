/**
 * 개인 보정 화면 (= 독서 전 카메라 초기 설정)
 *
 *  ① 자세 맞추기  : 큰 카메라 미리보기 + 체크리스트(거리·각도·눈·밝기). 모두 ✅ 상태가 1초 유지되면 자동 진행
 *  ② 점 따라보기  : 점 5개가 차례로 나타남 → 그동안의 모델 출력을 모음
 *                   점마다: 부드럽게 이동 → 도착 신호(톡) → 0.3초 대기 → 값 모으기
 *                   이동·신호·대기 중의 값은 모으지 않음 (대기가 끝난 시각을 shownAt 으로 잡음
 *                   → settled() 의 0.7초까지 더해 도착 후 약 1초부터의 값만 계산에 쓰임)
 *                   실기기 테스트: 고개가 점을 따라 움직이면 오차가 크게 나빠짐 → 안내 문구로 강조
 *  ③ 가운데 응시  : 마지막 점에서 가운데로 이동 → 가운데 점 3초 → "가만히 볼 때 흔들림"(잡음) 측정
 *  ④ 결과        : 시선 오차(cm) 표시 → [시작하기] / [다시 하기]
 *  언제든 [건너뛰기] → 보정 없이 시작 (처음 5초 자동 기준, 고개 위주 판정)
 *
 * 카메라는 이 컴포넌트 밖(부모)에 있음: onPhaseChange 로 단계를 알려 주면 부모가 미리보기 크기를 바꿈
 * 좌표 기준: 이 오버레이 영역 (onLayout 으로 크기 측정) — 판정도 같은 크기를 "화면"으로 사용
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  calibrationTargets,
  computeCalibration,
  settled,
  type CalibPointData,
  type GazeCalibration,
  type Pt,
} from '../../lib/gaze/gazeCalibration';
import { checkPosture, type PostureItem } from '../../lib/gaze/postureCheck';
import type { GazeSample } from '../../lib/gaze/useGazeSampler';

export type CalibrationPhase = 'posture' | 'dots' | 'fixation' | 'result';

/**
 * 점마다 머무는 시간: 기기 속도에 맞춰 자동 조절
 *  - 최소 DOT_MIN_MS 는 보여 주고, 안정된 값이 DOT_TARGET_SAMPLES 개 모이면 다음 점으로
 *  - 느린 기기라도 DOT_MAX_MS 가 지나면 넘어감 (그 점은 값이 부족하면 계산에서 빠짐)
 */
const DOT_MIN_MS = 1_500;
const DOT_MAX_MS = 5_000;
const DOT_TARGET_SAMPLES = 4; // 3 → 4: 튀는 값에 덜 흔들리게
const FIXATION_MIN_MS = 3_000;
const FIXATION_MAX_MS = 6_000;
const FIXATION_TARGET_SAMPLES = 5;
const POLL_MS = 200;
/** 점이 다음 위치로 이동하는 시간 (이 동안의 값은 모으지 않음) */
const DOT_MOVE_MS = 450;
/** 도착 신호(점이 "톡" 커졌다 돌아옴) 길이 */
const ARRIVE_POP_MS = 280;
/** 도착한 뒤 값을 모으기 전에 더 기다리는 시간 (눈이 점에 도착할 시간을 줌) */
const ARRIVE_HOLD_MS = 300;
/** 점 반지름 (styles.dot 크기의 절반) */
const DOT_RADIUS = 14;
const POSTURE_OK_STREAK = 3; // 연속 3번(약 0.75초) 자세 OK → 자동 진행
const POSTURE_FORCE_MS = 10_000; // 10초 지나면 "그래도 진행" 버튼 표시
/** 부모가 큰 미리보기를 놓는 영역 높이 (자세 단계에서 이 아래에 안내를 그림) */
export const CALIBRATION_PREVIEW_SPACE = 300;

interface Props {
  subscribe: (fn: (s: GazeSample) => void) => () => void;
  onDone: (cal: GazeCalibration | null) => void;
  onPhaseChange?: (phase: CalibrationPhase) => void;
}

export function GazeCalibrationOverlay({ subscribe, onDone, onPhaseChange }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [phase, setPhase] = useState<CalibrationPhase>('posture');
  const [posture, setPosture] = useState<{ ok: boolean; items: PostureItem[] }>({ ok: false, items: [] });
  const [canForce, setCanForce] = useState(false);
  const [dotIndex, setDotIndex] = useState(0);
  const [result, setResult] = useState<GazeCalibration | null>(null);

  // 수집 데이터 (화면 갱신과 무관 → ref)
  const pointsRef = useRef<CalibPointData[]>([]);
  const fixationRef = useRef<CalibPointData | null>(null);
  const currentRef = useRef<CalibPointData | null>(null);
  const okStreakRef = useRef(0);

  // 점 위치 (점 단계·가운데 응시 단계가 같이 씀 → 이전 위치에서 이어서 움직임)
  const dotPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // 점 크기 (도착 신호용)
  const dotScale = useRef(new Animated.Value(1)).current;

  /** 점을 target 으로 부드럽게 옮기는 애니메이션 (start 는 부르는 쪽에서) */
  const moveDotTo = (target: Pt) =>
    Animated.timing(dotPos, {
      toValue: target,
      duration: DOT_MOVE_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

  const targets: Pt[] = size ? calibrationTargets(size.width, size.height) : [];

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const startPosture = useCallback(() => {
    pointsRef.current = [];
    fixationRef.current = null;
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
    setDotIndex(0);
    setPhase('dots');
  }, []);

  // 샘플 받기: 자세 단계면 체크, 점 단계면 수집
  useEffect(
    () =>
      subscribe((s) => {
        if (phaseRef.current === 'posture') {
          const p = checkPosture(s);
          setPosture(p);
          okStreakRef.current = p.ok ? okStreakRef.current + 1 : 0;
          if (okStreakRef.current >= POSTURE_OK_STREAK) startDots();
          return;
        }
        const cur = currentRef.current;
        if (cur && s.faceDetected && s.gaze) {
          cur.obs.push({ t: s.timestamp, gaze: s.gaze, yaw: s.yaw, pitch: s.pitch });
        }
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
   * 점 하나 진행: [이동(선택)] → 도착 신호(톡) → 잠깐 대기 → 값 모으기 → onDone(point)
   *  - 이동·도착 신호·대기 동안 들어온 값은 버림 (눈이 아직 점에 도착하지 않았을 수 있어서)
   *  - shownAt = 대기가 끝난 시각 → settled() 의 0.7초까지 더해 "도착 후 약 1초"부터의 값만 계산에 쓰임
   *  - 반환값 = 정리 함수 (화면을 나가거나 단계가 바뀌면 애니메이션·타이머를 모두 멈춤)
   */
  const runDotStep = (
    target: Pt,
    opts: {
      move: boolean;
      minMs: number;
      maxMs: number;
      targetSamples: number;
      onDone: (point: CalibPointData) => void;
    },
  ) => {
    currentRef.current = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let pop: Animated.CompositeAnimation | null = null;

    const begin = () => {
      const point: CalibPointData = { target, shownAt: Date.now(), obs: [] };
      currentRef.current = point;
      poll = setInterval(() => {
        const elapsed = Date.now() - point.shownAt;
        const enough = settled(point).length >= opts.targetSamples;
        if ((elapsed >= opts.minMs && enough) || elapsed >= opts.maxMs) {
          if (poll) clearInterval(poll);
          poll = null;
          currentRef.current = null; // 다 모았으면 바로 수집 멈춤
          opts.onDone(point);
        }
      }, POLL_MS);
    };

    // 도착 신호: 점이 "톡" 커졌다 돌아옴 → 눈을 점으로 끌어당김
    const arrive = () => {
      dotScale.setValue(1);
      pop = Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.7, duration: ARRIVE_POP_MS * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: ARRIVE_POP_MS * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]);
      pop.start();
      hold = setTimeout(begin, ARRIVE_HOLD_MS);
    };

    const move = opts.move ? moveDotTo(target) : null;
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
    };
  };

  // 점 단계: 첫 점은 그 자리에 바로, 나머지는 이전 점에서 이동 (도착 후 최소 1.5초, 최대 5초)
  useEffect(() => {
    if (phase !== 'dots' || !targets.length) return;
    return runDotStep(targets[dotIndex], {
      move: dotIndex > 0,
      minMs: DOT_MIN_MS,
      maxMs: DOT_MAX_MS,
      targetSamples: DOT_TARGET_SAMPLES,
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
        minMs: FIXATION_MIN_MS,
        maxMs: FIXATION_MAX_MS,
        targetSamples: FIXATION_TARGET_SAMPLES,
        onDone: (point) => {
          fixationRef.current = point;
          setResult(computeCalibration(pointsRef.current, point, size));
          setPhase('result');
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, size]);

  const showDot = phase === 'dots' || phase === 'fixation';

  return (
    <View style={styles.overlay} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {phase === 'posture' && (
        <View style={[styles.panel, { marginTop: CALIBRATION_PREVIEW_SPACE }]}>
          <Text style={styles.title}>집중도 측정 준비</Text>
          <Text style={styles.desc}>책을 읽을 때처럼 폰을 들고, 얼굴이 원 안에 오게 해 주세요.</Text>
          <View style={styles.list}>
            {posture.items.map((i) => (
              <Text key={i.key} style={[styles.item, { color: i.ok ? '#2BA84A' : '#E5484D' }]}>
                {i.ok ? '✅' : '⚠️'} {i.label}
                {i.ok ? '' : ` — ${i.hint}`}
              </Text>
            ))}
            {posture.items.length === 0 && <Text style={styles.item}>카메라 준비 중…</Text>}
          </View>
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

      {showDot && (
        <>
          <Text style={styles.guide}>
            {phase === 'dots'
              ? `고개는 움직이지 말고 눈으로만 점을 따라가 주세요 (${dotIndex + 1}/${targets.length})`
              : '가운데 점을 가만히 봐 주세요'}
          </Text>
          {/* 점 하나를 계속 두고 위치만 움직임 (left/top 은 반지름만큼 당겨서 점 중심 = dotPos) */}
          <Animated.View
            pointerEvents="none"
            style={[styles.dot, { transform: [...dotPos.getTranslateTransform(), { scale: dotScale }] }]}
          />
        </>
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
              얼굴과 두 눈이 화면에 잘 보이게 하고 [다시 하기]를 눌러 주세요. 그대로 시작하면 고개 방향 위주로 측정해요.
            </Text>
          )}
          <View style={styles.row}>
            <Pressable style={styles.ghostBtn} onPress={startPosture}>
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

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FBFBFD', zIndex: 10 },
  panel: { paddingHorizontal: 24, gap: 10 },
  resultPanel: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2233' },
  desc: { fontSize: 14, lineHeight: 21, color: '#6E7191' },
  big: { fontSize: 26, fontWeight: '800', color: '#6B7BFF' },
  list: { gap: 6, marginTop: 4 },
  item: { fontSize: 14, fontWeight: '600', color: '#1F2233' },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ghostBtn: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#ECECF3',
    alignItems: 'center', justifyContent: 'center',
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: '#6E7191' },
  primaryBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#6B7BFF', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  guide: { position: 'absolute', top: 16, left: 24, right: 24, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#6E7191' },
  dot: {
    position: 'absolute', left: -DOT_RADIUS, top: -DOT_RADIUS,
    width: DOT_RADIUS * 2, height: DOT_RADIUS * 2, borderRadius: DOT_RADIUS, backgroundColor: '#6B7BFF', borderWidth: 6, borderColor: '#C9CFFF' },
});
