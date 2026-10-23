/**
 * 시선추적 → 집중 판정 → (선택) 버킷 기록기 연결 훅
 *
 *   useGazeSampler (0.5초마다 GazeSample)
 *        ↓
 *   FocusJudge (보정 5초 → focused / unfocused / away)
 *        ↓
 *   onFrame({ timestamp, state, yaw, pitch })  → useFocusBucketRecorder 의 pushFrame
 *
 * 화면은 판정이 바뀔 때만 다시 그림 (debug=true 면 매 샘플)
 */
import { useCallback, useRef, useState } from 'react';

import { FocusJudge, type JudgeResult } from '../lib/gaze/focusJudge';
import { type GazeSample, useGazeSampler } from '../lib/gaze/useGazeSampler';
import type { FocusFrameSample } from '../lib/types/ebook';

interface Options {
  enabled: boolean;
  /** 판정 결과 1개마다 호출 → 보통 recorder.pushFrame 을 넣음 */
  onFrame?: (frame: FocusFrameSample) => void;
  /** 확인 화면용: 매 샘플마다 화면 갱신 + 잘린 눈 이미지 포함 */
  debug?: boolean;
}

export function useGazeFocusTracker({ enabled, onFrame, debug = false }: Options) {
  const judgeRef = useRef(new FocusJudge());
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [result, setResult] = useState<JudgeResult | null>(null);
  const [lastSample, setLastSample] = useState<GazeSample | null>(null);

  const onSample = useCallback(
    (s: GazeSample) => {
      // 촬영 자체가 실패한 샘플(카메라 준비 전 등)은 판정하지 않음 → "자리 비움"으로 잘못 기록되는 것 방지
      // (계속 실패하면 프레임이 안 들어와서 버킷 기록기가 3초 뒤부터 away 로 처리함)
      if (s.error && !s.faceDetected) {
        if (debug) setLastSample(s);
        return;
      }
      const r = judgeRef.current.judge(s);
      onFrameRef.current?.({
        timestamp: s.timestamp,
        state: r.state,
        yaw: s.yaw ?? undefined,
        pitch: s.pitch ?? undefined,
      });

      if (debug) {
        setLastSample((prev) => {
          prev?.debugEyes?.left.dispose();
          prev?.debugEyes?.right.dispose();
          return s;
        });
        setResult(r);
      } else {
        // 판정·단계·보정 진행률이 바뀔 때만 화면 갱신
        setResult((prev) =>
          prev &&
          prev.state === r.state &&
          prev.phase === r.phase &&
          Math.abs(prev.calibrationProgress - r.calibrationProgress) < 0.1
            ? prev
            : r,
        );
      }
    },
    [debug],
  );

  const { photoOutput, modelState } = useGazeSampler({ enabled, onSample, debug });

  const recalibrate = useCallback(() => {
    judgeRef.current.recalibrate();
    setResult(null);
  }, []);

  return {
    /** <Camera outputs={[photoOutput]} /> 에 넣기 */
    photoOutput,
    /** 'loading' | 'loaded' | 'error' — error 여도 고개 기준 판정은 동작 */
    modelState,
    /** 최신 판정 (null = 아직 샘플 없음) */
    result,
    /** debug 모드에서만 채워짐 */
    lastSample,
    recalibrate,
    baseline: judgeRef.current.baseline,
  };
}
