/**
 * [임시] 시선추적 앱 내부 추론 — 1단계 기술 확인 화면 (VisionCamera v5 + face-detector v2)
 *
 * 방식: useFaceDetectorOutput
 *  - 카메라가 ML Kit 얼굴 검출을 알아서 실행하고, 결과(Face[])만 JS로 넘겨줌
 *  - 프레임 처리 엔진(worklets)이 필요 없어서 Reanimated와 충돌 없음
 *
 * 확인 항목
 *  ① 앞 카메라 미리보기가 뜨는가
 *  ② 얼굴 검출 결과가 계속 들어오는가
 *  ③ 기존 Reanimated 화면이 정상인가 (이 화면에서 나간 뒤 확인)
 *  ④ 눈 윤곽 점이 오는가 + 초당 5회 이상인가
 *
 * 접속: router.push('/dev/gaze-check')  /  확인 끝나면 삭제
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraPermission } from 'react-native-vision-camera';
import { useFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';

/** 화면에 보여 줄 측정값 (Face 객체에서 숫자만 꺼내 둠) */
type Stats = {
  faces: number;
  frameW: number;
  frameH: number;
  leftEyePts: number; // 왼쪽 눈 윤곽 점 개수 (ML Kit 기준 16개 예상)
  rightEyePts: number;
  yaw: number; // 머리 좌우 회전 (도)
  pitch: number; // 머리 상하
  roll: number; // 머리 기울기
  leftOpen: number | null; // 눈 뜸 확률 0~1
};

const EMPTY: Stats = {
  faces: 0, frameW: 0, frameH: 0, leftEyePts: 0, rightEyePts: 0,
  yaw: 0, pitch: 0, roll: 0, leftOpen: null,
};

export default function GazeCheckScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();

  const [stats, setStats] = useState<Stats>(EMPTY);
  const [rate, setRate] = useState(0); // 초당 결과 수신 횟수
  const [error, setError] = useState<string | null>(null);

  // 결과는 아주 자주 오므로 ref에 저장만 하고, 화면 갱신은 0.5초마다
  const latestRef = useRef<Stats>(EMPTY);
  const countRef = useRef(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // 0.5초마다 화면 갱신 + 1초마다 초당 횟수 계산
  useEffect(() => {
    let tick = 0;
    const t = setInterval(() => {
      setStats(latestRef.current);
      tick += 1;
      if (tick % 2 === 0) {
        setRate(countRef.current);
        countRef.current = 0;
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  // 얼굴 검출 결과가 올 때마다 실행됨
  const onFacesDetected = useCallback((faces: Face[]) => {
    countRef.current += 1;
    const f = faces[0];
    latestRef.current = f
      ? {
          faces: faces.length,
          frameW: f.frameWidth,
          frameH: f.frameHeight,
          leftEyePts: f.contours?.LEFT_EYE?.length ?? 0,
          rightEyePts: f.contours?.RIGHT_EYE?.length ?? 0,
          yaw: f.yawAngle,
          pitch: f.pitchAngle,
          roll: f.rollAngle,
          leftOpen: f.leftEyeOpenProbability ?? null,
        }
      : { ...EMPTY };
  }, []);

  const onError = useCallback((e: Error) => setError(e.message), []);

  // 카메라에 붙일 "얼굴 검출 출력"
  const faceOutput = useFaceDetectorOutput({
    cameraFacing: 'front',
    performanceMode: 'fast',
    runContours: true, // 눈 윤곽 점
    runClassifications: true, // 눈 뜸 확률
    runLandmarks: false,
    autoMode: false, // 프레임 좌표 그대로 받기 (2단계 눈 자르기용)
    outputResolution: 'preview',
    onFacesDetected,
    onError,
  });

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

  const pass = (ok: boolean) => (ok ? '✅' : '❌');

  return (
    <SafeAreaView style={styles.screen}>
      <Camera style={styles.preview} device="front" isActive outputs={[faceOutput]} />
      <View style={styles.panel}>
        <Text style={styles.title}>시선추적 1단계 기술 확인 (v5)</Text>
        <Text style={styles.row}>{pass(true)} ① 카메라 미리보기</Text>
        <Text style={styles.row}>{pass(rate > 0)} ② 검출 결과 수신</Text>
        <Text style={styles.row}>{pass(rate >= 5)} ④ 초당 {rate}회 (목표 5회)</Text>
        <Text style={styles.row}>
          {pass(stats.leftEyePts > 0 && stats.rightEyePts > 0)} ④ 눈 윤곽 점 좌 {stats.leftEyePts} · 우 {stats.rightEyePts}
        </Text>
        <Text style={styles.sub}>
          얼굴 {stats.faces}개 · 프레임 {stats.frameW}×{stats.frameH}
        </Text>
        <Text style={styles.sub}>
          yaw {stats.yaw.toFixed(1)} · pitch {stats.pitch.toFixed(1)} · roll {stats.roll.toFixed(1)} · 눈 뜸{' '}
          {stats.leftOpen == null ? '-' : stats.leftOpen.toFixed(2)}
        </Text>
        {error && <Text style={styles.err}>오류: {error}</Text>}
        <Text style={styles.hint}>③은 이 화면에서 나간 뒤 기존 애니메이션 화면이 정상인지로 확인</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  msg: { fontSize: 15, color: '#1F2233' },
  btn: { backgroundColor: '#6B7BFF', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  preview: { flex: 1 },
  panel: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#1F2233', marginBottom: 4 },
  row: { fontSize: 14, color: '#1F2233' },
  sub: { fontSize: 12, color: '#6E7191' },
  err: { fontSize: 12, color: '#E5484D' },
  hint: { fontSize: 11, color: '#A0A3BD', marginTop: 4 },
});