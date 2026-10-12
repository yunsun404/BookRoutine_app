// AI 일지 타입 — GET /journals?date= 응답
// LLM 응답(title, content, highlight_sentence_ids, next_suggestion)에
// 백엔드가 책·체크리스트·집중도 원본 데이터를 붙여서 내려준다는 가정.
// 필드명은 기존 API처럼 snake_case.

export interface JournalHighlight {
  sentence_id: string;
  text: string;          // 백엔드가 sentence_id로 찾아서 채운 원문
  page?: number | null;
}

export interface JournalChecklistItem {
  checklist_id: string;
  goal_content: string;
  check_box: boolean;
}

export interface JournalBook {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

export interface Journal {
  journal_id: string;
  date: string;                    // 'YYYY-MM-DD'
  book: JournalBook | null;

  // ── LLM 생성 ──
  title: string;                   // 30자 이내
  content: string;                 // 300~500자, 해요체
  highlights: JournalHighlight[];  // highlight_sentence_ids → 원문으로 변환된 것
  next_suggestion: string;

  // ── 원본 데이터 ──
  checklist: JournalChecklistItem[];
  focus: {
    score: number | null;          // 0~100
    golden_hour: number | null;    // 0~23
  };
}