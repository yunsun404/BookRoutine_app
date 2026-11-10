import { setSessionExpiredHandler } from "@/lib/auth/session";
import { useAuthStore } from "@/store/useAuthStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import "react-native-reanimated";
import FloatingTabMenu from "../components/FloatingTabMenu";
export { ErrorBoundary } from "expo-router";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
    ...Ionicons.font,
  });
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    if (error) throw error;
  }, [error]);
  // 토큰이 만료돼 갱신도 안 되면 (lib/auth/session.ts): 로그인 상태를 지우고 로그인 화면으로
  useEffect(
    () =>
      setSessionExpiredHandler(() => {
        useAuthStore.setState({ user: null, access_token: null, isLoggedIn: false });
        router.replace("/");
      }),
    [],
  );
  // 저장된 토큰 복원이 끝난 뒤에 화면을 그림 (그동안 스플래시 유지)
  useEffect(() => {
    if (loaded) {
      (async () => {
        try {
          await useAuthStore.getState().restoreToken();
        } catch (e) {
          console.error("초기화 실패:", e);
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
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{ title: "Login", headerShown: true }}
          />
          <Stack.Screen name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { paddingBottom: 80 } // 탭 화면에 패딩 적용
            }} />
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
        <FloatingTabMenu />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
