/**
 * 집중 버킷 만들기 (순수 로직, React와 무관 → 테스트 가능)
 *
 * 하는 일: 1초쯤마다 들어오는 "판단 결과(focused / unfocused / away)"를
 *          30초짜리 버킷으로 모아 백엔드 형식(focusedSec 등)으로 만든다.
 *
 * 핵심 규칙
 *  1. 한 프레임의 상태는 "다음 프레임이 올 때까지" 이어진다고 본다
 *  2. 단, 최대 3초까지만. 그보다 길게 소식이 없으면(앱 백그라운드, 네트워크 끊김) 그 시간은 자리 비움
 *  3. 시간을 빈틈없이 이어 붙이므로 focused + unfocused + away = 버킷 길이 (백엔드 검사 통과)
 *  4. 마지막 자투리 버킷이 25초 미만이면 버림 (백엔드가 25~35초만 받음)
 */
import type { FocusFrameSample, FocusSampleInput, FocusState } from '../types/ebook';

export const BUCKET_POLICY = {
  BUCKET_MS: 30_000, // 버킷 길이 (백엔드 BUCKET_POLICY와 맞춤)
  MAX_FRAME_GAP_MS: 3_000, // 한 프레임이 대신할 수 있는 최대 시간
  MIN_LAST_BUCKET_MS: 25_000, // 종료 시 자투리 버킷 최소 길이 (백엔드 MIN_SEC)
} as const;

const round1 = (ms: number) => Math.round(ms / 100) / 10; // ms → 초 (소수 첫째 자리)

export class FocusBucketBuilder {
  private bucketStart: number | null = null; // 지금 채우는 버킷의 시작 시각
  private filledUntil: number | null = null; // 어디까지 시간을 채웠는지
  private acc: Record<FocusState, number> = { focused: 0, unfocused: 0, away: 0 }; // ms
  private interruptions = 0;
  private angleSum = { yaw: 0, pitch: 0, nYaw: 0, nPitch: 0 }; // 머리 각도 평균용
  private last: FocusFrameSample | null = null;
  private completed: FocusSampleInput[] = [];
  /** 이번 세션에 완성된 모든 버킷 (전송해도 지우지 않음 → 실시간 집중도·골든타임 표시용) */
  private history: FocusSampleInput[] = [];

  /** 판단 결과 1개 넣기 */
  push(frame: FocusFrameSample) {
    if (this.bucketStart === null) {
      // 첫 프레임 → 첫 버킷 시작
      this.bucketStart = frame.timestamp;
      this.filledUntil = frame.timestamp;
    }

    let prevState: FocusState | null = null;
    if (this.last) {
      prevState = this.fillSinceLast(frame.timestamp);
    }

    // 자리에 있다가 → 자리 비움으로 바뀐 순간 = 이탈 1회
    if (prevState && prevState !== 'away' && frame.state === 'away') {
      this.interruptions += 1;
    }
    if (frame.yaw != null) { this.angleSum.yaw += frame.yaw; this.angleSum.nYaw += 1; }
    if (frame.pitch != null) { this.angleSum.pitch += frame.pitch; this.angleSum.nPitch += 1; }
    this.last = frame;
  }

  /** 종료할 때: 지금까지 채우고, 남은 자투리 버킷 처리 */
  flush(now: number = Date.now()) {
    if (this.last) this.fillSinceLast(now);

    if (this.bucketStart !== null && this.filledUntil !== null) {
      const length = this.filledUntil - this.bucketStart;
      if (length >= BUCKET_POLICY.MIN_LAST_BUCKET_MS) this.closeBucket(this.filledUntil);
      // 25초 미만은 백엔드가 거절하므로 버림 (최대 25초 손실)
    }
    this.reset();
  }

  /** 완성된 버킷 꺼내기 (꺼낸 건 목록에서 빠짐) */
  drain(): FocusSampleInput[] {
    const out = this.completed;
    this.completed = [];
    return out;
  }

  /** 화면 표시용: 완성된 버킷 전체 + 지금 채우는 중인 버킷까지 포함한 누적 시간(초) */
  stats(): { history: FocusSampleInput[]; focusedSec: number; unfocusedSec: number; awaySec: number } {
    const done = this.history.reduce(
      (a, b) => ({ f: a.f + b.focusedSec, u: a.u + b.unfocusedSec, w: a.w + b.awaySec }),
      { f: 0, u: 0, w: 0 },
    );
    return {
      history: this.history,
      focusedSec: done.f + this.acc.focused / 1000,
      unfocusedSec: done.u + this.acc.unfocused / 1000,
      awaySec: done.w + this.acc.away / 1000,
    };
  }

  /** 전송 실패한 버킷 되돌려 놓기 (다음 전송 때 다시 보냄. 백엔드가 중복은 무시) */
  requeue(samples: FocusSampleInput[]) {
    this.completed = [...samples, ...this.completed];
  }

  /* ───────────── 내부 ───────────── */

  /** 마지막 프레임 이후 ~ until 까지 시간을 채움. 채운 뒤의 "직전 상태"를 반환 */
  private fillSinceLast(until: number): FocusState {
    const last = this.last!;
    const stateEnd = Math.min(until, last.timestamp + BUCKET_POLICY.MAX_FRAME_GAP_MS);
    this.fill(stateEnd, last.state);

    if (until > stateEnd) {
      // 3초 넘게 소식 없음 → 그 시간은 자리 비움
      if (last.state !== 'away') this.interruptions += 1;
      this.fill(until, 'away');
      return 'away';
    }
    return last.state;
  }

  /** filledUntil ~ to 를 state로 채우고, 30초 경계를 넘으면 버킷을 닫음 */
  private fill(to: number, state: FocusState) {
    while (this.filledUntil! < to) {
      const bucketEnd = this.bucketStart! + BUCKET_POLICY.BUCKET_MS;
      const segEnd = Math.min(to, bucketEnd);
      this.acc[state] += segEnd - this.filledUntil!;
      this.filledUntil = segEnd;
      if (segEnd === bucketEnd) this.closeBucket(bucketEnd);
    }
  }

  /** 지금 버킷을 백엔드 형식으로 완성하고 다음 버킷 시작 */
  private closeBucket(end: number) {
    const bucket: FocusSampleInput = {
      bucketStart: new Date(this.bucketStart!).toISOString(),
      bucketEnd: new Date(end).toISOString(),
      focusedSec: round1(this.acc.focused),
      unfocusedSec: round1(this.acc.unfocused),
      awaySec: round1(this.acc.away),
      interruptionCount: this.interruptions,
      avgYaw: this.angleSum.nYaw ? Math.round((this.angleSum.yaw / this.angleSum.nYaw) * 10) / 10 : undefined,
      avgPitch: this.angleSum.nPitch ? Math.round((this.angleSum.pitch / this.angleSum.nPitch) * 10) / 10 : undefined,
    };
    this.completed.push(bucket);
    this.history.push(bucket);
    this.angleSum = { yaw: 0, pitch: 0, nYaw: 0, nPitch: 0 };
    this.bucketStart = end;
    this.acc = { focused: 0, unfocused: 0, away: 0 };
    this.interruptions = 0;
  }

  private reset() {
    this.bucketStart = null;
    this.filledUntil = null;
    this.acc = { focused: 0, unfocused: 0, away: 0 };
    this.interruptions = 0;
    this.angleSum = { yaw: 0, pitch: 0, nYaw: 0, nPitch: 0 };
    this.last = null;
  }
}

/* ═══════════════════════════════════════════════════════════════
 * 📖 흐름 정리
 *
 *  push(프레임)
 *    ① 첫 프레임이면 버킷 시작
 *    ② 직전 프레임 상태로 "직전 시각 ~ 지금"을 채움 (최대 3초, 넘으면 away)
 *         └ 30초 경계를 넘을 때마다 버킷 1개 완성 → completed
 *    ③ 자리에 있다가 away로 바뀌면 이탈 +1
 *
 *  flush()  종료 시: 지금까지 채우고, 남은 버킷이 25초 이상이면 완성 / 아니면 버림
 *  drain()  완성된 버킷 꺼내기 (전송용)
 *  requeue() 전송 실패 시 되돌려 놓기
 * ═══════════════════════════════════════════════════════════════ */
