// constants/sentenceApi.ts
// 문장 수집 관련 API 호출을 한 곳에 모은 파일입니다 (storeApi.ts와 같은 역할).
// 화면 컴포넌트는 "무엇을" 할지만 알고, "어떤 URL에 어떤 형식으로" 보내는지는 여기서만 압니다.
// → 나중에 엔드포인트가 바뀌어도 이 파일 하나만 고치면 됩니다.
import { authFetch, BASE_URL } from "./api";

export type SentenceSource = "OCR" | "MANUAL";

export interface Sentence {
  sentence_id: string;
  user_id: string;
  book_id: string;
  content: string;
  page: number | null;
  memo: string | null;
  source: SentenceSource;
  created_at: string;
  updated_at: string;
}

export interface CreateSentenceInput {
  book_id: string;
  content: string;
  page?: number | null;
  memo?: string | null;
  source: SentenceSource;
}

export interface UpdateSentenceInput {
  content?: string;
  page?: number | null;
  memo?: string | null;
}

export interface OcrResult {
  text: string;
  lines: string[];
  confidence: number;
}

// Nest 에러 응답({ message: string | string[] })을 사람이 읽을 메시지로 바꿔 throw 합니다.
async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new Error(message ?? fallback);
  }
  return res.json() as Promise<T>;
}

export async function getSentences(bookId: string): Promise<Sentence[]> {
  const res = await authFetch(`${BASE_URL}/sentences?book_id=${encodeURIComponent(bookId)}`);
  return parse<Sentence[]>(res, "문장 목록을 불러오지 못했어요.");
}

export async function createSentence(input: CreateSentenceInput): Promise<Sentence> {
  const res = await authFetch(`${BASE_URL}/sentences`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parse<Sentence>(res, "문장을 저장하지 못했어요.");
}

export async function updateSentence(sentenceId: string, input: UpdateSentenceInput): Promise<Sentence> {
  const res = await authFetch(`${BASE_URL}/sentences/${sentenceId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return parse<Sentence>(res, "문장을 수정하지 못했어요.");
}

export async function deleteSentence(sentenceId: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/sentences/${sentenceId}`, { method: "DELETE" });
  await parse<{ sentence_id: string }>(res, "문장을 삭제하지 못했어요.");
}

// 사진(base64) → 서버 → CLOVA OCR → 인식된 텍스트
export async function scanSentenceImage(imageBase64: string, format: "jpg" | "png" = "jpg"): Promise<OcrResult> {
  const res = await authFetch(`${BASE_URL}/ocr/scan`, {
    method: "POST",
    body: JSON.stringify({ image_base64: imageBase64, format }),
  });
  return parse<OcrResult>(res, "문장을 인식하지 못했어요.");
}

// ───────── 검색 ─────────
export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface SentenceSearchItem extends Sentence {
  score: number;
  book: {
    book_id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  } | null;
}

export interface SentenceSearchResult {
  query: string;
  terms: string[]; // 서버가 정규화한 검색어 토큰 → 하이라이트 기준
  mode: SearchMode;
  total: number;
  truncated: boolean;
  limit: number;
  offset: number;
  took_ms: number;
  items: SentenceSearchItem[];
}

export async function searchSentences(
  q: string,
  opts: {
    mode?: SearchMode;
    bookId?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal; // 새 검색어가 들어오면 이전 요청을 취소하기 위함
  } = {},
): Promise<SentenceSearchResult> {
  const params = new URLSearchParams({ q, mode: opts.mode ?? "keyword" });
  if (opts.bookId) params.set("book_id", opts.bookId);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));

  const res = await authFetch(`${BASE_URL}/sentences/search?${params.toString()}`, {
    signal: opts.signal,
  });
  return parse<SentenceSearchResult>(res, "문장을 검색하지 못했어요.");
}
