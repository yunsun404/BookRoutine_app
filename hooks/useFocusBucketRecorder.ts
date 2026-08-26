import { useCallback, useRef } from 'react';
import { FocusFrameSample, FocusSampleInput } from '../lib/types/ebook';

const BUCKET_MS = 8000;
const NO_FACE_INTERRUPTION_THRESHOLD = 0.3;

interface BucketAccumulator {
  bucketStart: number;
  frames: FocusFrameSample[];
}

export function useFocusBucketRecorder() {
  const currentBucket = useRef<BucketAccumulator | null>(null);
  const completedBuckets = useRef<FocusSampleInput[]>([]);

  const pushFrame = useCallback((frame: FocusFrameSample) => {
    if (!currentBucket.current) {
      currentBucket.current = { bucketStart: frame.timestamp, frames: [] };
    }
    const bucket = currentBucket.current;
    bucket.frames.push(frame);

    if (frame.timestamp - bucket.bucketStart >= BUCKET_MS) {
      completedBuckets.current.push(summarizeBucket(bucket, frame.timestamp));
      currentBucket.current = null;
    }
  }, []);

  const flushCurrentBucket = useCallback(() => {
    const bucket = currentBucket.current;
    if (bucket && bucket.frames.length > 0) {
      const last = bucket.frames[bucket.frames.length - 1];
      completedBuckets.current.push(summarizeBucket(bucket, last.timestamp));
      currentBucket.current = null;
    }
  }, []);

  const drainCompletedBuckets = useCallback((): FocusSampleInput[] => {
    const drained = completedBuckets.current;
    completedBuckets.current = [];
    return drained;
  }, []);

  return { pushFrame, flushCurrentBucket, drainCompletedBuckets };
}

function summarizeBucket(bucket: BucketAccumulator, endTimestamp: number): FocusSampleInput {
  const { frames } = bucket;
  const focusedCount = frames.filter((f) => f.isFocused).length;
  const noFaceCount = frames.filter((f) => !f.faceDetected).length;
  const yaws = frames.filter((f) => f.yaw !== undefined).map((f) => f.yaw as number);
  const pitches = frames.filter((f) => f.pitch !== undefined).map((f) => f.pitch as number);

  return {
    bucketStart: new Date(bucket.bucketStart).toISOString(),
    bucketEnd: new Date(endTimestamp).toISOString(),
    focusedRatio: frames.length > 0 ? focusedCount / frames.length : 0,
    faceDetected: noFaceCount / frames.length < 0.5,
    interruption: noFaceCount / frames.length >= NO_FACE_INTERRUPTION_THRESHOLD,
    avgYaw: average(yaws),
    avgPitch: average(pitches),
  };
}

function average(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}