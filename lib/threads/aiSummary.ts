/**
 * AI 요약 타래 표시 (순수 로직)
 * AI 요약은 일반 타래로 저장되고, 내용 맨 앞의 표시 문구로 구분함
 * ⚠️ app/thread.tsx 와 백엔드 threads-ai.service.ts 의 AI_SUMMARY_MARKER 와 똑같아야 함
 */
export const AI_SUMMARY_MARKER = '[ AI 요약 ✨]';

export function isAiSummary(content?: string | null): boolean {
  return (content ?? '').startsWith(AI_SUMMARY_MARKER);
}

/** 표시 문구를 떼고 본문만 */
export function stripAiMarker(content?: string | null): string {
  return (content ?? '').replace(AI_SUMMARY_MARKER, '').replace(/^\s*\n/, '').trim();
}

/** 저장할 내용: 표시 문구 + 줄바꿈 + 요약 */
export function toAiSummaryContent(summary: string): string {
  return `${AI_SUMMARY_MARKER}\n${summary}`;
}

/** 타래 입력 확인: 쪽수는 0 이상 정수, 내용은 비어 있지 않아야 함. 문제 있으면 안내 문구 */
export function validateThreadInput(page: string, content: string): string | null {
  if (!page.trim() || !content.trim()) return '쪽수와 내용을 모두 입력해주세요.';
  if (!/^\d+$/.test(page.trim())) return '쪽수는 숫자로 입력해주세요.';
  return null;
}
