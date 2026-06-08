import { useColorScheme } from "@/components/useColorScheme";
import { authFetch, BASE_URL, initAuth } from "@/constants/api";
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

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });
  const [authReady, setAuthReady] = useState(false); // ✅ 추가

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      initAuth().then(async () => {
        setAuthReady(true);
        try {
          // 발자국 체크
          await authFetch(`${BASE_URL}/checklists/check-paw`, {
            method: "POST",
          });
          // ✅ 미완료 체크리스트 다음 독서일로 복사
          await authFetch(`${BASE_URL}/checklists/rollover`, {
            method: "POST",
          });
        } catch (e) {
          console.error("앱 초기화 실패:", e);
        }
      });
    }
  }, [loaded]);

  // ✅ 폰트 로딩 + 로그인 둘 다 완료돼야 렌더링
  if (!loaded || !authReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="bookshelf" options={{ headerShown: false }} />
        <Stack.Screen
          name="folder/[folder_id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="book/[bookshelf_id]"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
