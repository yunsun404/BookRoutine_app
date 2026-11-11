/**
 * [임시] 시선추적 확인 화면 — 기기 테스트·기준값 조정용
 *
 * 확인 항목
 *  ① 카메라 미리보기
 *  ② 얼굴·머리 각도·눈 뜸 확률·얼굴 크기·눈 밝기가 나오는가
 *  ③ 잘린 눈 2장이 학습 데이터처럼 보이는가  ← 가장 중요
 *       - 눈이 가운데, 수평, 눈썹 일부 포함 / 왼쪽 칸 = 사진에서 왼쪽에 보이는 눈
 *       - 고개를 기울여도 눈은 수평이어야 함 (더 기울면 gazeConfig 의 ROTATE_CLOCKWISE_POSITIVE 반대로)
 *  ④ 모델 결과(cm)가 시선 따라 바뀌는가 (고개는 고정, 눈만 위/아래/좌/우)
 *  ⑤ 1회 총 시간 (목표 500ms 이하)
 *  ⑥ [보정] 버튼 → 보정 화면 → 시선 오차(cm) 확인 → 화면 위 빨간 점이 내가 보는 곳을 따라오는가
 *  ⑦ 판정: 고개 돌리기 / 눈 감기 / 화면 밖 보기 / 10초 한 곳 응시(멍때림) / 자리 비우기
 *
 * 접속: router.push('/dev/gaze-check')  /  확인 끝나면 삭제
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NitroImage } from 'react-native-nitro-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraPermission } from 'react-native-vision-camera';

import {
  CALIBRATION_PREVIEW_SPACE,
  type CalibrationPhase,
  type CalibrationRunStats,
  GazeCalibrationOverlay,
} from '../../components/gaze/GazeCalibrationOverlay';
import { useGazeFocusTracker } from '../../hooks/useGazeFocusTracker';
import { type CalibrationTimingName, summarizeRuns } from '../../lib/gaze/calibrationTiming';
import { GAZE_CONFIG } from '../../lib/gaze/gazeConfig';

/** 보정 비교 기록 1줄 (앱이 켜져 있는 동안만 보관) */
type RunRow = CalibrationRunStats & { errorCm: number; noiseDp: number; quality: string };
const TIMING_LABEL: Record<CalibrationTimingName, string> = { fast: '새', legacy: '예전' };

const STATE_LABEL = { focused: '집중', unfocused: '딴짓', away: '자리 비움' } as const;
const STATE_COLOR = { focused: '#2BA84A', unfocused: '#E5A100', away: '#E5484D' } as const;

const f1 = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(1));
const f2 = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(2));

export default function GazeCheckScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [calibrating, setCalibrating] = useState(false);
  const [calPhase, setCalPhase] = useState<CalibrationPhase>('intro');
  const cameraRef = useRef<CameraRef>(null);
  // 보정 방식 비교: [새 / 예전] 전환 + 보정할 때마다 기록
  const [timing, setTiming] = useState<CalibrationTimingName>('fast');
  const [runs, setRuns] = useState<RunRow[]>([]);
  const summary = summarizeRuns(runs);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const { photoOutput, modelState, result, lastSample: s, calibration, subscribe, setCalibration } =
    useGazeFocusTracker({ enabled: hasPermission, debug: true, calibrating, cameraRef });

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>카메라 권한이 필요해요.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>권한 요청</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const t = s?.timing;
  const label =
    result?.phase === 'calibrating'
      ? `기준 잡는 중 ${Math.round(result.calibrationProgress * 100)}%`
      : result?.detail === 'staring' || result?.detail === 'skimming'
        ? `${result.detail === 'staring' ? '멍때림' : '훑어보기'} · ${result.reason}`
        : `${STATE_LABEL[result?.state ?? 'away']} · ${result?.reason ?? '-'}`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={!calibrating ? styles.preview : calPhase === 'posture' ? styles.camLarge : styles.camBehind}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device="front"
          isActive
          outputs={[photoOutput]}
          implementationMode="compatible"
        />
        {/* 보정 후: 변환된 시선 위치 (미리보기 영역 비율로 축소해서 표시) */}
        {calibration?.map && result?.screenGaze && (
          <View
            style={[
              styles.gazeDot,
              {
                left: `${Math.min(100, Math.max(0, (result.screenGaze.x / calibration.screen.width) * 100))}%`,
                top: `${Math.min(100, Math.max(0, (result.screenGaze.y / calibration.screen.height) * 100))}%`,
              },
            ]}
          />
        )}
      </View>
      <View style={styles.panel}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>시선추적 확인 (모델: {modelState})</Text>
          <Pressable style={styles.smallBtn} onPress={() => setCalibrating(true)}>
            <Text style={styles.smallBtnText}>보정</Text>
          </Pressable>
        </View>
        <Text style={[styles.state, { color: STATE_COLOR[result?.state ?? 'away'] }]}>{label}</Text>
        <Text style={styles.sub}>
          보정: {calibration ? `${calibration.quality} · 오차 ${f1(calibration.errorCm)}cm · 흔들림 ${f1(calibration.noiseDp)}dp` : '안 함 (자동 기준)'}
        </Text>

        {/* 보정 방식 비교 (같은 자세·밝기에서 번갈아 각 5번 → 오차 중앙값 비교) */}
        <View style={styles.titleRow}>
          <Text style={styles.row}>보정 방식</Text>
          <View style={styles.toggleRow}>
            {(['fast', 'legacy'] as const).map((name) => (
              <Pressable
                key={name}
                style={[styles.smallBtn, timing !== name && styles.smallBtnOff]}
                onPress={() => setTiming(name)}
              >
                <Text style={styles.smallBtnText}>{TIMING_LABEL[name]}</Text>
              </Pressable>
            ))}
            {runs.length > 0 && (
              <Pressable style={[styles.smallBtn, styles.smallBtnOff]} onPress={() => setRuns([])}>
                <Text style={styles.smallBtnText}>기록 지우기</Text>
              </Pressable>
            )}
          </View>
        </View>
        {(['fast', 'legacy'] as const).map((name) => (
          <Text key={name} style={styles.sub}>
            {TIMING_LABEL[name]}: {summary[name].count}회 · 오차 중앙값 {f1(summary[name].medianErrorCm)}cm · 실패{' '}
            {summary[name].failed} · 시간 중앙값 {summary[name].medianDurationMs == null ? '-' : f1(summary[name].medianDurationMs / 1000)}초
          </Text>
        ))}
        {runs.slice(-4).map((r, i) => (
          <Text key={i} style={styles.sub}>
            [{TIMING_LABEL[r.timing]}] {f1(r.durationMs / 1000)}초 · 오차 {f1(r.errorCm)}cm · 흔들림 {f1(r.noiseDp)}dp · {r.quality} ·
            점별 샘플 {r.perPointSamples.join('/')} · 빠진 점 {r.droppedPoints} · 위 여백 {Math.round(r.areaTopGap)}dp
          </Text>
        ))}
        <View style={styles.eyes}>
          {s?.debugEyes ? (
            <>
              <NitroImage image={s.debugEyes.left} style={styles.eye} />
              <NitroImage image={s.debugEyes.right} style={styles.eye} />
            </>
          ) : (
            <Text style={styles.sub}>눈 이미지 없음</Text>
          )}
          <View style={styles.gazeBox}>
            <Text style={styles.gazeLabel}>모델 출력 (cm)</Text>
            <Text style={styles.gaze}>x {f1(s?.gaze?.x)}</Text>
            <Text style={styles.gaze}>y {f1(s?.gaze?.y)}</Text>
          </View>
        </View>
        <Text style={styles.row}>
          얼굴 {s?.faceDetected ? '✅' : '❌'} · yaw {f1(s?.yaw)} · pitch {f1(s?.pitch)} · roll {f1(s?.roll)}
        </Text>
        <Text style={styles.row}>
          눈 뜸 좌 {f2(s?.leftEyeOpen)} · 우 {f2(s?.rightEyeOpen)} · 얼굴 크기 {f2(s?.faceWidthRatio)} · 눈 밝기 {f1(s?.eyeBrightness)}
        </Text>
        <Text style={styles.sub}>
          시간(ms) 촬영 {t?.capture ?? '-'} · 검출 {t?.detect ?? '-'} · 자르기 {t?.crop ?? '-'} · 추론 {t?.infer ?? '-'} · 총{' '}
          {t?.total ?? '-'}
        </Text>
        {s?.error && <Text style={styles.err}>오류: {s.error}</Text>}
      </View>

      {calibrating && (
        <GazeCalibrationOverlay
          subscribe={subscribe}
          onPhaseChange={setCalPhase}
          timing={timing}
          onStats={(st, cal) =>
            setRuns((prev) => [
              ...prev,
              { ...st, errorCm: cal.errorCm, noiseDp: cal.noiseDp, quality: cal.quality },
            ])
          }
          onDone={(cal) => {
            setCalibration(cal);
            setCalibrating(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  msg: { fontSize: 15, color: '#1F2233' },
  btn: { backgroundColor: '#6B7BFF', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  preview: { flex: 1, zIndex: 20 },
  camLarge: {
    position: 'absolute', top: (CALIBRATION_PREVIEW_SPACE - 240) / 2, alignSelf: 'center', width: 240, height: 240,
    borderRadius: 120, overflow: 'hidden', borderWidth: 4, borderColor: '#6B7BFF', zIndex: 20,
  },
  camBehind: {
    position: 'absolute', top: 0, left: 0, width: GAZE_CONFIG.SNAPSHOT_VIEW.width, height: GAZE_CONFIG.SNAPSHOT_VIEW.height,
    opacity: 0, zIndex: -1,
  },
  gazeDot: { position: 'absolute', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 8, backgroundColor: '#E5484D' },
  panel: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '800', color: '#1F2233' },
  smallBtn: { backgroundColor: '#EEF0FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  smallBtnText: { color: '#6B7BFF', fontWeight: '700', fontSize: 12 },
  smallBtnOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EEF0FF' },
  toggleRow: { flexDirection: 'row', gap: 6 },
  state: { fontSize: 17, fontWeight: '800' },
  eyes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { width: 96, height: 96, borderRadius: 6, backgroundColor: '#ddd' },
  gazeBox: { marginLeft: 8 },
  gazeLabel: { fontSize: 11, color: '#6E7191' },
  gaze: { fontSize: 18, fontWeight: '700', color: '#1F2233' },
  row: { fontSize: 13, color: '#1F2233' },
  sub: { fontSize: 11, color: '#6E7191' },
  err: { fontSize: 12, color: '#E5484D' },
});
