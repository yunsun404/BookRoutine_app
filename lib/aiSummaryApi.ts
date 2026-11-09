import { authFetch, BASE_URL } from "../constants/api";

export interface BookAiSummary {
  summary_id: string;
  thread_id: string;
  book_id: string;
  book_title: string;
  summary: string;
  key_insights: unknown; // 보통 string[]
  created_at: string;
}

export const aiSummaryApi = {
  /** 마지막으로 요약된 책 N개(책마다 최신 요약 1개), 오래된 순 → 최신 순 */
  async getRecent(limit = 5): Promise<BookAiSummary[]> {
    const res = await authFetch(
      `${BASE_URL}/recommendation/ai-summaries?limit=${limit}`,
    );
    if (!res.ok) {
      throw new Error(`AI 요약 조회 실패: ${res.status}`);
    }
    const data: { items: BookAiSummary[] } = await res.json();
    return data.items ?? [];
  },
};