/**
 * 집중 버킷 기록 훅 (FocusBucketBuilder를 화면에서 쓰기 쉽게 감싼 것)
 * 함수 이름은 기존과 같음 → read.tsx 수정 없이 교체 가능
 */
import { useCallback, useRef } from 'react';
import { FocusBucketBuilder } from '../lib/focus/focusBucketBuilder';
import type { FocusFrameSample, FocusSampleInput } from '../lib/types/ebook';

export function useFocusBucketRecorder() {
  // useRef: 화면이 다시 그려져도 같은 builder를 계속 사용 (상태가 초기화되지 않음)
  const builder = useRef(new FocusBucketBuilder());

  const pushFrame = useCallback((frame: FocusFrameSample) => builder.current.push(frame), []);
  const flushCurrentBucket = useCallback(() => builder.current.flush(Date.now()), []);
  const drainCompletedBuckets = useCallback((): FocusSampleInput[] => builder.current.drain(), []);
  const requeueBuckets = useCallback((samples: FocusSampleInput[]) => builder.current.requeue(samples), []);

  return { pushFrame, flushCurrentBucket, drainCompletedBuckets, requeueBuckets };
}
