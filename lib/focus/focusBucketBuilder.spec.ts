import { FocusBucketBuilder } from './focusBucketBuilder';
import type { FocusState } from '../types/ebook';

const T0 = Date.UTC(2026, 9, 13, 12, 0, 0);
/** t초에 state 프레임 넣기 */
const feed = (b: FocusBucketBuilder, frames: [number, FocusState][]) =>
  frames.forEach(([t, state]) => b.push({ timestamp: T0 + t * 1000, state }));
const total = (s: any) => s.focusedSec + s.unfocusedSec + s.awaySec;

describe('FocusBucketBuilder', () => {
  it('1초마다 집중 65초 → 버킷 2개, 각각 30초 집중', () => {
    const b = new FocusBucketBuilder();
    feed(b, Array.from({ length: 66 }, (_, i) => [i, 'focused'] as [number, FocusState]));
    const out = b.drain();
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ focusedSec: 30, unfocusedSec: 0, awaySec: 0, interruptionCount: 0 });
    expect(out.every((s) => total(s) === 30)).toBe(true);
  });

  it('상태가 섞여도 세 값의 합은 항상 30초', () => {
    const b = new FocusBucketBuilder();
    const states: FocusState[] = ['focused', 'unfocused', 'away'];
    // 불규칙한 간격(0.7~1.6초)으로 프레임
    let t = 0;
    const frames: [number, FocusState][] = [];
    for (let i = 0; t < 95; i++) { frames.push([t, states[i % 3]]); t += 0.7 + (i % 4) * 0.3; }
    feed(b, frames);
    const out = b.drain();
    expect(out.length).toBe(3);
    out.forEach((s) => expect(Math.abs(total(s) - 30)).toBeLessThanOrEqual(0.3));
  });

  it('5초 동안 프레임이 없으면 3초 이후는 자리 비움 + 이탈 1회', () => {
    const b = new FocusBucketBuilder();
    feed(b, [[0, 'focused'], [1, 'focused'], [6, 'focused']]);
    feed(b, Array.from({ length: 30 }, (_, i) => [7 + i, 'focused'] as [number, FocusState]));
    const [first] = b.drain();
    expect(first.awaySec).toBe(2); // 1초 프레임이 4초까지 대신 → 4~6초 away
    expect(first.interruptionCount).toBe(1);
    expect(total(first)).toBe(30);
  });

  it('자리에 있다가 away로 바뀌면 이탈 횟수 증가', () => {
    const b = new FocusBucketBuilder();
    feed(b, [[0, 'focused'], [1, 'away'], [2, 'away'], [3, 'focused'], [4, 'away']]);
    feed(b, Array.from({ length: 27 }, (_, i) => [5 + i, 'focused'] as [number, FocusState]));
    expect(b.drain()[0].interruptionCount).toBe(2);
  });

  it('종료 시 남은 버킷: 25초 이상이면 보내고, 미만이면 버림', () => {
    const b1 = new FocusBucketBuilder();
    feed(b1, Array.from({ length: 28 }, (_, i) => [i, 'focused'] as [number, FocusState]));
    b1.flush(T0 + 28_000);
    const out1 = b1.drain();
    expect(out1).toHaveLength(1);
    expect(total(out1[0])).toBe(28);

    const b2 = new FocusBucketBuilder();
    feed(b2, Array.from({ length: 10 }, (_, i) => [i, 'focused'] as [number, FocusState]));
    b2.flush(T0 + 10_000);
    expect(b2.drain()).toHaveLength(0);
  });

  it('requeue한 버킷은 다음 drain에 다시 나옴', () => {
    const b = new FocusBucketBuilder();
    feed(b, Array.from({ length: 31 }, (_, i) => [i, 'focused'] as [number, FocusState]));
    const first = b.drain();
    b.requeue(first);
    expect(b.drain()).toEqual(first);
  });
});

describe('FocusBucketBuilder 머리 각도', () => {
  it('버킷마다 yaw/pitch 평균을 소수 첫째 자리로 담음', () => {
    const b = new FocusBucketBuilder();
    for (let t = 0; t <= 31; t++) b.push({ timestamp: T0 + t * 1000, state: 'focused', yaw: t % 2 ? 10 : 0, pitch: -12 });
    const [first] = b.drain();
    expect(first.avgYaw).toBe(5); // 0~29초 프레임 30개 (0과 10이 15개씩)
    expect(first.avgPitch).toBe(-12);
  });
});

describe('FocusBucketBuilder 화면 표시용 stats', () => {
  it('전송(drain)해도 history 는 남고, 채우는 중인 버킷까지 누적', () => {
    const b = new FocusBucketBuilder();
    for (let t = 0; t <= 40; t++) b.push({ timestamp: T0 + t * 1000, state: t < 35 ? 'focused' : 'unfocused' });
    b.drain();
    const st = b.stats();
    expect(st.history).toHaveLength(1);
    expect(st.focusedSec).toBe(35);
    expect(st.unfocusedSec).toBe(5);
  });
});
