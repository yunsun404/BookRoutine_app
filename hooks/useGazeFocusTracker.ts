/**
 * 시선추적 → 집중 판정 → (선택) 버킷 기록기 연결 훅 (v2)
 *
 *   useGazeSampler (0.5초마다 GazeSample, 보정 중엔 0.25초)
 *        ├→ subscribe 한 곳 (보정 화면이 원재료를 받아 감)
 *        ↓   (보정 중에는 여기서 멈춤 — 판정·기록 안 함)
 *   FocusJudge (개인 보정 기준 또는 자동 기준 → focused / unfocused / away)
 *        ↓
 *   onFrame({ timestamp, state, detail, yaw, pitch })  → useFocusBucketRecorder 의 pushFrame
 */
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { CameraRef } from 'react-native-vision-camera';

import { FocusJudge, type JudgeResult, type ReaderMode } from '../lib/gaze/focusJudge';
import type { GazeCalibration } from '../lib/gaze/gazeCalibration';
import { GAZE_CONFIG } from '../lib/gaze/gazeConfig';
import { type GazeSample, useGazeSampler } from '../lib/gaze/useGazeSampler';
import type { FocusFrameSample } from '../lib/types/ebook';

interface Options {
  enabled: boolean;
  /** 판정 결과 1개마다 호출 → 보통 recorder.pushFrame 을 넣음 */
  onFrame?: (frame: FocusFrameSample) => void;
  /** true 면 개인 보정 중: 판정·기록은 쉬고 원재료만 subscribe 쪽으로 보냄 (검사 간격도 짧게) */
  calibrating?: boolean;
  /** 확인 화면용: 매 샘플마다 화면 갱신 + 잘린 눈 이미지 포함 */
  debug?: boolean;
  /** <Camera ref={cameraRef}> — 미리보기 캡처(셔터 소리 없음)에 필요 */
  cameraRef?: RefObject<CameraRef | null>;
  /** 읽기 화면 방식 ('scroll' = 세로 스크롤, 'page' = 좌우 페이지). 기본 'scroll' */
  readerMode?: ReaderMode;
}

export function useGazeFocusTracker({
  enabled,
  onFrame,
  calibrating = false,
  debug = false,
  cameraRef,
  readerMode = 'scroll',
}: Options) {
  const judgeRef = useRef(new FocusJudge());

  useEffect(() => {
    judgeRef.current.setReaderMode(readerMode);
  }, [readerMode]);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const calibratingRef = useRef(calibrating);
  calibratingRef.current = calibrating;
  const listenersRef = useRef(new Set<(s: GazeSample) => void>());

  const [result, setResult] = useState<JudgeResult | null>(null);
  const [lastSample, setLastSample] = useState<GazeSample | null>(null);
  const [calibration, setCalibrationState] = useState<GazeCalibration | null>(null);

  const onSample = useCallback(
    (s: GazeSample) => {
      listenersRef.current.forEach((fn) => fn(s));
      if (debug) {
        setLastSample((prev) => {
          if (prev !== s) {
            prev?.debugEyes?.left.dispose();
            prev?.debugEyes?.right.dispose();
          }
          return s;
        });
      }
      if (calibratingRef.current) return;

      // 촬영 자체가 실패한 샘플(카메라 준비 전 등)은 판정하지 않음 → "자리 비움"으로 잘못 기록되는 것 방지
      // (계속 실패하면 프레임이 안 들어와서 버킷 기록기가 3초 뒤부터 away 로 처리함)
      if (s.error && !s.faceDetected) return;

      const r = judgeRef.current.judge(s);
      onFrameRef.current?.({
        timestamp: s.timestamp,
        state: r.state,
        detail: r.detail,
        yaw: s.yaw ?? undefined,
        pitch: s.pitch ?? undefined,
      });

      if (debug) {
        setResult(r);
      } else {
        // 판정·세부 이유·단계·진행률이 바뀔 때만 화면 갱신
        setResult((prev) =>
          prev &&
          prev.state === r.state &&
          prev.detail === r.detail &&
          prev.phase === r.phase &&
          Math.abs(prev.calibrationProgress - r.calibrationProgress) < 0.1
            ? prev
            : r,
        );
      }
    },
    [debug],
  );

  const { photoOutput, modelState } = useGazeSampler({
    enabled,
    onSample,
    debug,
    intervalMs: calibrating ? GAZE_CONFIG.CALIBRATION_INTERVAL_MS : GAZE_CONFIG.SAMPLE_INTERVAL_MS,
    cameraRef,
  });

  /** 원재료(GazeSample) 받기 — 보정 화면용. 반환값을 호출하면 구독 해제 */
  const subscribe = useCallback((fn: (s: GazeSample) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  /** 개인 보정 결과 적용 (null = 보정 건너뜀 → 처음 5초 자동 기준) */
  const setCalibration = useCallback((cal: GazeCalibration | null) => {
    judgeRef.current.setCalibration(cal);
    setCalibrationState(cal);
    setResult(null);
  }, []);

  /** 사용자가 스크롤했음 (멍때림·훑어보기 판단용). offsetY = 스크롤 위치(dp) */
  const notifyScroll = useCallback((offsetY?: number) => judgeRef.current.notifyScroll(Date.now(), offsetY), []);

  /** [페이지 모드] 사용자가 페이지를 넘겼음. chars = 새 페이지 글자 수 (countReadingChars) */
  const notifyPageTurn = useCallback(
    (pageIndex: number, chars: number) => judgeRef.current.notifyPageTurn(Date.now(), pageIndex, chars),
    [],
  );
  /** [페이지 모드] 화면이 페이지를 정했음 (처음 열기·이어 읽기·다시 나누기) — 넘김으로 세지 않음 */
  const setCurrentPage = useCallback(
    (pageIndex: number, chars: number) => judgeRef.current.setCurrentPage(pageIndex, chars),
    [],
  );
  /** [페이지 모드] 읽기 속도 (개발 화면용) */
  const getPageStats = useCallback(() => judgeRef.current.pageStats(Date.now()), []);

  return {
    /** <Camera outputs={[photoOutput]} /> 에 넣기 */
    photoOutput,
    /** 'loading' | 'loaded' | 'error' — error 여도 고개 기준 판정은 동작 */
    modelState,
    /** 최신 판정 (null = 아직 없음) */
    result,
    /** debug 모드에서만 채워짐 */
    lastSample,
    /** 적용된 개인 보정 (null = 자동 기준) */
    calibration,
    subscribe,
    setCalibration,
    notifyScroll,
    notifyPageTurn,
    setCurrentPage,
    getPageStats,
  };
}
