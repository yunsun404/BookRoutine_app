/**
 * 랭킹 목록에서 "나" 찾기 (순수 로직)
 * 아이디(username)로 비교 — 닉네임은 다른 사람과 겹칠 수 있음.
 * 아이디를 아직 모르면(예전 로그인 정보) 닉네임으로 비교
 */
export interface RankRow {
  rank: number;
  username: string;
  nickname: string;
  completed_books_count: number;
}

export interface Me {
  username?: string | null;
  nickname?: string | null;
}

export function isMe(row: Pick<RankRow, 'username' | 'nickname'>, me: Me | null | undefined): boolean {
  if (!me) return false;
  if (me.username) return row.username === me.username;
  return !!me.nickname && row.nickname === me.nickname;
}

/** 목록에 내가 있으면 그 줄, 없으면 null (서버가 상위 20명만 줌) */
export function findMyRow<T extends RankRow>(rows: T[], me: Me | null | undefined): T | null {
  return rows.find((r) => isMe(r, me)) ?? null;
}
