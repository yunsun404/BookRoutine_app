import { isAiSummary, stripAiMarker, toAiSummaryContent, validateThreadInput } from './aiSummary';

describe('AI 요약 타래 표시', () => {
  it('저장한 내용을 다시 읽으면 AI 요약으로 알아보고 본문만 꺼냄', () => {
    const saved = toAiSummaryContent('12쪽 · 첫 문장\n30쪽 · 둘째 문장');
    expect(isAiSummary(saved)).toBe(true);
    expect(stripAiMarker(saved)).toBe('12쪽 · 첫 문장\n30쪽 · 둘째 문장');
  });

  it('일반 타래는 그대로', () => {
    expect(isAiSummary('오늘 읽은 부분이 좋았다')).toBe(false);
    expect(isAiSummary(undefined)).toBe(false);
    expect(stripAiMarker('그냥 글')).toBe('그냥 글');
  });
});

describe('validateThreadInput (타래 입력 확인)', () => {
  it('비어 있으면 안내', () => {
    expect(validateThreadInput('', '내용')).toBe('쪽수와 내용을 모두 입력해주세요.');
    expect(validateThreadInput('12', '  ')).toBe('쪽수와 내용을 모두 입력해주세요.');
  });

  it('쪽수가 숫자가 아니면 안내', () => {
    expect(validateThreadInput('12쪽', '내용')).toBe('쪽수는 숫자로 입력해주세요.');
  });

  it('정상', () => {
    expect(validateThreadInput(' 12 ', '내용')).toBeNull();
  });
});
