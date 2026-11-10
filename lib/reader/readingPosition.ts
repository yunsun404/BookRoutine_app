/**
 * 읽던 위치 저장 형식 (순수 로직)
 *
 * AsyncStorage 키: ebook_position:{bookId}
 * 값: { v: 2, charIndex, total }  (charIndex = 페이지 시작 글자 위치, total = 그때 본문 길이)
 *
 * 불러올 때
 *  - total 이 지금 본문 길이와 다르면(본문이 바뀜) 같은 비율의 위치로 환산
 *  - 예전 형식 { ratio: 0~1 } (스크롤 비율)이면 같은 비율의 글자 위치로
 *  - 읽을 수 없는 값이면 0 (처음부터)
 */
import { ratioToChar } from './paginate';

export const positionKey = (bookId: string) => `ebook_position:${bookId}`;

export function serializePosition(charIndex: number, total: number): string {
  return JSON.stringify({ v: 2, charIndex: Math.max(0, Math.floor(charIndex)), total });
}

export function parsePosition(raw: string | null | undefined, length: number): number {
  if (!raw || length <= 0) return 0;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!v || typeof v !== 'object') return 0;
  const o = v as Record<string, unknown>;
  const clamp = (n: number) => Math.min(length - 1, Math.max(0, Math.floor(n)));

  if (o.v === 2 && typeof o.charIndex === 'number' && Number.isFinite(o.charIndex)) {
    const total = typeof o.total === 'number' && o.total > 0 ? o.total : length;
    return clamp(total === length ? o.charIndex : (o.charIndex / total) * length);
  }
  if (typeof o.ratio === 'number') return clamp(ratioToChar(o.ratio, length));
  return 0;
}
