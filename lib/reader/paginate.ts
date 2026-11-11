/**
 * 페이지 나누기 (순수 로직, React와 무관 → 테스트 가능)
 *
 * 흐름
 *   1. splitChunks   : 긴 본문을 줄바꿈 위치에서 조각으로 나눔 (조각마다 따로 재서 한 번에 무거워지지 않게)
 *   2. alignLines    : 화면 밖에서 그린 Text 의 onTextLayout 줄 목록 → 줄마다 "본문의 몇 번째 칸에서 시작하는지"
 *                      글자가 하나라도 안 맞으면 null (→ 화면은 스크롤 모드로 돌아감)
 *   3. buildPages    : 줄의 실제 y·높이로, 한 화면에 들어가는 만큼 줄을 묶어 페이지 {startChar, endChar}
 *
 * 조각을 줄바꿈에서 자르는 이유: 줄 중간에서 자르면 줄 나뉨이 원래와 달라짐.
 *   "\n\n" 에서 자르면 앞 조각은 첫 \n 앞까지, 뒤 조각은 둘째 \n 부터 → 뒤 조각 첫 줄이 빈 줄 = 원래 모양 그대로
 */

export interface Chunk {
  /** 본문 안에서 이 조각이 시작하는 칸 */
  start: number;
  text: string;
}

/** onTextLayout 의 줄 1개 중 필요한 값 */
export interface MeasuredLine {
  text: string;
  y: number;
  height: number;
}

export interface AlignedLine {
  /** 본문 안에서 이 줄이 시작하는 칸 */
  start: number;
  /** 본문 전체를 이어 그렸을 때의 y (dp) */
  y: number;
  height: number;
  /** 빈 줄인지 (페이지 맨 앞에 오면 건너뜀) */
  blank: boolean;
}

export interface Page {
  startChar: number;
  /** 다음 페이지의 startChar (마지막 페이지는 본문 길이) */
  endChar: number;
  /** 이 페이지에 그릴 줄 수 (Text numberOfLines 용) */
  lineCount: number;
}

/** 목표 길이 근처의 줄바꿈에서 조각으로 나눔. 줄바꿈이 없으면 자르지 않음 */
export function splitChunks(content: string, target: number): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  const limit = target * 2;
  while (content.length - start > target * 1.5) {
    const from = start + target;
    let cut = content.indexOf('\n\n', from);
    if (cut < 0 || cut - start > limit) cut = content.indexOf('\n', from);
    if (cut < 0 || cut - start > limit) break; // 적당한 줄바꿈이 없음 → 나머지는 한 조각
    chunks.push({ start, text: content.slice(start, cut) });
    // "\n\n" 이면 둘째 \n 부터(빈 줄 유지), "\n" 이면 그다음 글자부터
    start = cut + 1;
  }
  chunks.push({ start, text: content.slice(start) });
  return chunks;
}

const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === ' ';

/**
 * 측정한 줄을 조각 글자와 맞춤.
 * 줄 글자(끝 줄바꿈 제외)가 순서대로 그대로 나와야 하고, 사이에는 공백·줄바꿈만 있어야 함.
 * 마지막 줄 뒤에 공백 말고 다른 글자가 남아도 실패 (= 합계 검사).
 */
export function alignLines(
  chunk: Chunk,
  lines: MeasuredLine[],
  yOffset: number,
): { lines: AlignedLine[]; bottom: number } | null {
  const text = chunk.text;
  const out: AlignedLine[] = [];
  let cursor = 0;
  let bottom = yOffset;
  for (const line of lines) {
    const t = line.text.replace(/\r?\n$/, '');
    while (!text.startsWith(t, cursor)) {
      if (cursor >= text.length || !isSpace(text[cursor])) return null;
      cursor += 1;
    }
    out.push({ start: chunk.start + cursor, y: yOffset + line.y, height: line.height, blank: t.trim() === '' });
    cursor += t.length;
    if (text[cursor] === '\n') cursor += 1; // 이 줄을 끝내는 줄바꿈 (다음 줄이 빈 줄이면 그 줄의 \n 부터 시작)
    bottom = Math.max(bottom, yOffset + line.y + line.height);
  }
  for (; cursor < text.length; cursor++) if (!isSpace(text[cursor])) return null;
  return { lines: out, bottom };
}

/**
 * 줄을 페이지로 묶음.
 * @param pageHeight 글이 들어갈 높이 (dp)
 * @param firstPageHeight 첫 페이지 높이 (제목만큼 작음)
 */
export function buildPages(
  lines: AlignedLine[],
  pageHeight: number,
  firstPageHeight: number,
  totalLength: number,
): Page[] {
  const starts: { start: number; count: number }[] = [];
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && lines[i].blank) i++; // 페이지 맨 앞의 빈 줄은 앞 페이지 끝으로
    if (i >= lines.length) break;
    const h = starts.length === 0 ? firstPageHeight : pageHeight;
    const top = lines[i].y;
    let j = i;
    while (j < lines.length && lines[j].y + lines[j].height - top <= h) j++;
    if (j === i) j = i + 1; // 한 줄도 안 들어가도 최소 1줄
    starts.push({ start: lines[i].start, count: j - i });
    i = j;
  }
  return starts.map((s, k) => ({
    startChar: s.start,
    endChar: k + 1 < starts.length ? starts[k + 1].start : totalLength,
    lineCount: s.count,
  }));
}

/** charIndex 가 들어 있는 페이지 번호 (첫 페이지보다 앞이면 0) */
export function pageIndexOf(pages: Page[], charIndex: number): number {
  let lo = 0;
  let hi = pages.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pages[mid].startChar <= charIndex) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** 예전 스크롤 비율(0~1) → 같은 비율의 글자 위치 */
export function ratioToChar(ratio: number, length: number): number {
  if (!Number.isFinite(ratio) || length <= 0) return 0;
  return Math.floor(Math.min(1, Math.max(0, ratio)) * length);
}

/** 화면에 그릴 페이지 글자 (끝 공백·줄바꿈 제거) */
export function pageText(content: string, page: Page): string {
  return content.slice(page.startChar, page.endChar).trimEnd();
}
