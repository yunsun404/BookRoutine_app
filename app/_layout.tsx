import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";

// 에러 발생 시 앱이 완전히 멈추지 않고 화면에 에러를 보여주도록 설정
export { ErrorBoundary } from "expo-router";

// 앱 시작 시 가장 먼저 보여줄 경로 설정 (초기 진입점을 login 페이지인 index로 유지)
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// 폰트가 로드될 때까지 스플래시 화면(로딩 화면)을 유지함
SplashScreen.preventAutoHideAsync();

// 사용할 폰트 불러오기
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // 폰트 로드 중 에러가 발생하면 던짐
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 폰트 로드가 완료되면 스플래시 화면을 숨김
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 폰트가 로드되기 전에는 아무것도(null) 보여주지 않음
  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// 실제 내비게이션 구조를 그리는 컴포넌트
function RootLayoutNav() {
  const colorScheme = useColorScheme(); // 현재 시스템의 라이트/다크 모드 감지

  return (
    // 테마 설정 (시스템 설정에 따라 다크/라이트 적용)
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Stack은 화면이 쌓이는 구조(페이지 이동)를 담당합니다.
            여기 정의된 name들은 app/ 폴더 안에 있는 파일/폴더 이름과 일치해야 합니다. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="bookshelf" options={{ headerShown: false }} />
        
        {/* 통계 및 폴더/북 상세 페이지 경로 연동 */}
        <Stack.Screen name="folder/[folder_id]" options={{ headerShown: false }} />
        <Stack.Screen name="book/[bookshelf_id]" options={{ headerShown: false }} />
        
        {/* 인증 관련 라우트 (index는 루트 폴더에 있고, signup/logout은 (auth) 폴더 안에 있으므로 경로 수정) */}
        <Stack.Screen name="index" options={{ title: 'login' }} />
        <Stack.Screen name="(auth)/signup" options={{ title: 'signup' }} />
        <Stack.Screen name="(auth)/logout" options={{ title: 'logout' }} />

        {/* 🛠️ [수정] 실제 라우트 목록에 'ranking'으로 잡혀 있으므로 중복 경로 수정 */}
        <Stack.Screen name="ranking" options={{ headerShown: false }} />

        {/* 🛠️ [주의] 'goals' 화면은 (tabs)/_layout.tsx 내부에서 이미 정의 및 href: null 처리가 
            완료되었으므로, 중복 에러를 막기 위해 최상단 Stack에서는 제거했습니다! */}
      </Stack>
    </ThemeProvider>
  );
}