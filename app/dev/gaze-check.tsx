/**
 * [임시] 시선추적 앱 내부 추론 — 확인 화면 (3-1 사진→눈 픽셀, 3-2 눈 자르기, 2 모델 추론)
 *
 * 확인 항목
 *  ① 카메라 미리보기
 *  ② 얼굴·머리 각도·눈 뜸 확률이 나오는가
 *  ③ 잘린 눈 2장이 학습 데이터처럼 보이는가  ← 가장 중요
 *       - 눈이 가운데, 수평, 눈썹 일부 포함 / 왼쪽 칸 = 사진에서 왼쪽에 보이는 눈
 *       - 고개를 기울여도 눈은 수평이어야 함 (더 기울면 gazeConfig 의 ROTATE_CLOCKWISE_POSITIVE 반대로)
 *  ④ 모델 결과(cm)가 시선 따라 바뀌는가 (위/아래/좌/우 보기)
 *  ⑤ 1회 총 시간 (목표 500ms 이하)
 *
 * 접속: router.push('/dev/gaze-check')  /  확인 끝나면 삭제
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NitroImage } from 'react-native-nitro-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

import { type GazeSample, useGazeSampler } from '../../lib/gaze/useGazeSampler';

const f1 = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(1));
const f2 = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(2));

export default function GazeCheckScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [s, setS] = useState<GazeSample | null>(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const onSample = useCallback((next: GazeSample) => {
    setS((prev) => {
      // 이전 디버그 눈 이미지는 메모리 해제
      prev?.debugEyes?.left.dispose();
      prev?.debugEyes?.right.dispose();
      return next;
    });
  }, []);

  const { photoOutput, modelState } = useGazeSampler({ enabled: hasPermission, onSample, debug: true });

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
  return (
    <SafeAreaView style={styles.screen}>
      <Camera style={styles.preview} device="front" isActive outputs={[photoOutput]} />
      <View style={styles.panel}>
        <Text style={styles.title}>시선추적 확인 (모델: {modelState})</Text>
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
            <Text style={styles.gazeLabel}>시선 (cm)</Text>
            <Text style={styles.gaze}>x {f1(s?.gaze?.x)}</Text>
            <Text style={styles.gaze}>y {f1(s?.gaze?.y)}</Text>
          </View>
        </View>
        <Text style={styles.row}>
          얼굴 {s?.faceDetected ? '✅' : '❌'} · yaw {f1(s?.yaw)} · pitch {f1(s?.pitch)} · roll {f1(s?.roll)}
        </Text>
        <Text style={styles.row}>
          눈 뜸 좌 {f2(s?.leftEyeOpen)} · 우 {f2(s?.rightEyeOpen)}
        </Text>
        <Text style={styles.sub}>
          시간(ms) 촬영 {t?.capture ?? '-'} · 검출 {t?.detect ?? '-'} · 자르기 {t?.crop ?? '-'} · 추론 {t?.infer ?? '-'} · 총{' '}
          {t?.total ?? '-'}
        </Text>
        {s?.error && <Text style={styles.err}>오류: {s.error}</Text>}
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
  title: { fontSize: 16, fontWeight: '800', color: '#1F2233' },
  eyes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { width: 96, height: 96, borderRadius: 6, backgroundColor: '#ddd' },
  gazeBox: { marginLeft: 8 },
  gazeLabel: { fontSize: 11, color: '#6E7191' },
  gaze: { fontSize: 18, fontWeight: '700', color: '#1F2233' },
  row: { fontSize: 13, color: '#1F2233' },
  sub: { fontSize: 11, color: '#6E7191' },
  err: { fontSize: 12, color: '#E5484D' },
});
