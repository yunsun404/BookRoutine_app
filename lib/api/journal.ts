import { authFetch, BASE_URL } from '@/constants/api';
import type { Journal } from '../types/journal';

const JOURNALS = `${BASE_URL}/journals`;

export class HttpError extends Error {
  constructor(public status: number) { super(`HTTP ${status}`); }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new HttpError(res.status);
  return res.json() as Promise<T>;
}

/** 해당 날짜 일지. 없으면(404) null */
export async function fetchJournal(date: string): Promise<Journal | null> {
  try {
    return await json<Journal>(await authFetch(`${JOURNALS}?date=${date}`));
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  }
}

/** 한 달 동안 일지가 있는 날짜 목록 (캘린더 점 + 버튼 분기용) */
export async function fetchJournalDates(month: string): Promise<string[]> {
  const data = await json<{ dates: string[] }>(
    await authFetch(`${JOURNALS}/dates?month=${month}`),
  );
  return data.dates;
}

/** 일지 생성 (백엔드에서 LLM 호출). 409 = 이미 있음, 422 = 그날 독서 기록 없음 */
export async function createJournal(date: string): Promise<Journal> {
  return json<Journal>(
    await authFetch(JOURNALS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }),
  );
}