/**
 * 0.5초마다 [사진 1장 → 얼굴·눈 찾기 → 눈 자르기 → 모델 추론] 을 실행하는 훅
 *
 * 흐름
 *   capturePhoto (셔터음 X)  →  toImageAsync (방향·좌우반전 자동 보정)  →  긴 변 640 이하로 축소
 *   → 임시 jpg 저장 → ML Kit 얼굴 검출(눈 윤곽, 머리 각도, 눈 뜸 확률) → 임시 파일 즉시 삭제
 *   → 눈 2개 자르기(eyeCrop.ts) → TFLite 추론 → GazeSample 1개를 onSample 로 전달
 *
 * 특징
 *   - 이전 검사가 안 끝났으면 이번 차례는 건너뜀 (밀림/병목 없음)
 *   - 앱이 백그라운드로 가면 자동 정지
 *   - 모델이 없거나 로드 실패해도 머리 각도·눈 뜸 확률은 계속 전달 (gaze=null)
 *   - 사진은 메모리에서만 처리하고 저장·전송하지 않음
 *
 * 사용: const { photoOutput, modelState } = useGazeSampler({ enabled, onSample })
 *       <Camera device="front" isActive outputs={[photoOutput]} />
 */
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import type { Image } from 'react-native-nitro-image';
import { usePhotoOutput } from 'react-native-vision-camera';
import { useImageFaceDetector } from 'react-native-vision-camera-face-detector';

import { cropEye, planEyeCrops } from './eyeCrop';
import { GAZE_CONFIG } from './gazeConfig';

export interface GazeSample {
  timestamp: number;
  faceDetected: boolean;
  /** 머리 좌우 / 상하 / 기울기 (도) */
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  /** 눈 뜸 확률 0~1 (사람 기준 왼눈/오른눈) */
  leftEyeOpen: number | null;
  rightEyeOpen: number | null;
  /** 얼굴 폭 / 사진 폭 (0~1). 거리 확인용 — 클수록 가까움 */
  faceWidthRatio: number | null;
  /** 잘린 눈 이미지 평균 밝기 (0~255). 조명 확인용 */
  eyeBrightness: number | null;
  /** 모델이 예측한 시선 위치 (cm, 카메라 기준). 모델 없음/눈 자르기 실패 시 null */
  gaze: { x: number; y: number } | null;
  /** 단계별 시간 (ms) */
  timing: { capture: number; detect: number; crop: number; infer: number; total: number };
  /** debug=true 일 때만: 잘라 낸 눈 이미지 (모델 입력 0 / 1) */
  debugEyes?: { left: Image; right: Image };
  error?: string;
}

interface Options {
  enabled: boolean;
  onSample: (s: GazeSample) => void;
  debug?: boolean;
  intervalMs?: number;
}

export function useGazeSampler({ enabled, onSample, debug = false, intervalMs = GAZE_CONFIG.SAMPLE_INTERVAL_MS }: Options) {
  const photoOutput = usePhotoOutput({
    targetResolution: GAZE_CONFIG.PHOTO_TARGET,
    containerFormat: 'jpeg',
    quality: 0.8,
  });
  const detector = useImageFaceDetector({
    performanceMode: 'fast',
    runContours: true,
    runClassifications: true,
    minFaceSize: GAZE_CONFIG.MIN_FACE_SIZE,
  });
  const tflite = useTensorflowModel(require('../../assets/models/gaze.tflite'), []);

  // 콜백·모델은 ref로 들고 있어서 interval 을 다시 만들지 않음
  const onSampleRef = useRef(onSample);
  onSampleRef.current = onSample;
  const modelRef = useRef(tflite.model);
  modelRef.current = tflite.model;

  const busyRef = useRef(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !appActive) return;

    const tick = async () => {
      if (busyRef.current) return; // 이전 검사 진행 중 → 이번 차례 건너뜀
      busyRef.current = true;
      const t0 = Date.now();
      const timing = { capture: 0, detect: 0, crop: 0, infer: 0, total: 0 };
      const base: GazeSample = {
        timestamp: t0, faceDetected: false, yaw: null, pitch: null, roll: null,
        leftEyeOpen: null, rightEyeOpen: null, faceWidthRatio: null, eyeBrightness: null, gaze: null, timing,
      };
      const toDispose: Image[] = [];
      let tmpPath: string | null = null;

      try {
        // 1) 사진 → 방향 보정된 Image → 축소
        const photo = await photoOutput.capturePhoto({ enableShutterSound: false, flashMode: 'off' }, {});
        let image = await photo.toImageAsync();
        photo.dispose();
        const longSide = Math.max(image.width, image.height);
        if (longSide > GAZE_CONFIG.MAX_DETECT_SIDE) {
          const k = GAZE_CONFIG.MAX_DETECT_SIDE / longSide;
          const small = await image.resizeAsync(Math.round(image.width * k), Math.round(image.height * k));
          image.dispose();
          image = small;
        }
        toDispose.push(image);
        const t1 = Date.now();
        timing.capture = t1 - t0;

        // 2) 얼굴 검출 (검출기가 파일 경로만 받아서 임시 저장 → 바로 삭제)
        tmpPath = await image.saveToTemporaryFileAsync('jpg', 90);
        const faces = detector.detectFaces(`file://${tmpPath}`);
        const t2 = Date.now();
        timing.detect = t2 - t1;

        const face = faces[0];
        if (!face) {
          onSampleRef.current({ ...base, timing: { ...timing, total: Date.now() - t0 } });
          return;
        }
        const sample: GazeSample = {
          ...base,
          faceDetected: true,
          yaw: face.yawAngle,
          pitch: face.pitchAngle,
          roll: face.rollAngle,
          leftEyeOpen: face.leftEyeOpenProbability ?? null,
          rightEyeOpen: face.rightEyeOpenProbability ?? null,
          faceWidthRatio: face.bounds.width / image.width,
        };

        // 3) 눈 자르기
        const eyeA = face.contours?.LEFT_EYE ?? [];
        const eyeB = face.contours?.RIGHT_EYE ?? [];
        const plan = planEyeCrops(eyeA, eyeB, image.width, image.height);
        if (!plan) {
          onSampleRef.current({ ...sample, error: '눈 윤곽 부족', timing: { ...timing, total: Date.now() - t0 } });
          return;
        }
        const L = await cropEye(image, plan.left, plan.tiltDeg);
        const R = await cropEye(image, plan.right, plan.tiltDeg);
        const t3 = Date.now();
        timing.crop = t3 - t2;
        sample.eyeBrightness = meanOf(L.tensor, R.tensor);

        // 4) 모델 추론 (모델이 아직 없으면 건너뜀)
        const model = modelRef.current;
        if (model) {
          const out = await model.run([L.tensor.buffer as ArrayBuffer, R.tensor.buffer as ArrayBuffer]);
          const xy = new Float32Array(out[0]);
          sample.gaze = { x: xy[0], y: xy[1] };
        }
        timing.infer = Date.now() - t3;

        if (debug) {
          sample.debugEyes = { left: L.eye, right: R.eye };
        } else {
          toDispose.push(L.eye, R.eye);
        }
        onSampleRef.current({ ...sample, timing: { ...timing, total: Date.now() - t0 } });
      } catch (e) {
        onSampleRef.current({ ...base, error: String(e), timing: { ...timing, total: Date.now() - t0 } });
      } finally {
        if (tmpPath) {
          try {
            new File(`file://${tmpPath}`).delete();
          } catch {
            // 임시 폴더라 OS가 나중에 지움
          }
        }
        toDispose.forEach((img) => img.dispose());
        busyRef.current = false;
      }
    };

    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, appActive, intervalMs, debug, photoOutput, detector]);

  return { photoOutput, modelState: tflite.state };
}

/** 두 눈 이미지 전체 픽셀 평균 밝기 */
function meanOf(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i];
  for (let i = 0; i < b.length; i++) sum += b[i];
  return sum / (a.length + b.length);
}
