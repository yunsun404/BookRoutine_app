import { parsePosition, positionKey, serializePosition } from './readingPosition';

describe('readingPosition', () => {
  it('키 이름', () => {
    expect(positionKey('abc')).toBe('ebook_position:abc');
  });

  it('저장한 값을 그대로 불러옴', () => {
    expect(serializePosition(1234, 8000)).toBe('{"v":2,"charIndex":1234,"total":8000}');
    expect(parsePosition(serializePosition(1234, 8000), 8000)).toBe(1234);
  });

  it('본문 길이가 바뀌었으면 같은 비율로 환산', () => {
    expect(parsePosition(serializePosition(4000, 8000), 10000)).toBe(5000);
  });

  it('예전 스크롤 비율 형식 { ratio } → 같은 비율의 글자 위치', () => {
    expect(parsePosition('{"ratio":0.25}', 8000)).toBe(2000);
    expect(parsePosition('{"ratio":1}', 8000)).toBe(7999);
  });

  it('범위 밖은 잘라내고, 읽을 수 없는 값은 0', () => {
    expect(parsePosition(serializePosition(99999, 99999), 100)).toBe(99);
    expect(parsePosition('{"v":2,"charIndex":-5,"total":100}', 100)).toBe(0);
    expect(parsePosition(null, 100)).toBe(0);
    expect(parsePosition('not json', 100)).toBe(0);
    expect(parsePosition('{"v":3}', 100)).toBe(0);
    expect(parsePosition('42', 100)).toBe(0);
    expect(parsePosition(serializePosition(10, 100), 0)).toBe(0);
  });
});
