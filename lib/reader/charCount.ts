/**
 * 읽기 속도용 글자 세기 (순수 로직)
 *
 *  - 공백·줄바꿈은 세지 않음 (읽기 속도는 보통 "음절/분"으로 재기 때문)
 *  - 옛한글은 자모 여러 개가 모여 글자 1개 → 묶음을 1자로 셈
 *      초성(ᄀ, ᄯ …)이 글자 1개를 시작하고, 뒤에 붙는 중성·종성·방점은 세지 않음
 *      예) "ᄯᅢ" = 1자, "ᄭᅮᆨ" = 1자
 *  - 이모지 등 서로게이트 쌍도 1자
 *
 * 페이지 위치(startChar/endChar)는 문자열 칸 수 그대로 쓰고, 이 함수는 읽기 속도 계산에만 쓴다.
 */

/** 앞 글자에 붙는(따로 세지 않는) 옛한글 자모: 중성 · 종성 · 방점 */
function isAttachedJamo(cp: number): boolean {
  return (
    (cp >= 0x1160 && cp <= 0x11a7) || // 중성
    (cp >= 0x11a8 && cp <= 0x11ff) || // 종성
    (cp >= 0xd7b0 && cp <= 0xd7c6) || // 확장 중성
    (cp >= 0xd7cb && cp <= 0xd7fb) || // 확장 종성
    cp === 0x302e ||
    cp === 0x302f // 방점
  );
}

const WHITESPACE = /\s/;

export function countReadingChars(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (WHITESPACE.test(ch)) continue;
    if (isAttachedJamo(ch.codePointAt(0)!)) continue;
    n += 1;
  }
  return n;
}
