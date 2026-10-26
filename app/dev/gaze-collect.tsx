/**
 * [개발용] 폰 시선 데이터 수집 화면 — 모델 미세조정(재학습)용
 *
 * 하는 일
 *   화면에 점 24개(4×6 격자)가 무작위 순서로 2초씩 나타남 → 사용자는 머리를 편하게 두고 눈으로 점을 봄
 *   → 0.25초마다 "앱과 똑같은 방식으로 자른 눈 2장(64×64 PNG)" + "점 위치"를 기기에 저장
 *   → 한 바퀴 약 50초, 2바퀴 권장 (사람당 약 400장)
 *
 * 왜 이렇게 모으나
 *   - 학습 때(MediaPipe)와 앱(ML Kit)의 눈 자르는 방식 차이를 없애려면 "앱에서 자른 눈"으로 배워야 함
 *   - 라벨(어디를 봤는지)이 점 위치로 자동·정확하게 붙음 (영상 촬영 후 손으로 라벨링할 필요 없음)
 *
 * 저장 위치: 앱 내부 저장소 files/gaze-data/<참가자>_<시각>/  (left/*.png, right/*.png, labels.csv)
 * 꺼내기   : PC에서  adb exec-out run-as com.bookroutine.app tar -cf - files/gaze-data > gaze-data.tar
 * 개인정보 : 얼굴 전체가 아닌 눈 부분(64×64)만 저장. 참가자 동의를 받고 수집할 것
 *
 * 접속: router.push('/dev/gaze-collect')
 */
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraPermission } from 'react-native-vision-camera';

import { GAZE_CONFIG } from '../../lib/gaze/gazeConfig';
import { type GazeSample, useGazeSampler } from '../../lib/gaze/useGazeSampler';

const COLS = 4;
const ROWS = 6;
const INSET = 0.08; // 가장자리에서 8% 안쪽
const DOT_MS = 2_000;
const SETTLE_MS = 600; // 점이 나타나고 이 시간 이후 값만 저장 (눈이 이동하는 중인 값 제외)
const INTERVAL_MS = 250;

type Target = { x: number; y: number };
type Row = string[];

const HEADER = [
  'sample_id', 'left_eye_path', 'right_eye_path', 'group_id',
  'target_x_dp', 'target_y_dp', 'screen_w_dp', 'screen_h_dp',
  'yaw', 'pitch', 'face_ratio', 'model_x_cm', 'model_y_cm', 'timestamp',
];

function makeTargets(w: number, h: number): Target[] {
  const pts: Target[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pts.push({
        x: w * INSET + (w * (1 - 2 * INSET) * c) / (COLS - 1),
        y: h * INSET + (h * (1 - 2 * INSET) * r) / (ROWS - 1),
      });
    }
  }
  // 무작위 순서 (순서에 따른 습관이 학습되지 않게)
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

const stamp = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16).replace(/[-:T]/g, '');
const fsPath = (d: Directory) => d.uri.replace(/^file:\/\//, '').replace(/\/$/, '');

export default function GazeCollectScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [participant, setParticipant] = useState('p01');
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState(0);
  const [msg, setMsg] = useState('');

  const cameraRef = useRef<CameraRef>(null);
  const sessionRef = useRef<{ dir: Directory; group: string } | null>(null);
  const rowsRef = useRef<Row[]>([]);
  const currentRef = useRef<{ target: Target; shownAt: number } | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const writeCsv = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const text = [HEADER, ...rowsRef.current].map((r) => r.join(',')).join('\n') + '\n';
    const f = new File(s.dir, 'labels.csv');
    f.create({ overwrite: true });
    f.write(text);
  }, []);

  const onSample = useCallback(
    async (s: GazeSample) => {
      const cur = currentRef.current;
      const session = sessionRef.current;
      const eyes = s.debugEyes;
      try {
        if (!cur || !session || !size || !eyes || !s.faceDetected) return;
        if (s.timestamp - cur.shownAt < SETTLE_MS) return;
        const n = String(counterRef.current++).padStart(6, '0');
        const root = fsPath(session.dir);
        await eyes.left.saveToFileAsync(`${root}/left/${n}.png`, 'png');
        await eyes.right.saveToFileAsync(`${root}/right/${n}.png`, 'png');
        rowsRef.current.push([
          n, `left/${n}.png`, `right/${n}.png`, session.group,
          cur.target.x.toFixed(1), cur.target.y.toFixed(1), size.width.toFixed(1), size.height.toFixed(1),
          String(s.yaw ?? ''), String(s.pitch ?? ''), String(s.faceWidthRatio ?? ''),
          String(s.gaze?.x ?? ''), String(s.gaze?.y ?? ''), String(s.timestamp),
        ]);
        setSaved(rowsRef.current.length);
      } catch (e) {
        setMsg(`저장 오류: ${String(e)}`);
      } finally {
        eyes?.left.dispose();
        eyes?.right.dispose();
      }
    },
    [size],
  );

  const { photoOutput, modelState } = useGazeSampler({
    enabled: running,
    onSample,
    debug: true,
    intervalMs: INTERVAL_MS,
    cameraRef,
  });

  const start = () => {
    if (!size) return;
    const group = participant.trim() || 'p01';
    const dir = new Directory(Paths.document, 'gaze-data', `${group}_${stamp()}`);
    new Directory(dir, 'left').create({ intermediates: true, idempotent: true });
    new Directory(dir, 'right').create({ intermediates: true, idempotent: true });
    sessionRef.current = { dir, group };
    rowsRef.current = [];
    counterRef.current = 0;
    setSaved(0);
    setMsg('');
    // 2바퀴 (같은 점을 다른 순서로 한 번 더)
    setTargets([...makeTargets(size.width, size.height), ...makeTargets(size.width, size.height)]);
    setIdx(0);
    setRunning(true);
  };

  // 점마다 2초
  useEffect(() => {
    if (!running) return;
    if (idx >= targets.length) {
      currentRef.current = null;
      setRunning(false);
      writeCsv();
      setMsg(`완료: ${rowsRef.current.length}장 저장 → ${sessionRef.current ? fsPath(sessionRef.current.dir) : ''}`);
      return;
    }
    currentRef.current = { target: targets[idx], shownAt: Date.now() };
    const t = setTimeout(() => {
      writeCsv(); // 점마다 중간 저장 (도중에 멈춰도 그때까지는 남음)
      setIdx((i) => i + 1);
    }, DOT_MS);
    return () => clearTimeout(t);
  }, [running, idx, targets, writeCsv]);

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.center}>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>카메라 권한 요청</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dot = running ? targets[idx] : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.area} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        {!running && (
          <View style={styles.panel}>
            <Text style={styles.title}>시선 데이터 수집 (모델: {modelState})</Text>
            <Text style={styles.desc}>
              책을 읽을 때처럼 폰을 들고, 머리는 편하게 둔 채 나타나는 점을 눈으로 따라가 주세요.{'\n'}
              점 48개 × 2초 ≈ 1분 40초. 눈 부분 이미지만 이 기기에 저장돼요.
            </Text>
            <Text style={styles.label}>참가자 ID (사람마다 다르게)</Text>
            <TextInput style={styles.input} value={participant} onChangeText={setParticipant} autoCapitalize="none" />
            <Pressable style={styles.btn} onPress={start} disabled={!size}>
              <Text style={styles.btnText}>수집 시작</Text>
            </Pressable>
            {!!msg && <Text style={styles.msg}>{msg}</Text>}
          </View>
        )}
        {running && (
          <Text style={styles.progress}>
            {idx + 1}/{targets.length} · 저장 {saved}장
          </Text>
        )}
        {dot && <View key={idx} style={[styles.dot, { left: dot.x - 12, top: dot.y - 12 }]} />}
      </View>
      <View style={styles.camBehind} pointerEvents="none">
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device="front"
          isActive
          outputs={[photoOutput]}
          implementationMode="compatible"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFBFD' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  area: { flex: 1, backgroundColor: '#FBFBFD' },
  panel: { padding: 24, gap: 10, marginTop: 40 },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2233' },
  desc: { fontSize: 14, lineHeight: 21, color: '#6E7191' },
  label: { fontSize: 13, fontWeight: '600', color: '#1F2233', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ECECF3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  btn: { backgroundColor: '#6B7BFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  msg: { fontSize: 12, color: '#6E7191' },
  progress: { position: 'absolute', top: 8, alignSelf: 'center', fontSize: 12, color: '#A0A3BD' },
  dot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5484D', borderWidth: 5, borderColor: '#F7C1C1' },
  camBehind: {
    position: 'absolute', top: 0, left: 0, width: GAZE_CONFIG.SNAPSHOT_VIEW.width, height: GAZE_CONFIG.SNAPSHOT_VIEW.height,
    opacity: 0, zIndex: -1,
  },
});
