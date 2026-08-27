import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const CAPTURE_INTERVAL_MS = 1000; // 0.5~1초 간격 샘플링
const FOCUS_API_URL = process.env.EXPO_PUBLIC_GAZE_API_URL ?? 'http://localhost:8000';
// 시선추적이랑 같은 서버(포트 8000)를 쓰니 환경변수 이름은 그대로 재사용

interface Props {
  sessionId: string;
  onStatusChange: (status: 'reading' | 'distracted') => void;
}

export function FocusYoloCameraOverlay({ sessionId, onStatusChange }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
      return;
    }

    // 세션 시작 — 이 사람 전용 FocusEngine을 서버에 준비시킴
    const form = new FormData();
    form.append('session_id', sessionId);
    fetch(`${FOCUS_API_URL}/focus/session/start`, { method: 'POST', body: form }).catch(() => {});

    intervalRef.current = setInterval(async () => {
      if (isCapturingRef.current || !cameraRef.current) return;
      isCapturingRef.current = true;

      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
        if (!photo?.uri) return;

        const frameForm = new FormData();
        frameForm.append('session_id', sessionId);
        // @ts-ignore RN FormData는 이 형태의 파일 객체를 허용함
        frameForm.append('image', { uri: photo.uri, name: 'frame.jpg', type: 'image/jpeg' });

        const res = await fetch(`${FOCUS_API_URL}/focus/frame`, { method: 'POST', body: frameForm });
        const data = await res.json();
        if (data.error) return; // 이번 프레임만 건너뜀

        // alert=true -> 10초 넘게 페이지가 안 넘어감 (책/손이 안 보이는 경우도 결국 이쪽으로 수렴)
        onStatusChange(data.alert ? 'distracted' : 'reading');
      } catch {
        // 네트워크 실패 — 이번 프레임만 건너뜀, 다음 타이머에 재시도
      } finally {
        isCapturingRef.current = false;
      }
    }, CAPTURE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const endForm = new FormData();
      endForm.append('session_id', sessionId);
      fetch(`${FOCUS_API_URL}/focus/session/end`, { method: 'POST', body: endForm }).catch(() => {});
    };
  }, [permission?.granted, sessionId]);

  if (!permission?.granted) {
    return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;
  }

  return <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="front" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C252C' },
});