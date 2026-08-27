import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FocusFrameSample } from '../lib/types/ebook';

const CAPTURE_INTERVAL_MS = 800;   // 0.5~1초 간격 샘플링 (매 프레임 다 볼 필요 없음)
const BOX_MARGIN_PX = 30;   // 모델 오차를 감안한 여유 범위
const GAZE_API_URL = process.env.EXPO_PUBLIC_GAZE_API_URL ?? 'http://localhost:8000';

interface BoxLayout { x: number; y: number; width: number; height: number; }
interface CalibrationPoint { cmX: number; cmY: number; }
interface CalibrationMap { scaleX: number; offsetX: number; scaleY: number; offsetY: number; }

interface Props {
  boxLayout: BoxLayout | null; // read.tsx에서 onLayout으로 구한 읽기 영역 좌표
  onFrame: (frame: FocusFrameSample) => void;
}

type Phase = 'permission' | 'calib-topleft' | 'calib-bottomright' | 'tracking';

export function FocusCameraOverlay({ boxLayout, onFrame }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('permission');
  const cameraRef = useRef<CameraView>(null);
  const calibMapRef = useRef<CalibrationMap | null>(null);
  const topLeftRef = useRef<CalibrationPoint | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (permission?.granted) setPhase('calib-topleft');
  }, [permission?.granted]);

  // 사진 한 장 찍어서 파이썬 API에 물어보고 cm 좌표를 받아옴
  const captureAndPredict = useCallback(async (): Promise<{ gaze_x_cm: number; gaze_y_cm: number } | null> => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      if (!photo?.uri) return null;

      const form = new FormData();
      // @ts-ignore RN FormData는 이 형태의 파일 객체를 허용함
      form.append('image', { uri: photo.uri, name: 'frame.jpg', type: 'image/jpeg' });

      const res = await fetch(`${GAZE_API_URL}/predict`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) return null; // 얼굴 미검출
      return data;
    } catch {
      return null; // 서버 호출 실패 — 이 프레임만 건너뜀 (앱이 죽으면 안 됨)
    }
  }, []);

  const handleCalibTopLeft = async () => {
    const result = await captureAndPredict();
    if (!result) return; // 실패하면 버튼이 그대로 남아있어서 다시 누르면 됨
    topLeftRef.current = { cmX: result.gaze_x_cm, cmY: result.gaze_y_cm };
    setPhase('calib-bottomright');
  };

  const handleCalibBottomRight = async () => {
    const result = await captureAndPredict();
    const topLeft = topLeftRef.current;
    if (!result || !topLeft || !boxLayout) return;

    const cmDx = result.gaze_x_cm - topLeft.cmX;
    const cmDy = result.gaze_y_cm - topLeft.cmY;
    if (Math.abs(cmDx) < 0.5 || Math.abs(cmDy) < 0.5) {
      // 두 지점 차이가 너무 작음 — 신뢰할 수 없어서 처음부터 다시
      setPhase('calib-topleft');
      return;
    }

    const scaleX = boxLayout.width / cmDx;
    const scaleY = boxLayout.height / cmDy;
    calibMapRef.current = {
      scaleX,
      offsetX: boxLayout.x - scaleX * topLeft.cmX,
      scaleY,
      offsetY: boxLayout.y - scaleY * topLeft.cmY,
    };
    setPhase('tracking');
  };

  useEffect(() => {
    if (phase !== 'tracking' || !boxLayout || !calibMapRef.current) return;

    intervalRef.current = setInterval(async () => {
      const result = await captureAndPredict();
      const map = calibMapRef.current!;
      const timestamp = Date.now();

      if (!result) {
        onFrame({ timestamp, faceDetected: false, isFocused: false });
        return;
      }

      const px = { x: map.scaleX * result.gaze_x_cm + map.offsetX, y: map.scaleY * result.gaze_y_cm + map.offsetY };
      const isFocused =
        px.x >= boxLayout.x - BOX_MARGIN_PX &&
        px.x <= boxLayout.x + boxLayout.width + BOX_MARGIN_PX &&
        px.y >= boxLayout.y - BOX_MARGIN_PX &&
        px.y <= boxLayout.y + boxLayout.height + BOX_MARGIN_PX;

      onFrame({ timestamp, faceDetected: true, isFocused });
    }, CAPTURE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, boxLayout, captureAndPredict, onFrame]);

  if (!permission) return <ActivityIndicator style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.overlay}>
        <Text style={styles.text}>집중도 측정을 위해{'\n'}카메라 권한이 필요해요</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <CameraView ref={cameraRef} style={styles.hiddenCamera} facing="front" />
      {phase === 'calib-topleft' && (
        <View style={styles.overlay}>
          <Text style={styles.text}>읽기 화면의{'\n'}왼쪽 위를 봐주세요</Text>
          <Pressable style={styles.button} onPress={handleCalibTopLeft}>
            <Text style={styles.buttonText}>지금 보고 있어요</Text>
          </Pressable>
        </View>
      )}
      {phase === 'calib-bottomright' && (
        <View style={styles.overlay}>
          <Text style={styles.text}>이번엔{'\n'}오른쪽 아래를 봐주세요</Text>
          <Pressable style={styles.button} onPress={handleCalibBottomRight}>
            <Text style={styles.buttonText}>지금 보고 있어요</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hiddenCamera: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  center: { padding: 20 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24,
  },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  button: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { fontWeight: '600' },
});

