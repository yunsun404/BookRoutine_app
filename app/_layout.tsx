import { useColorScheme } from "@/components/useColorScheme";
import { getToken } from "@/constants/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // 자동 로그인 제거 — 토큰 유무만 확인해서 스플래시를 내림.
      // 실제 화면 분기(로그인 화면 vs 메인 화면)는 index.tsx가 담당.
      (async () => {
        try {
          await getToken(); // 토큰 존재 여부 미리 로드 (필요 시 다른 초기화 작업 추가 가능)
        } catch (e) {
          console.error("앱 초기화 실패:", e);
        } finally {
          setAppReady(true);
          await SplashScreen.hideAsync();
        }
      })();
    }
  }, [loaded]);

  if (!loaded || !appReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{ title: "Login", headerShown: true }}
        />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", headerShown: true }}
        />
        <Stack.Screen name="bookshelf" />
        <Stack.Screen name="folder/[folder_id]" />
        <Stack.Screen name="book/[bookshelf_id]" />
        <Stack.Screen
          name="(auth)/signup"
          options={{ title: "Sign Up", headerShown: true }}
        />
        <Stack.Screen
          name="(auth)/logout"
          options={{ title: "Logout", headerShown: true }}
        />
        <Stack.Screen name="ranking" />
      </Stack>
    </ThemeProvider>
  );
}
