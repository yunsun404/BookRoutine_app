import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FocusFrameSample } from '../lib/types/ebook';

const CAPTURE_INTERVAL_MS = 800;
const BOX_MARGIN_PX = 30;
const GAZE_API_URL = process.env.EXPO_PUBLIC_GAZE_API_URL ?? 'http://localhost:8000';

interface BoxLayout { x: number; y: number; width: number; height: number; }
interface CalibrationPoint { cmX: number; cmY: number; }
interface CalibrationMap { scaleX: number; offsetX: number; scaleY: number; offsetY: number; }

interface Props {
  boxLayout: BoxLayout | null;
  onFrame: (frame: FocusFrameSample) => void;
}

type Phase = 'permission' | 'calib-topleft' | 'calib-bottomright' | 'tracking';

export function FocusCameraOverlay({ boxLayout, onFrame }: Props) {
  const [phase, setPhase] = useState<Phase>('permission');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // expo-camera(네이티브 전용) 대신, 브라우저 표준 <video>/<canvas>를 직접 다룸
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const calibMapRef = useRef<CalibrationMap | null>(null);
  const topLeftRef = useRef<CalibrationPoint | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCapturingRef = useRef(false);

  // 웹캠 스트림 시작
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        video.width = 320;
        video.height = 240;
        await video.play();
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        canvasRef.current = canvas;

        setPhase('calib-topleft');
      } catch {
        setPermissionError('카메라 권한을 허용해주세요.');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 현재 비디오 프레임 한 장을 JPEG로 캡처
  const captureFrameBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
    });
  }, []);

  const captureAndPredict = useCallback(async (): Promise<{ gaze_x_cm: number; gaze_y_cm: number } | null> => {
    try {
      const blob = await captureFrameBlob();
      if (!blob) return null;

      const form = new FormData();
      form.append('image', blob, 'frame.jpg');

      const res = await fetch(`${GAZE_API_URL}/gaze/predict`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) return null; // 얼굴 미검출
      return data;
    } catch {
      return null; // 서버 호출 실패 — 이 프레임만 건너뜀
    }
  }, [captureFrameBlob]);

  const handleCalibTopLeft = async () => {
    const result = await captureAndPredict();
    if (!result) return;
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
      setPhase('calib-topleft'); // 두 지점 차이가 너무 작으면 처음부터 다시
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
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;

      try {
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
      } finally {
        isCapturingRef.current = false;
      }
    }, CAPTURE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, boxLayout, captureAndPredict, onFrame]);

  if (permissionError) {
    return <View style={styles.overlay}><Text style={styles.text}>{permissionError}</Text></View>;
  }
  if (phase === 'permission') {
    return <View style={styles.overlay}><Text style={styles.text}>카메라 준비 중...</Text></View>;
  }

  return (
    <>
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
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24,
  },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  button: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { fontWeight: '600' },
});