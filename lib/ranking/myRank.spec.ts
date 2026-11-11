import { findMyRow, isMe, type RankRow } from './myRank';

const rows: RankRow[] = [
  { rank: 1, username: 'alice', nickname: '책벌레', completed_books_count: 3 },
  { rank: 2, username: 'bob', nickname: '책벌레', completed_books_count: 2 }, // 닉네임 겹침
  { rank: 3, username: 'carol', nickname: '캐롤', completed_books_count: 0 },
];

describe('isMe / findMyRow', () => {
  it('아이디로 찾음 (닉네임이 겹쳐도 내 줄만)', () => {
    expect(findMyRow(rows, { username: 'bob', nickname: '책벌레' })?.rank).toBe(2);
    expect(rows.filter((r) => isMe(r, { username: 'bob', nickname: '책벌레' }))).toHaveLength(1);
  });

  it('아이디를 모르면 닉네임으로', () => {
    expect(findMyRow(rows, { nickname: '캐롤' })?.rank).toBe(3);
  });

  it('목록에 없거나 로그인 정보가 없으면 null', () => {
    expect(findMyRow(rows, { username: 'dave', nickname: '데이브' })).toBeNull();
    expect(findMyRow(rows, null)).toBeNull();
    expect(findMyRow(rows, { nickname: '' })).toBeNull();
  });
});
