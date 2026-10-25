/**
 * 개인 보정 화면 (= 독서 전 카메라 초기 설정)
 *
 *  ① 자세 맞추기  : 큰 카메라 미리보기 + 체크리스트(거리·각도·눈·밝기). 모두 ✅ 상태가 1초 유지되면 자동 진행
 *  ② 점 따라보기  : 점 5개가 2.5초씩 나타남 → 그동안의 모델 출력을 모음
 *  ③ 가운데 응시  : 가운데 점 3초 → "가만히 볼 때 흔들림"(잡음) 측정
 *  ④ 결과        : 시선 오차(cm) 표시 → [시작하기] / [다시 하기]
 *  언제든 [건너뛰기] → 보정 없이 시작 (처음 5초 자동 기준, 고개 위주 판정)
 *
 * 카메라는 이 컴포넌트 밖(부모)에 있음: onPhaseChange 로 단계를 알려 주면 부모가 미리보기 크기를 바꿈
 * 좌표 기준: 이 오버레이 영역 (onLayout 으로 크기 측정) — 판정도 같은 크기를 "화면"으로 사용
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  calibrationTargets,
  computeCalibration,
  type CalibPointData,
  type GazeCalibration,
  type Pt,
} from '../../lib/gaze/gazeCalibration';
import { checkPosture, type PostureItem } from '../../lib/gaze/postureCheck';
import type { GazeSample } from '../../lib/gaze/useGazeSampler';

export type CalibrationPhase = 'posture' | 'dots' | 'fixation' | 'result';

const DOT_MS = 2_500;
const FIXATION_MS = 3_000;
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

  // 점 단계: 점마다 2.5초
  useEffect(() => {
    if (phase !== 'dots' || !targets.length) return;
    const point: CalibPointData = { target: targets[dotIndex], shownAt: Date.now(), obs: [] };
    currentRef.current = point;
    const t = setTimeout(() => {
      pointsRef.current.push(point);
      if (dotIndex + 1 < targets.length) setDotIndex(dotIndex + 1);
      else setPhase('fixation');
    }, DOT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dotIndex, size]);

  // 가운데 응시 3초 → 계산
  useEffect(() => {
    if (phase !== 'fixation' || !size) return;
    const point: CalibPointData = { target: { x: size.width / 2, y: size.height / 2 }, shownAt: Date.now(), obs: [] };
    currentRef.current = point;
    const t = setTimeout(() => {
      currentRef.current = null;
      fixationRef.current = point;
      setResult(computeCalibration(pointsRef.current, point, size));
      setPhase('result');
    }, FIXATION_MS);
    return () => clearTimeout(t);
  }, [phase, size]);

  const dot = phase === 'dots' ? targets[dotIndex] : phase === 'fixation' && size ? { x: size.width / 2, y: size.height / 2 } : null;

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

      {(phase === 'dots' || phase === 'fixation') && (
        <>
          <Text style={styles.guide}>
            {phase === 'dots'
              ? `머리는 그대로, 눈으로만 점을 봐 주세요 (${dotIndex + 1}/${targets.length})`
              : '가운데 점을 가만히 봐 주세요'}
          </Text>
          {dot && <View key={`${phase}-${dotIndex}`} style={[styles.dot, { left: dot.x - 14, top: dot.y - 14 }]} />}
        </>
      )}

      {phase === 'result' && result && (
        <View style={[styles.panel, styles.resultPanel]}>
          <Text style={styles.title}>{result.quality === 'poor' ? '보정 완료 (고개 위주 측정)' : '보정 완료'}</Text>
          <Text style={styles.big}>
            {Number.isFinite(result.errorCm) ? `시선 오차 약 ${result.errorCm.toFixed(1)}cm` : '시선 값 부족'}
          </Text>
          <Text style={styles.desc}>{result.summary}</Text>
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
  dot: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#6B7BFF', borderWidth: 6, borderColor: '#C9CFFF' },
});
