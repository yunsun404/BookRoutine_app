import {
  bookProgress,
  buildServerProgress,
  DEFAULT_TOTAL_PAGES,
  isCompletedShelf,
  parsePageRange,
} from './bookProgress';

const task = (from: number, to: number, done = false) => ({
  goal_content: `데미안 ${from} ~ ${to}쪽 읽기`,
  check_box: done,
});

describe('buildServerProgress (서버 응답 합치기)', () => {
  it('책장의 current_page + 목표의 total_pages 를 책 id 로 합침', () => {
    const shelves = [{ current_page: 19, book: { book_id: 'a' } }];
    const goals = [{ book_id: 'a', book: { book_id: 'a', total_pages: 163 } }];
    expect(buildServerProgress(shelves, goals)).toEqual({ a: { currentPage: 19, totalPages: 163 } });
  });

  it('같은 책 목표가 여러 개면 처음 것(최신)을 씀', () => {
    const goals = [
      { book: { book_id: 'a', total_pages: 200 } },
      { book: { book_id: 'a', total_pages: 100 } },
    ];
    expect(buildServerProgress([], goals).a.totalPages).toBe(200);
  });

  it('폴더에 넣은 책(책장 목록에 없음)은 current_page 가 null', () => {
    expect(buildServerProgress([], [{ book: { book_id: 'b', total_pages: 50 } }])).toEqual({
      b: { currentPage: null, totalPages: 50 },
    });
  });

  it('이상한 응답은 건너뜀', () => {
    expect(buildServerProgress({ message: 'error' }, null)).toEqual({});
    expect(buildServerProgress([{ current_page: 'x', book: { book_id: 'a' } }], [{ book: null }])).toEqual({
      a: { currentPage: null, totalPages: null },
    });
  });
});

describe('bookProgress (홈 읽은 쪽·온도)', () => {
  // 서버는 안 한 칸만 최대 3개 보내 줌 (체크한 칸은 목록에 없음)
  const upcoming = [task(20, 38), task(39, 57), task(58, 76)];

  it('읽은 쪽 = 다음에 읽을 칸의 시작 쪽 - 1 (예전 버그: 남은 목록만 보고 0쪽이 됨)', () => {
    expect(bookProgress(upcoming, { currentPage: 20, totalPages: 163 })).toEqual({ currentPage: 19, totalPages: 163 });
  });

  it('막 등록한 책 → 0쪽 (서버 current_page 는 처음부터 1로 저장돼 있음)', () => {
    expect(bookProgress([task(1, 19), task(20, 38)], { currentPage: 1, totalPages: 163 }).currentPage).toBe(0);
  });

  it('체크를 누르면 그 칸의 끝 쪽이 바로 반영됨', () => {
    expect(bookProgress([task(1, 19, true), task(20, 38)], { currentPage: 1, totalPages: 163 }).currentPage).toBe(19);
  });

  it('마지막 칸을 체크하면 전체 쪽', () => {
    expect(bookProgress([task(153, 163, true)], { currentPage: 171, totalPages: 163 }).currentPage).toBe(163);
  });

  it('남은 칸에 쪽수가 없을 때만 서버 current_page (전체 쪽에서 멈춤)', () => {
    expect(bookProgress([{ goal_content: '자유 읽기', check_box: false }], { currentPage: 30, totalPages: 163 })
      .currentPage).toBe(30);
    expect(bookProgress([], { currentPage: 171, totalPages: 163 }).currentPage).toBe(163);
    expect(bookProgress([], { currentPage: null, totalPages: 163 }).currentPage).toBe(0);
  });

  it('전체 쪽을 모르면 마지막 칸 끝 쪽, 그것도 없으면 기본값', () => {
    expect(bookProgress(upcoming, null).totalPages).toBe(76);
    expect(bookProgress([], null)).toEqual({ currentPage: 0, totalPages: DEFAULT_TOTAL_PAGES });
    expect(bookProgress([{ goal_content: '자유 읽기', check_box: false }], undefined).totalPages).toBe(
      DEFAULT_TOTAL_PAGES,
    );
  });

  it('쉼표 쪽수', () => {
    expect(parsePageRange('책 1,001 ~ 1,200쪽 읽기')).toEqual({ start: 1001, end: 1200 });
  });
});

describe('isCompletedShelf (책장 완독 표시)', () => {
  it('status 1 이거나 progress 100 이상이면 완독', () => {
    expect(isCompletedShelf({ status: 1, progress: 30 })).toBe(true);
    expect(isCompletedShelf({ status: 0, progress: 100 })).toBe(true);
    expect(isCompletedShelf({ status: null, progress: 100.5 })).toBe(true);
  });

  it('그 외는 아님', () => {
    expect(isCompletedShelf({ status: 0, progress: 99.9 })).toBe(false);
    expect(isCompletedShelf({ status: 0, progress: null })).toBe(false);
    expect(isCompletedShelf(undefined)).toBe(false);
  });
});
