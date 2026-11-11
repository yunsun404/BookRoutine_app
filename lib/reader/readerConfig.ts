/**
 * 전자책 읽기 화면 설정값 모음
 * (집중 판정 기준값은 lib/gaze/focusJudge.ts 의 FOCUS_JUDGE_POLICY)
 */
import type { ReaderMode } from '../gaze/focusJudge';

export const READER_CONFIG = {
  /**
   * 읽기 화면 방식
   *  - 'page'  : 좌우로 넘기는 페이지 (페이지 나누기가 실패하면 그 세션은 자동으로 'scroll')
   *  - 'scroll': 예전처럼 세로 스크롤
   */
  MODE: 'page' as ReaderMode,
  /** 개발 빌드에서 페이지 모드 읽기 속도·판정 패널 보이기 (기준값 맞추기용) */
  SHOW_PAGE_DEBUG: __DEV__,
  /** 페이지 나누기: 본문을 이 글자 수 근처 줄바꿈에서 잘라 조각마다 따로 잼 (긴 본문에서 한 번에 무거워지지 않게) */
  CHUNK_CHARS: 4000,
  /** 화면 크기를 받은 뒤 이 시간 안에 첫 페이지가 안 나오면 (어느 단계에서 멈췄든) 그 세션은 스크롤 모드로 */
  PAGE_READY_TIMEOUT_MS: 8000,
  /** 페이지 여백 (dp). 위는 상태 칩·위 바 자리, 아래는 손가락 여유 */
  PAGE_PADDING: { horizontal: 24, top: 72, bottom: 48 },
  /** 화면 왼쪽·오른쪽 이 비율 구역을 탭하면 이전·다음 페이지, 가운데는 메뉴(위·아래 바) */
  TAP_ZONE_EDGE_RATIO: 0.25,
} as const;
