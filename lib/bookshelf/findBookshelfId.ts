/**
 * 책 번호(book_id)로 내 책장 번호(bookshelf_id) 찾기
 * 홈의 타래 버튼 → 내 책장의 그 책 화면(/book/{bookshelf_id})으로 보내기 위해 씀
 *
 * 1) GET /bookshelf 목록에서 찾기 (서버가 폴더에 넣은 책은 빼고 보내 줌)
 * 2) 없으면 GET /bookshelf/folders 에서 그 책이 든 폴더를 찾고
 *    GET /bookshelf/folders/{folder_id}/books 의 book.bookshelves[0].bookshelf_id
 *
 * 결과: { ok: true, bookshelfId } | { ok: false, reason: 'not_found' | 'network' }
 */

export type FindBookshelfResult =
  | { ok: true; bookshelfId: string }
  | { ok: false; reason: 'not_found' | 'network' };

/** GET /bookshelf 응답에서 찾기 */
export function findInShelfList(list: unknown, bookId: string): string | null {
  if (!Array.isArray(list)) return null;
  const hit = list.find((s) => s?.book?.book_id === bookId);
  return typeof hit?.bookshelf_id === 'string' ? hit.bookshelf_id : null;
}

/** GET /bookshelf/folders 응답에서 그 책이 든 폴더 id 들 */
export function foldersContaining(folders: unknown, bookId: string): string[] {
  if (!Array.isArray(folders)) return [];
  return folders
    .filter(
      (f) => Array.isArray(f?.folder_books) && f.folder_books.some((fb: any) => fb?.book?.book_id === bookId),
    )
    .map((f) => f.folder_id)
    .filter((id): id is string => typeof id === 'string');
}

/** GET /bookshelf/folders/{id}/books 응답에서 찾기 */
export function findInFolderBooks(list: unknown, bookId: string): string | null {
  if (!Array.isArray(list)) return null;
  const hit = list.find((fb) => fb?.book?.book_id === bookId);
  const id = hit?.book?.bookshelves?.[0]?.bookshelf_id;
  return typeof id === 'string' ? id : null;
}

/** path 를 받아 JSON 을 돌려주는 함수 (실패면 throw). 테스트에서 가짜로 바꿔 끼움 */
export type GetJson = (path: string) => Promise<unknown>;

export async function findBookshelfId(bookId: string, getJson: GetJson): Promise<FindBookshelfResult> {
  if (!bookId) return { ok: false, reason: 'not_found' };
  try {
    const direct = findInShelfList(await getJson('/bookshelf'), bookId);
    if (direct) return { ok: true, bookshelfId: direct };

    for (const folderId of foldersContaining(await getJson('/bookshelf/folders'), bookId)) {
      const id = findInFolderBooks(await getJson(`/bookshelf/folders/${folderId}/books`), bookId);
      if (id) return { ok: true, bookshelfId: id };
    }
    return { ok: false, reason: 'not_found' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
