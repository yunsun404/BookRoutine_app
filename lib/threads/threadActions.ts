import { authFetch, BASE_URL } from "@/constants/api";
import { isAiSummary, toAiSummaryContent } from "./aiSummary";

/**
 * 타래 등록 · AI 요약 (내 책장의 책 화면에서 씀)
 * 기존 app/thread.tsx 와 같은 서버 주소·같은 방식 (그 화면은 그대로 둠)
 *  - 등록: POST /threads  (작성자는 서버가 토큰으로 정함)
 *  - 요약: POST /threads-ai/summary → 예전 요약 타래 삭제 → 새 요약을 타래로 저장
 */
const THREADS_ENDPOINT = `${BASE_URL}/threads`;
const AI_SUMMARY_ENDPOINT = `${BASE_URL}/threads-ai/summary`;

export async function createThread(bookId: string, page: number, content: string): Promise<boolean> {
  try {
    const res = await authFetch(THREADS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        book_id: bookId,
        group_id: null,
        content,
        current_page: page,
        is_public: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("타래 등록 실패:", e);
    return false;
  }
}

export type SummaryResult =
  | { ok: true; aiUnavailable: boolean }
  | { ok: false; message: string };

export async function createAiSummary(
  bookId: string,
  currentThreads: { thread_id: string; content: string }[],
): Promise<SummaryResult> {
  try {
    const res = await authFetch(AI_SUMMARY_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ book_id: bookId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.summary) return { ok: false, message: "AI 요약을 만들지 못했어요" };

    // 예전 AI 요약은 지워서 항상 최신 요약 하나만 남김
    await Promise.all(
      currentThreads
        .filter((t) => isAiSummary(t.content))
        .map((t) =>
          authFetch(`${THREADS_ENDPOINT}/${t.thread_id}`, { method: "DELETE" }).catch(() => null),
        ),
    );

    const saveRes = await authFetch(THREADS_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        book_id: bookId,
        group_id: null,
        content: toAiSummaryContent(data.summary),
        current_page: 0,
        is_public: true,
      }),
    });
    if (!saveRes.ok) return { ok: false, message: "AI 요약을 저장하지 못했어요" };
    return { ok: true, aiUnavailable: !!data.ai_unavailable };
  } catch (e) {
    console.error("AI 요약 실패:", e);
    return { ok: false, message: "AI 요약 서버에 연결할 수 없어요" };
  }
}
