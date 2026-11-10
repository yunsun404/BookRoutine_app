/**
 * 입력창(TextInput) 색 — 테마(라이트/다크)별로 한 곳에서 정함
 *
 * 왜: app.json 이 시스템 다크 모드를 따라가서(userInterfaceStyle: "automatic"),
 *     글자색을 안 정한 입력창은 다크 모드에서 흰 글자가 됨 → 흰 입력창에서 안 보임.
 *
 * 지금은 화면·모달 배경이 밝은 색으로 고정돼 있으므로 다크 모드에서도 "흰 상자 + 진한 글자"(A안).
 * 나중에 앱 전체를 다크 모드로 만들면 아래 INPUT_COLORS.dark 만 바꾸면 됨.
 *
 * 사용:
 *   const ic = useInputColors();
 *   <TextInput style={[styles.input, { color: ic.text }]} placeholderTextColor={ic.placeholder} />
 */
import { useColorScheme } from 'react-native';

import { P } from '@/constants/palette';

export interface InputColors {
  /** 입력한 글자 */
  text: string;
  /** 안내 문구 (placeholder) */
  placeholder: string;
  /** 입력창 상자 */
  background: string;
  border: string;
}

const LIGHT: InputColors = {
  text: P.ink,
  placeholder: P.textTertiary,
  background: P.surface,
  border: P.border,
};

export const INPUT_COLORS: { light: InputColors; dark: InputColors } = {
  light: LIGHT,
  // 화면이 아직 밝은 색 고정이라 라이트와 같게 (A안)
  dark: LIGHT,
};

export function useInputColors(): InputColors {
  return useColorScheme() === 'dark' ? INPUT_COLORS.dark : INPUT_COLORS.light;
}
