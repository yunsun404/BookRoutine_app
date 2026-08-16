import { useColorScheme } from "@/components/useColorScheme";
import { authFetch, BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/store/useAuthStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";

export { ErrorBoundary } from "expo-router";

// 초기 로딩 시 스플래시 화면 유지
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // 폰트 로딩 중 에러 발생 시 처리
    if (error) throw error;
  }, [error]);

  // 새로고침 시 자동 로그인 시도
  const { restoreToken } = useAuthStore();

  useEffect(() => {
    if (loaded) {
      restoreToken().then(async () => {
        try {
          // 인증 로직 실행
          await authFetch(`${BASE_URL}/checklists/check-paw`, { method: "POST" });
          await authFetch(`${BASE_URL}/checklists/rollover`, { method: "POST" });
        } catch (e) {
          console.error("앱 초기화 실패:", e);
        } finally {
          setAuthReady(true);
          // 모든 준비가 완료되면 스플래시 화면 숨김
          await SplashScreen.hideAsync();
        }
      });
    }
  }, [loaded]);

  // 폰트나 인증이 준비되지 않았을 때는 아무것도 렌더링하지 않음 (스플래시 화면 유지)
  if (!loaded || !authReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 모든 경로를 여기에 정의하거나, 중첩 라우터를 사용하세요 */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: true }} />
        <Stack.Screen name="bookshelf" />
        <Stack.Screen name="folder/[folder_id]" />
        <Stack.Screen name="book/[bookshelf_id]" />
        <Stack.Screen name="index" options={{ title: "Login", headerShown: true }} />
        <Stack.Screen name="(auth)/signup" options={{ title: "Sign Up", headerShown: true }} />
        <Stack.Screen name="(auth)/logout" options={{ title: "Logout", headerShown: true }} />
        <Stack.Screen name="ranking" />
      </Stack>
    </ThemeProvider>
  );
}