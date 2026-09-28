// constants/palette.ts
// BookRoutine 디자인 팔레트 (캘린더 · 책장 · 문장 수집 화면 전용)
//
// 기준 5색
//   #6B7BFF  Primary     — 메인 버튼, 선택 상태, 진행률
//   #A78BFA  Lavender    — 보조 포인트, 폴더/칩
//   #F7F7FA  Background  — 화면 바탕
//   #1F2233  Ink         — 본문 텍스트, 그림자
//   #FF8A7C  Coral       — 강조(FAB, 수집 문장 포인트)
//
// 화면 코드에서는 hex를 직접 쓰지 말고 P.xxx(의미 이름)만 참조한다.
// → 색을 바꾸고 싶을 때 이 파일 한 곳만 고치면 된다.

export const P = {
  // ── 브랜드
  primary: "#6B7BFF",
  primaryDark: "#5563E8",
  primaryLight: "#A78BFA",
  primaryTint: "#EEF0FF", // primary 10% 느낌의 연한 배경 (선택/눌림/칩)
  lavenderTint: "#F1ECFF", // lavender 연한 배경 (폴더 카드, 메모 박스)
  accent: "#FF8A7C",
  accentTint: "#FFF1EE",

  // ── 배경/면
  bg: "#F7F7FA",
  surface: "#FFFFFF",
  coverPlaceholder: "#E9E8F7", // 표지 없는 책 자리

  // ── 텍스트
  ink: "#1F2233",
  inkSoft: "#3A3E55",
  textSecondary: "#6B6F85",
  textTertiary: "#A3A6B8",
  onPrimary: "#FFFFFF", // primary/accent 위에 올라가는 글자

  // ── 선/상태
  border: "#E6E7F0",
  borderStrong: "#D5D7E5",
  disabled: "#D5D7E5",
  danger: "#F0616D",
  star: "#FFB547",

  // ── 기타
  shadow: "#1F2233",
  overlay: "rgba(31, 34, 51, 0.45)",

  // 이미지 5번째 스와치(오렌지→핑크). expo-linear-gradient 설치 시 사용
  accentGradient: ["#FFB27A", "#FF8A7C", "#E58BD0"] as const,
} as const;

// constants/tokens.ts 의 Colors 와 같은 키 이름을 가진 호환 객체.
// calendar.tsx / goals.styles.ts 가 import 경로만 바꾸면 그대로 동작하도록 만든 어댑터.
// (tokens.ts 는 팀원 화면이 쓸 수 있으므로 건드리지 않는다)
export const Colors = {
  bgPrimary: P.surface,
  bgSecondary: P.bg,
  bgPage: P.bg,
  textPrimary: P.ink,
  textSecondary: P.textSecondary,
  textTertiary: P.textTertiary,
  accent: P.accent,
  check: P.primary,
  border: P.border,
  borderStrong: P.borderStrong,
} as const;
