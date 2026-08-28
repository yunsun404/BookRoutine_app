import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const CAPTURE_INTERVAL_MS = 1000;
const FOCUS_API_URL = process.env.EXPO_PUBLIC_GAZE_API_URL ?? 'http://localhost:8000';

interface Props {
  sessionId: string;
  onStatusChange: (status: 'reading' | 'distracted') => void;
}

export function FocusYoloCameraOverlay({ sessionId, onStatusChange }: Props) {
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureFrameBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
    });
  };

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

        // 세션 시작 — 이 사람 전용 FocusEngine을 서버에 준비시킴
        const startForm = new FormData();
        startForm.append('session_id', sessionId);
        await fetch(`${FOCUS_API_URL}/focus/session/start`, { method: 'POST', body: startForm }).catch(() => {});

        setReady(true);
      } catch {
        setPermissionError('카메라 권한을 허용해주세요.');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);

      const endForm = new FormData();
      endForm.append('session_id', sessionId);
      fetch(`${FOCUS_API_URL}/focus/session/end`, { method: 'POST', body: endForm }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    if (!ready) return;