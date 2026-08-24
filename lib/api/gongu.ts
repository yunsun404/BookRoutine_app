// lib/api/gongu.ts
// 공유마당 어문 저작물 검색 → 상세 → 뷰어 원문(HTML 조각) 파싱
// 검증 완료: 뷰어는 {rs}/{fn}.files/1.html, 2.html... 순서로 정적 HTML을 반환함

import { GonguFullText } from '../types/ebook';

const GONGU_SEARCH_URL = 'https://gongu.copyright.or.kr/gongu/wrt/wrtApi/search.json';
const GONGU_DETAIL_URL = 'https://gongu.copyright.or.kr/gongu/wrt/wrtApi/searchDetail.json';
const GONGU_ORIGIN = 'https://gongu.copyright.or.kr';
const GONGU_API_KEY = process.env.EXPO_PUBLIC_GONGU_API_KEY;

const WRT_TY_TEXT = '10001'; // 저작물유형: 어문
const MAX_PAGES = 200; // 무한루프 방지용 상한

interface GonguSearchItem {
  wrtSn: number;
  orginSj: string;
  authorListNm: string;
  linkUrl: string;
}

interface GonguSearchResponse {
  resultList: GonguSearchItem[];
  resultCnt: number;
}

interface GonguDetailResponse {
  wrtSn: string;
  orginSj: string;
  authrNm: string;
  gonguLinkUrl: string;
  [key: string]: any;
}

async function searchGonguText(title: string): Promise<GonguSearchItem | null> {
  const url =
    `${GONGU_SEARCH_URL}?keyword=${encodeURIComponent(title)}` +
    `&wrtTy=${WRT_TY_TEXT}&pageUnit=5&pageIndex=1` +
    `&apiKey=${GONGU_API_KEY}`;

  const res = await fetch(url);
  const json: GonguSearchResponse = await res.json();

  if (!json.resultList || json.resultList.length === 0) return null;

  const exact = json.resultList.find((item) => item.orginSj.includes(title));
  return exact ?? json.resultList[0];
}

async function fetchGonguDetail(wrtSn: number): Promise<GonguDetailResponse | null> {
  const url = `${GONGU_DETAIL_URL}?wrtSn=${wrtSn}&apiKey=${GONGU_API_KEY}`;
  const res = await fetch(url);
  const json: GonguDetailResponse = await res.json();
  return json ?? null;
}

// 상세페이지 HTML 안에서 뷰어 iframe의 fn/rs 파라미터 추출
// 뷰어 URL 형태: /viewer/skin/doc.html?fn={uuid}&rs=/webview/result/...
function extractViewerParams(html: string): { fn: string; rs: string } | null {
  const match = html.match(/doc\.html\?fn=([^&"']+)&rs=([^&"']+)/);
  if (!match) return null;

  return {
    fn: decodeURIComponent(match[1]),
    rs: decodeURIComponent(match[2]),
  };
}

// {origin}{rs}{fn}.files/{n}.html 을 1번부터 순서대로 가져와서 이어붙임
// 404가 뜨면 그 지점에서 페이지가 끝난 것으로 판단하고 종료
async function fetchAllContentPages(fn: string, rs: string): Promise<string> {
  const baseUrl = `${GONGU_ORIGIN}${rs}${fn}.files`;
  const pages: string[] = [];

  for (let i = 1; i <= MAX_PAGES; i++) {
    const res = await fetch(`${baseUrl}/${i}.html`);
    if (!res.ok) break; // 더 이상 페이지 없음

    const html = await res.text();
    pages.push(html);
  }

  return pages.join('\n');
}

// <p><span>...</span></p> 구조를 문단 단위 텍스트로 변환
function parseViewerHtml(html: string): string {
  const paragraphs: string[] = [];
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(html)) !== null) {
    const inner = pMatch[1];
    const text = inner
      .replace(/<[^>]+>/g, '') // span 등 태그 제거
      .replace(/&#160;/g, '') // 줄바꿈용 nbsp 제거
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    paragraphs.push(text); // 빈 문단도 유지해서 문단 간격 살림
  }

  // 연속된 빈 줄은 하나로 정리
  return paragraphs.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function fetchGonguFullText(bookTitle: string): Promise<GonguFullText | null> {
  const searchResult = await searchGonguText(bookTitle);
  if (!searchResult) return null;

  const detail = await fetchGonguDetail(searchResult.wrtSn);
  if (!detail) return null;

  const detailUrl = detail.gonguLinkUrl || searchResult.linkUrl;

  // 상세페이지 HTML을 가져와서 뷰어 파라미터(fn, rs) 추출
  const detailRes = await fetch(detailUrl);
  const detailHtml = await detailRes.text();

  const viewerParams = extractViewerParams(detailHtml);
  if (!viewerParams) return null;

  const rawHtml = await fetchAllContentPages(viewerParams.fn, viewerParams.rs);
  const content = parseViewerHtml(rawHtml);

  if (!content) return null;

  return {
    title: detail.orginSj || bookTitle,
    author: detail.authrNm || searchResult.authorListNm || null,
    content,
    sourceUrl: detailUrl,
  };
}