import { countReadingChars } from './charCount';

describe('countReadingChars', () => {
  it('현대 한글·한자·문장부호는 1자씩, 공백·줄바꿈은 안 셈', () => {
    expect(countReadingChars('달이 어지간히\n기울어졌다.')).toBe(12);
    expect(countReadingChars('羅稻香')).toBe(3);
    expect(countReadingChars(' \n\t ')).toBe(0);
  });

  it('옛한글 자모 묶음은 1자 (실제 본문 예시)', () => {
    expect('ᄯᅢ'.length).toBe(2);
    expect(countReadingChars('ᄯᅢ')).toBe(1);
    expect(countReadingChars('ᄭᅮᆨ')).toBe(1);
    expect(countReadingChars('될낙말낙할ᄯᅢ이닛가')).toBe(9);
  });

  it('서로게이트 쌍(이모지)은 1자', () => {
    expect(countReadingChars('😀가')).toBe(2);
  });

  it('빈 글은 0', () => {
    expect(countReadingChars('')).toBe(0);
  });
});
