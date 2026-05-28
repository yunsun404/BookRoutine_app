/*
========================================
_layout.tsx 역할 설명

1. Expo Router의 전체 화면 구조를 관리하는 파일
2. 어떤 페이지(goals, index, explore 등)를 보여줄지 결정
3. ThemeProvider는 다크모드/라이트모드 테마 적용
4. AnimatedSplashOverlay는 앱 시작 애니메이션
5. Stack은 페이지 이동(goals → index 등)을 가능하게 함

기존 코드 문제:
- AppTabs만 직접 렌더링해서
  goals.tsx 같은 새 페이지 라우팅이 막혀 있었음

수정 후:
- Stack 기반 라우팅으로 변경
- /goals 주소 정상 접근 가능
========================================
*/

import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  );
}