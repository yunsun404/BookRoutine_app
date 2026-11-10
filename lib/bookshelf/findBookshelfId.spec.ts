import { findBookshelfId, findInFolderBooks, findInShelfList, foldersContaining } from './findBookshelfId';

const shelf = [
  { bookshelf_id: 's1', book: { book_id: 'b1' } },
  { bookshelf_id: 's2', book: { book_id: 'b2' } },
];
const folders = [
  { folder_id: 'f1', folder_books: [{ book: { book_id: 'b9' } }] },
  { folder_id: 'f2', folder_books: [{ book: { book_id: 'b3' } }] },
];
const folderBooks: Record<string, unknown> = {
  f2: [{ book: { book_id: 'b3', bookshelves: [{ bookshelf_id: 's3' }] } }],
};

const fakeGet = (calls: string[] = []) => async (path: string) => {
  calls.push(path);
  if (path === '/bookshelf') return shelf;
  if (path === '/bookshelf/folders') return folders;
  const m = path.match(/^\/bookshelf\/folders\/(\w+)\/books$/);
  if (m) return folderBooks[m[1]] ?? [];
  throw new Error('unknown');
};

describe('findBookshelfId (홈 타래 → 내 책장의 그 책)', () => {
  it('책장 목록에 있으면 바로 찾음 (폴더는 안 봄)', async () => {
    const calls: string[] = [];
    expect(await findBookshelfId('b2', fakeGet(calls))).toEqual({ ok: true, bookshelfId: 's2' });
    expect(calls).toEqual(['/bookshelf']);
  });

  it('폴더에 넣은 책은 폴더 안 목록에서 찾음', async () => {
    expect(await findBookshelfId('b3', fakeGet())).toEqual({ ok: true, bookshelfId: 's3' });
  });

  it('어디에도 없으면 not_found', async () => {
    expect(await findBookshelfId('nope', fakeGet())).toEqual({ ok: false, reason: 'not_found' });
    expect(await findBookshelfId('', fakeGet())).toEqual({ ok: false, reason: 'not_found' });
  });

  it('서버 연결 실패면 network', async () => {
    const fail = async () => {
      throw new Error('offline');
    };
    expect(await findBookshelfId('b1', fail)).toEqual({ ok: false, reason: 'network' });
  });

  it('응답 모양이 이상하면 못 찾음으로 처리', () => {
    expect(findInShelfList({ message: 'x' }, 'b1')).toBeNull();
    expect(foldersContaining(null, 'b1')).toEqual([]);
    expect(findInFolderBooks([{ book: { book_id: 'b3', bookshelves: [] } }], 'b3')).toBeNull();
  });
});
