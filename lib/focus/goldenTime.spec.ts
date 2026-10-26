import { goldenStatus } from './goldenTime';
import type { FocusSampleInput } from '../types/ebook';

const T0 = Date.UTC(2026, 9, 26, 12, 0, 0);
/** 30초 버킷 n개. focus[i] = i번째 버킷의 집중 초 */
const buckets = (focus: number[], gapAfter: number[] = []): FocusSampleInput[] => {
  let start = T0;
  return focus.map((f, i) => {
    const b = {
      bucketStart: new Date(start).toISOString(),
      bucketEnd: new Date(start + 30_000).toISOString(),
      focusedSec: f, unfocusedSec: 30 - f, awaySec: 0, interruptionCount: 0,
    };
    start += 30_000 + (gapAfter.includes(i) ? 60_000 : 0);
    return b;
  });
};

describe('goldenStatus (서버 findGoldenTime 과 같은 규칙)', () => {
  it('집중 버킷 10개(5분) 연속이면 골든타임', () => {
    const g = goldenStatus(buckets(Array(10).fill(25)));
    expect(g.best).toEqual({ start: T0, end: T0 + 300_000 });
    expect(g.current?.ms).toBe(300_000);
  });

  it('4분만 집중하면 골든타임 없음, 대신 진행 중인 구간은 알려 줌', () => {
    const g = goldenStatus(buckets(Array(8).fill(25)));
    expect(g.best).toBeNull();
    expect(g.current?.ms).toBe(240_000);
  });

  it('중간에 미달 1개는 봐주고, 2개 연속이면 끊김', () => {
    expect(goldenStatus(buckets([25, 25, 25, 25, 25, 10, 25, 25, 25, 25, 25])).best).not.toBeNull();
    expect(goldenStatus(buckets([25, 25, 25, 25, 25, 10, 10, 25, 25, 25, 25, 25])).best).toBeNull();
  });

  it('70% 기준: 21초 집중은 통과, 20초는 미달', () => {
    expect(goldenStatus(buckets(Array(10).fill(21))).best).not.toBeNull();
    expect(goldenStatus(buckets(Array(10).fill(20))).best).toBeNull();
  });

  it('버킷 사이가 5초 넘게 비면 끊김 (다시 보정 등)', () => {
    expect(goldenStatus(buckets(Array(10).fill(25), [4])).best).toBeNull();
  });

  it('마지막 버킷이 집중이 아니면 진행 중 구간 없음', () => {
    expect(goldenStatus(buckets([25, 25, 5, 5])).current).toBeNull();
  });
});
