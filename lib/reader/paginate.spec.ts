import {
  alignLines,
  buildPages,
  pageIndexOf,
  pageText,
  ratioToChar,
  splitChunks,
  type AlignedLine,
  type MeasuredLine,
} from './paginate';

const LH = 31;

/**
 * 가짜 onTextLayout: 줄바꿈마다 줄을 끊고, 한 줄에 perLine 칸씩 감쌈.
 * Android 처럼 줄 끝 "\n" 을 줄 글자에 포함 (trailingNewline=false 면 iOS 처럼 뺌)
 */
const fakeLayout = (text: string, perLine: number, trailingNewline = true): MeasuredLine[] => {
  const out: MeasuredLine[] = [];
  const paras = text.split('\n');
  paras.forEach((p, pi) => {
    const nl = pi < paras.length - 1 && trailingNewline ? '\n' : '';
    if (p.length === 0) {
      out.push({ text: nl, y: out.length * LH, height: LH });
      return;
    }
    for (let i = 0; i < p.length; i += perLine) {
      const last = i + perLine >= p.length;
      out.push({ text: p.slice(i, i + perLine) + (last ? nl : ''), y: out.length * LH, height: LH });
    }
  });
  return out;
};

/** 조각을 모두 재서 줄 목록을 이어 붙임 (PagedReader 가 하는 일) */
const measureAll = (content: string, target: number, perLine: number, trailingNewline = true) => {
  const lines: AlignedLine[] = [];
  let y = 0;
  for (const c of splitChunks(content, target)) {
    const r = alignLines(c, fakeLayout(c.text, perLine, trailingNewline), y);
    if (!r) return null;
    lines.push(...r.lines);
    y = r.bottom;
  }
  return lines;
};

const para = (n: number, ch: string) => Array.from({ length: n }, (_, i) => ch.repeat(10 + (i % 7) * 9)).join('\n\n');

describe('splitChunks', () => {
  it('짧으면 조각 1개', () => {
    expect(splitChunks('가나다\n\n라마', 100)).toEqual([{ start: 0, text: '가나다\n\n라마' }]);
  });

  it('"\\n\\n" 에서 자르고 뒤 조각은 둘째 \\n 부터 (빈 줄 유지), 빠지는 칸은 \\n 하나뿐', () => {
    const content = para(40, '가');
    const chunks = splitChunks(content, 200);
    expect(chunks.length).toBeGreaterThan(2);
    for (let k = 1; k < chunks.length; k++) {
      const prevEnd = chunks[k - 1].start + chunks[k - 1].text.length;
      expect(content[prevEnd]).toBe('\n');
      expect(chunks[k].start).toBe(prevEnd + 1);
      expect(chunks[k].text.startsWith('\n')).toBe(true);
    }
    expect(chunks.map((c) => c.text).join('\n')).toBe(content);
  });

  it('줄바꿈이 없으면 자르지 않음', () => {
    const one = '가'.repeat(1000);
    expect(splitChunks(one, 100)).toHaveLength(1);
  });
});

describe('alignLines', () => {
  it('Android(줄 끝 \\n 포함)·iOS(제외) 둘 다 맞춤', () => {
    const c = { start: 10, text: '가나다라마바\n\n사아' };
    for (const nl of [true, false]) {
      const r = alignLines(c, fakeLayout(c.text, 4, nl), 100)!;
      expect(r.lines.map((l) => l.start)).toEqual([10, 14, 17, 18]);
      expect(r.lines.map((l) => l.blank)).toEqual([false, false, true, false]);
      expect(r.lines[0].y).toBe(100);
      expect(r.bottom).toBe(100 + 4 * LH);
    }
  });

  it('줄 글자가 본문과 다르면 null', () => {
    const c = { start: 0, text: '가나다라' };
    expect(alignLines(c, [{ text: '가나다X', y: 0, height: LH }], 0)).toBeNull();
  });

  it('마지막 줄 뒤에 글자가 남으면 null (합계 검사)', () => {
    const c = { start: 0, text: '가나다라마' };
    expect(alignLines(c, [{ text: '가나다', y: 0, height: LH }], 0)).toBeNull();
    // 끝에 공백·줄바꿈만 남으면 통과
    expect(alignLines({ start: 0, text: '가나다 \n' }, [{ text: '가나다', y: 0, height: LH }], 0)).not.toBeNull();
  });
});

describe('buildPages', () => {
  it('높이에 들어가는 만큼 줄을 묶고, 첫 페이지는 제목만큼 작음', () => {
    const content = '가'.repeat(10) + '\n' + '나'.repeat(10) + '\n' + '다'.repeat(10);
    const lines = measureAll(content, 4000, 5)!; // 한 줄 5칸 → 6줄
    const pages = buildPages(lines, 2 * LH, 1 * LH, content.length);
    expect(pages.map((p) => p.lineCount)).toEqual([1, 2, 2, 1]);
    expect(pages[0]).toMatchObject({ startChar: 0, endChar: 5 });
    expect(pages[pages.length - 1].endChar).toBe(content.length);
  });

  it('페이지 맨 앞의 빈 줄은 건너뛰고 앞 페이지 끝으로 보냄', () => {
    const content = '가나다\n\n라마바';
    const lines = measureAll(content, 4000, 10)!; // 줄: 가나다 / (빈 줄) / 라마바
    const pages = buildPages(lines, LH, LH, content.length);
    expect(pages).toHaveLength(2);
    expect(pageText(content, pages[0])).toBe('가나다');
    expect(pageText(content, pages[1])).toBe('라마바');
  });

  it('여러 조각으로 재도 한 번에 잰 것과 페이지가 같고, 모든 페이지를 이으면 본문 그대로', () => {
    const content = para(60, '글');
    const whole = buildPages(measureAll(content, 1e9, 13)!, 10 * LH, 7 * LH, content.length);
    const chunked = buildPages(measureAll(content, 150, 13)!, 10 * LH, 7 * LH, content.length);
    expect(splitChunks(content, 150).length).toBeGreaterThan(3);
    expect(chunked).toEqual(whole);
    expect(chunked[0].startChar).toBe(0);
    expect(chunked.map((p) => content.slice(p.startChar, p.endChar)).join('')).toBe(content);
  });

  it('조각 경계에서도 Android·iOS 줄 모양이 같음', () => {
    const content = para(30, '책');
    const a = buildPages(measureAll(content, 120, 9, true)!, 8 * LH, 8 * LH, content.length);
    const b = buildPages(measureAll(content, 120, 9, false)!, 8 * LH, 8 * LH, content.length);
    expect(a).toEqual(b);
  });
});

describe('pageIndexOf / ratioToChar', () => {
  const pages = [
    { startChar: 0, endChar: 10, lineCount: 1 },
    { startChar: 10, endChar: 25, lineCount: 1 },
    { startChar: 25, endChar: 40, lineCount: 1 },
  ];
  it('글자 위치가 들어 있는 페이지', () => {
    expect(pageIndexOf(pages, 0)).toBe(0);
    expect(pageIndexOf(pages, 9)).toBe(0);
    expect(pageIndexOf(pages, 10)).toBe(1);
    expect(pageIndexOf(pages, 39)).toBe(2);
    expect(pageIndexOf(pages, 999)).toBe(2);
    expect(pageIndexOf([], 5)).toBe(0);
  });
  it('비율 → 글자 위치 (범위 밖·이상한 값은 잘라냄)', () => {
    expect(ratioToChar(0.5, 100)).toBe(50);
    expect(ratioToChar(1.5, 100)).toBe(100);
    expect(ratioToChar(-1, 100)).toBe(0);
    expect(ratioToChar(NaN, 100)).toBe(0);
  });
});
