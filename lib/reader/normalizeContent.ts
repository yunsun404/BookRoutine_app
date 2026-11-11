/**
 * 전자책 본문 정리 (순수 로직, React와 무관 → 테스트 가능)
 *
 * 서버 본문(위키문헌에서 가져온 글)에 섞여 있는 찌꺼기를 지운다.
 *   1. HTML 엔티티를 글자로 바꿈   &#32; → 공백, &#8203; → (보이지 않는 공백), &amp; → & ...
 *   2. 보이지 않는 공백(U+200B, zero-width space) 삭제
 *   3. 빈 줄이 3줄 이상 이어지면 2줄(\n\n)로 줄임  (&#8203;만 있던 줄이 지워지며 생김)
 *   4. 본문 맨 끝의 저작권 틀 줄 삭제  예) "Public domainPublic domainfalsefalse"
 *
 * 두 번 적용해도 결과가 같다(멱등).
 *   → 바뀌는 게 없을 때까지 1~4를 반복한다. 바뀔 때마다 글이 짧아지기만 하니 반복은 반드시 끝난다.
 *   (그래서 두 번 인코딩된 "&amp;lt;" 는 "<" 가 된다)
 */

/** 이름으로 된 엔티티 중 자주 쓰는 것만. 모르는 이름은 그대로 둔다 */
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  middot: '·',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  copy: '©',
  times: '×',
  deg: '°',
};

const ENTITY = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
const ZERO_WIDTH_SPACE = /​/g;
/** 줄바꿈 3개 이상 (사이 줄이 공백·탭만 있어도 빈 줄로 봄) */
const MANY_BLANK_LINES = /\n(?:[ \t ]*\n){2,}/g;
/** 위키문헌 저작권 틀이 글자로 남은 줄 */
const LICENSE_LINE = /^\s*(?:Public domain)+(?:true|false)+\s*$/;

function decodeEntity(all: string, body: string): string {
  if (body[0] === '#') {
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    // 0, 범위 밖, 서로게이트 반쪽은 잘못된 값 → 그대로 둠
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return all;
    return String.fromCodePoint(code);
  }
  return NAMED[body] ?? all;
}

/** 맨 끝 저작권 틀 줄 삭제 (본문 중간은 건드리지 않음) */
function stripTrailingLicense(text: string): string {
  let out = text;
  for (;;) {
    const trimmed = out.trimEnd();
    const nl = trimmed.lastIndexOf('\n');
    const lastLine = trimmed.slice(nl + 1);
    if (!LICENSE_LINE.test(lastLine)) return out;
    out = nl < 0 ? '' : trimmed.slice(0, nl).trimEnd();
  }
}

function normalizeOnce(text: string): string {
  return stripTrailingLicense(
    text.replace(ENTITY, decodeEntity).replace(ZERO_WIDTH_SPACE, '').replace(MANY_BLANK_LINES, '\n\n'),
  );
}

export function normalizeContent(text: string): string {
  let cur = text;
  for (;;) {
    const next = normalizeOnce(cur);
    if (next === cur) return cur;
    cur = next;
  }
}

/** 읽을 글이 없을 때 화면에 보여 줄 문구 */
export const EMPTY_CONTENT_MESSAGE = '원문을 불러오지 못했습니다.';

/**
 * 서버 본문 → 화면에 넣을 본문.
 * 정리한 뒤 공백·줄바꿈만 남으면(빈 본문) 안내 문구를 돌려줌
 * → 페이지 모드가 빈 페이지를 그리거나, 줄 맞추기에 실패해 스크롤 모드로 바뀌는 일이 없게
 */
export function prepareContent(raw: string | null | undefined): string {
  const text = normalizeContent(raw ?? '');
  return text.trim() === '' ? EMPTY_CONTENT_MESSAGE : text;
}
