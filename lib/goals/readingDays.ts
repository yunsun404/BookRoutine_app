/**
 * 목표 만들기 '읽을 요일' 자동 선택 (순수 로직)
 *
 * 기본값은 월·수·금. 시작일·종료일을 고르면
 *   - 기본 요일 중 그 기간에 들어 있는 요일만 남김 (예: 화~목 → 수)
 *   - 하나도 없으면 (예: 화요일 하루) 그 기간의 요일을 전부 → "요일을 하나 이상 선택" 오류 방지
 * 요일 번호는 Date.getDay() 와 같음 (0=일, 1=월 … 6=토)
 */
export const DEFAULT_READING_DAYS: readonly number[] = [1, 3, 5];

/** 시작일~종료일(포함)에 들어 있는 요일 (작은 번호부터). 시작일이 더 늦으면 [] */
export function daysInRange(start: Date, end: Date): number[] {
  const set = new Set<number>();
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last && set.size < 7) {
    set.add(cur.getDay());
    cur.setDate(cur.getDate() + 1);
  }
  return [...set].sort((a, b) => a - b);
}

export function autoSelectReadingDays(
  start: Date,
  end: Date,
  preferred: readonly number[] = DEFAULT_READING_DAYS,
): number[] {
  const inRange = daysInRange(start, end);
  const kept = preferred.filter((d) => inRange.includes(d));
  return kept.length > 0 ? [...kept].sort((a, b) => a - b) : inRange;
}
