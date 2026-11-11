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
  /** 딴짓 알림 (소리 + 진동). 판정·서버 값과는 무관, 화면 알림만 */
  DISTRACTION_ALERT: {
    /** 딴짓·멍때림(·자리 비움)이 이만큼 이어지면 울림 (판정이 잠깐 틀려도 안 울리게) */
    DELAY_MS: 10_000,
    /** 한 번 울린 뒤 이 시간 동안은 다시 안 울림 */
    COOLDOWN_MS: 60_000,
    /** 자리 비움(얼굴이 안 보임)도 울릴지 */
    INCLUDE_AWAY: true,
    /** 울릴 때 화면 위에 잠깐 뜨는 알림 표시 시간 (독서 방해 안 되게 짧게) */
    TOAST_MS: 2_000,
  },
  /**
   * [시연용] 독서 시간이 이 초가 되면 골든타임 달성 연출을 미리 보여 줌 (화면 연출만, 실제 골든타임·서버 값과 무관)
   * null 이면 끔 → 실제 골든타임(5분 이어서 집중)을 달성했을 때만 연출
   */
  DEMO_CELEBRATE_AT_SEC: 30 as number | null,
} as const;
