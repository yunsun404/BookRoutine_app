/**
 * 책 진행 계산 (순수 로직)
 *
 * 홈 카드의 "읽은 쪽 / 전체 쪽"·온도 — bookProgress
 *   서버의 /checklists/upcoming 은 "아직 안 한 체크리스트, 책마다 최대 3개"만 보내 줌.
 *   그래서 그 목록만 보면 체크한 항목이 항상 없어서 0쪽이 됨 (체크 직후 잠깐 올랐다가 0으로 돌아가던 버그).
 *   → 읽은 쪽: 남은 칸 중 "다음에 읽을 칸의 시작 쪽 - 1" (체크한 칸이 있으면 그 끝 쪽까지)
 *     전체 쪽: GET /reading-goals 의 book.total_pages
 *     남은 칸에 쪽수가 없을 때만 GET /bookshelf 의 current_page 를 씀
 *     (/bookshelf 는 폴더에 넣은 책을 빼고 보내 줌)
 *
 * isCompletedShelf: 책장 "완독" 표시
 *   서버의 status 가 1 이거나, 서버가 계산한 progress 가 100 이상이면 완독
 *   (지금 서버는 status 를 1로 바꾸는 곳이 없어서 progress 로도 판단)
 */

export interface PageTask {
  goal_content: string;
  check_box: boolean;
}

/** 서버에서 가져온 책 한 권의 진행 정보 (모르면 null) */
export interface ServerProgress {
  currentPage: number | null;
  totalPages: number | null;
}

/** "11 ~ 20쪽" → {start: 11, end: 20}. 쉼표 허용 ("1,200") */
export function parsePageRange(text: string): { start: number; end: number } | null {
  const m = text.match(/([\d,]+)\s*~\s*([\d,]+)/);
  if (!m) return null;
  const start = parseInt(m[1].replace(/,/g, ''), 10);
  const end = parseInt(m[2].replace(/,/g, ''), 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

/** 쪽수를 못 읽었을 때 전체 쪽 기본값 (예전 화면과 같게) */
export const DEFAULT_TOTAL_PAGES = 100;

const asPage = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

/**
 * GET /bookshelf 와 GET /reading-goals 응답을 책 id 별로 합침.
 * 응답 모양이 이상하면 그 부분만 건너뜀 (null).
 * 목표는 최신순으로 오므로 같은 책이면 처음 것(가장 최근 목표)을 씀.
 */
export function buildServerProgress(shelves: unknown, goals: unknown): Record<string, ServerProgress> {
  const map: Record<string, ServerProgress> = {};
  const get = (id: string) => (map[id] ??= { currentPage: null, totalPages: null });

  if (Array.isArray(shelves)) {
    for (const s of shelves) {
      const id = s?.book?.book_id;
      if (typeof id === 'string') get(id).currentPage = asPage(s.current_page);
    }
  }
  if (Array.isArray(goals)) {
    for (const g of goals) {
      const id = g?.book?.book_id ?? g?.book_id;
      if (typeof id !== 'string') continue;
      const entry = get(id);
      if (entry.totalPages === null) entry.totalPages = asPage(g?.book?.total_pages) || null;
    }
  }
  return map;
}

/** 서버 값이 없을 때 남은 체크리스트로 읽은 쪽 짐작: 안 한 첫 칸의 시작 쪽 - 1 */
function guessReadPages(tasks: PageTask[]): number {
  let firstUnchecked = Infinity;
  let maxChecked = 0;
  for (const t of tasks) {
    const r = parsePageRange(t.goal_content);
    if (!r) continue;
    if (t.check_box) maxChecked = Math.max(maxChecked, r.end);
    else firstUnchecked = Math.min(firstUnchecked, r.start);
  }
  if (firstUnchecked !== Infinity) return Math.max(firstUnchecked - 1, maxChecked);
  return maxChecked;
}

/** 홈 카드에 보여 줄 읽은 쪽 / 전체 쪽. 읽은 쪽은 0 ~ 전체 쪽 사이로 맞춤 */
export function bookProgress(
  tasks: PageTask[],
  server?: ServerProgress | null,
): { currentPage: number; totalPages: number } {
  let totalPages = server?.totalPages ?? 0;
  if (!(totalPages > 0)) {
    const last = tasks.length > 0 ? parsePageRange(tasks[tasks.length - 1].goal_content) : null;
    totalPages = last && last.end > 0 ? last.end : DEFAULT_TOTAL_PAGES;
  }
  // 읽은 쪽은 남은 칸 기준(다음에 읽을 칸의 시작 쪽 - 1)이 우선.
  // 서버 current_page 는 처음부터 1로 저장되고(0이어야 함), 마지막 칸도 하루 쪽수만큼 더해서
  // 실제와 어긋남 → 남은 칸에서 쪽수를 못 읽을 때만 씀.
  // 체크를 누르면 그 칸이 check_box=true 가 되므로 그 끝 쪽이 바로 반영됨 (서버 응답 기다리지 않음)
  const hasRange = tasks.some((t) => parsePageRange(t.goal_content) !== null);
  const raw = hasRange ? guessReadPages(tasks) : (server?.currentPage ?? 0);
  return { currentPage: Math.min(Math.max(raw, 0), totalPages), totalPages };
}

export function isCompletedShelf(shelf: { status?: number | null; progress?: number | null } | null | undefined): boolean {
  if (!shelf) return false;
  return shelf.status === 1 || (shelf.progress ?? 0) >= 100;
}
