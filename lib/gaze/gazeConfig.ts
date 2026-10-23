/**
 * 시선추적(앱 내부 추론) 설정값 모음
 * - 실제 기기에서 테스트하며 조정할 값은 전부 여기에 모아 둠
 */
export const GAZE_CONFIG = {
  /** 몇 ms마다 1번 검사할지 (판정 단위가 30초라 0.5초면 충분) */
  SAMPLE_INTERVAL_MS: 500,
  /** 검사용 사진 해상도 목표 (작을수록 빠름. 실제 값은 기기가 가까운 값으로 맞춤) */
  PHOTO_TARGET: { width: 640, height: 480 },
  /** 얼굴 검출 전에 사진 긴 변을 이 크기 이하로 줄임 */
  MAX_DETECT_SIDE: 640,
  /** 이 크기보다 작은 얼굴은 무시 (사진 폭 대비 비율, 책 읽는 거리면 얼굴이 큼) */
  MIN_FACE_SIZE: 0.2,

  /** 모델 입력 눈 이미지 크기 (학습: eye_size=64) */
  EYE_SIZE: 64,
  /** 눈 주변을 얼마나 넉넉히 자를지 (학습: eye_box_scale=1.8) */
  EYE_BOX_SCALE: 1.8,
  /** 두 눈 사이가 이 픽셀보다 가까우면 실패 처리 (얼굴이 너무 작음) */
  MIN_EYE_DIST_PX: 20,

  /**
   * nitro-image의 rotate(deg)에서 +가 "시계 방향"이면 true.
   * 확인 화면에서 잘린 눈이 기울어져 보이면(고개를 기울였을 때 더 기울어짐) false로 바꿀 것.
   */
  ROTATE_CLOCKWISE_POSITIVE: true,
} as const;
