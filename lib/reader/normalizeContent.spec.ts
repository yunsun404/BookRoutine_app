import { EMPTY_CONTENT_MESSAGE, normalizeContent, prepareContent } from './normalizeContent';

/** 실제 서버 본문에서 몇 줄만 잘라 온 예시 (1925·1936년 발표, 공유 저작물) */
const SAMRYONG_HEAD =
  '《黎明》 창간호(1925. 7)에 발표.\n\n&#8203;\n\n羅稻香\n\n내가 열살이 될낙말낙할ᄯᅢ이닛가 지금으로부터 십사오년전일이다.';
const SAMRYONG_MID = '나히는 열일곱살이나 아즉 열네살도되어&#32;&#8203;보이지안코 넘어 귀엽게길리기ᄯᅢ문에';
const MEMIL_TAIL = '걸음도 해깝고 방울소리가 밤 벌판에 한층 청청하게 울렸다.\n\n달이 어지간히 기울어졌다.\n\nPublic domainPublic domainfalsefalse';

const SAMPLES = [
  SAMRYONG_HEAD,
  SAMRYONG_MID,
  MEMIL_TAIL,
  '&amp;lt; &amp;#8203; &#38;#32; &#x26;amp;',
  '앞\n\n\n\n\n뒤',
  '앞\n \n\t\n \n뒤',
  'Public domainPublic domainfalsefalse',
  '본문\n\nPublic domainfalse\n\nPublic domainPublic domainfalsefalse\n\n',
  '&foo; &#0; &#xD800; &#99999999;',
  '',
];

describe('normalizeContent', () => {
  it('&#32; 는 공백, &#8203; 는 삭제', () => {
    expect(normalizeContent(SAMRYONG_MID)).toBe('나히는 열일곱살이나 아즉 열네살도되어 보이지안코 넘어 귀엽게길리기ᄯᅢ문에');
  });

  it('&#8203; 만 있던 줄이 지워져 생긴 빈 줄 3줄 이상 → 2줄', () => {
    expect(normalizeContent(SAMRYONG_HEAD)).toBe(
      '《黎明》 창간호(1925. 7)에 발표.\n\n羅稻香\n\n내가 열살이 될낙말낙할ᄯᅢ이닛가 지금으로부터 십사오년전일이다.',
    );
  });

  it('빈 줄 규칙: 공백·탭만 있는 줄도 빈 줄로 보고, 문단 사이 빈 줄 1개는 그대로', () => {
    expect(normalizeContent('앞\n\n\n\n\n뒤')).toBe('앞\n\n뒤');
    expect(normalizeContent('앞\n \n\t\n \n뒤')).toBe('앞\n\n뒤');
    expect(normalizeContent('앞\n\n뒤\n다음 줄')).toBe('앞\n\n뒤\n다음 줄');
  });

  it('숫자·16진수·이름 엔티티 일반 변환, 모르는 이름과 잘못된 숫자는 그대로', () => {
    expect(normalizeContent('&#65;&#x42;&lt;&gt;&quot;&hellip;&nbsp;&middot;')).toBe('AB<>"… ·');
    expect(normalizeContent('&foo; &#0; &#xD800; &#99999999;')).toBe('&foo; &#0; &#xD800; &#99999999;');
    expect(normalizeContent('A &amp; B')).toBe('A & B');
  });

  it('본문 맨 끝 저작권 틀 줄만 삭제', () => {
    expect(normalizeContent(MEMIL_TAIL)).toBe(
      '걸음도 해깝고 방울소리가 밤 벌판에 한층 청청하게 울렸다.\n\n달이 어지간히 기울어졌다.',
    );
    // 여러 줄이 이어져 있어도 끝에서부터 모두
    expect(normalizeContent('본문\n\nPublic domainfalse\n\nPublic domainPublic domainfalsefalse\n\n')).toBe('본문');
    // 본문 전체가 저작권 틀이면 빈 글
    expect(normalizeContent('Public domainPublic domainfalsefalse')).toBe('');
  });

  it('본문 중간의 저작권 틀 글자와 "Public domain" 문장은 건드리지 않음', () => {
    const mid = '앞 문단\n\nPublic domainPublic domainfalsefalse\n\n뒤 문단';
    expect(normalizeContent(mid)).toBe(mid);
    const sentence = '이 책은 Public domain 이다.';
    expect(normalizeContent(sentence)).toBe(sentence);
    // 끝 줄이라도 틀 모양(… true/false)이 아니면 그대로
    expect(normalizeContent('본문\n\nPublic domain')).toBe('본문\n\nPublic domain');
  });

  it('정리할 게 없으면 그대로 (끝 공백도 건드리지 않음)', () => {
    const plain = '“장인님! 인제 저…….”\n\n내가 이렇게 뒤통수를 긁고, \n';
    expect(normalizeContent(plain)).toBe(plain);
  });

  it('멱등: 두 번 적용해도 결과가 같음', () => {
    for (const x of SAMPLES) {
      const once = normalizeContent(x);
      expect(normalizeContent(once)).toBe(once);
    }
  });

  it('두 번 인코딩된 엔티티도 한 번에 끝까지 풀림 (그래서 멱등)', () => {
    expect(normalizeContent('&amp;lt; &amp;#8203;끝')).toBe('< 끝');
  });
});

describe('prepareContent (빈 본문 처리)', () => {
  it('없거나, 정리하면 공백·줄바꿈만 남는 본문 → 안내 문구', () => {
    const blanks = [
      null,
      undefined,
      '',
      '   ',
      '\n\n',
      '\n \t\n',
      '&#8203;',
      '&#32;&#32;',
      '&#8203;\n\n&#32;',
      'Public domainPublic domainfalsefalse',
      '\n\nPublic domainfalse\n',
    ];
    for (const raw of blanks) expect(prepareContent(raw)).toBe(EMPTY_CONTENT_MESSAGE);
  });

  it('글이 있으면 정리한 본문 그대로', () => {
    expect(prepareContent('본문&#8203;\n\n\n\n끝')).toBe('본문\n\n끝');
    expect(prepareContent(MEMIL_TAIL)).toBe(normalizeContent(MEMIL_TAIL));
  });
});
