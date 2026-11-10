import { autoSelectReadingDays, DEFAULT_READING_DAYS, daysInRange } from './readingDays';

// 2026-11-09 = 월요일
const d = (day: number) => new Date(2026, 10, day);

describe('readingDays', () => {
  it('기본값은 월·수·금', () => {
    expect(DEFAULT_READING_DAYS).toEqual([1, 3, 5]);
  });

  it('일주일 이상이면 월·수·금 (예전엔 월~일 전부였음)', () => {
    expect(autoSelectReadingDays(d(9), d(15))).toEqual([1, 3, 5]);
    expect(autoSelectReadingDays(d(1), d(30))).toEqual([1, 3, 5]);
  });

  it('짧은 기간이면 그 안의 기본 요일만 (화~목 → 수)', () => {
    expect(autoSelectReadingDays(d(10), d(12))).toEqual([3]);
  });

  it('기간에 월·수·금이 없으면 그 기간의 요일 전부 (화요일 하루 → 화, 토~일 → 일·토)', () => {
    expect(autoSelectReadingDays(d(10), d(10))).toEqual([2]);
    expect(autoSelectReadingDays(d(14), d(15))).toEqual([0, 6]);
  });

  it('daysInRange: 시작일이 더 늦으면 빈 목록', () => {
    expect(daysInRange(d(12), d(10))).toEqual([]);
    expect(daysInRange(d(9), d(9))).toEqual([1]);
  });
});
