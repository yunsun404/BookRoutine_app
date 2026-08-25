import {
  EbookListItem,
  EbookListResponse,
  FocusSampleInput,
  ReadingSession,
  SessionReward,
} from '../types/ebook';
import { api } from './client';

export async function fetchEbookList(params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<EbookListResponse> {
  const { data } = await api.get('/api/v1/ebooks', { params });
  return data;
}

export interface EbookDetail extends EbookListItem {
  content: string;
  content_url: string | null;
  source: string | null;
}

export async function fetchBookDetail(bookId: string): Promise<EbookDetail> {
  const { data } = await api.get(`/api/v1/ebooks/${bookId}`);
  return data;
}

export async function startReadingSession(bookId: string): Promise<ReadingSession> {
  const { data } = await api.post('/api/v1/ebooks/reading', { bookId });
  return data;
}

export async function sendFocusBatch(
  sessionId: string,
  samples: FocusSampleInput[],
): Promise<{ accepted: number }> {
  const { data } = await api.post('/api/v1/ebooks/reading/focus', {
    sessionId,
    samples,
  });
  return data;
}

export async function endReadingSession(
  sessionId: string,
  samples?: FocusSampleInput[],
): Promise<ReadingSession> {
  const { data } = await api.patch('/api/v1/ebooks/reading/end', {
    sessionId,
    samples,
  });
  return data;
}

export async function fetchSessionFocusDetail(sessionId: string) {
  const { data } = await api.get(`/api/v1/ebooks/sessions/${sessionId}/focus`);
  return data as { session: ReadingSession; timeline: any[] };
}

export async function fetchReadingHistory(params: { page?: number; limit?: number }) {
  const { data } = await api.get('/api/v1/ebooks/me/history', { params });
  return data as EbookListResponse & { items: (ReadingSession & { book: any })[] };
}

export async function fetchSessionReward(sessionId: string): Promise<SessionReward> {
  const { data } = await api.get(`/api/v1/ebooks/sessions/${sessionId}/reward`);
  return data;
}