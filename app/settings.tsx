import { P } from "@/constants/palette";
import { userApi } from "@/lib/api";
import { performLogout } from "@/lib/auth/logout";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * 설정 화면 (우측 상단 메뉴 → 설정)
 * 이미 있는 기능·값만 모아 둠 — 새 서버 기능 없음
 *  - 알림 받기: GET /users/me 의 notifications_enabled, PATCH /users/me/notification-settings
 *  - 휴대폰 알림 권한 안내: expo-notifications 권한 확인
 *  - 내 프로필 수정: 기존 editprofile 화면
 *  - 앱 버전: app.json 의 version (expo-constants)
 *  - 로그아웃: lib/auth/logout.ts
 */
export default function SettingsScreen() {
  const [notiEnabled, setNotiEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? "-";

  // 화면에 들어올 때마다 서버 값·휴대폰 권한을 새로 확인 (휴대폰 설정에서 권한을 켜고 돌아온 경우 포함)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const me = await userApi.getMe();
          setNotiEnabled(me.notifications_enabled ?? true);
        } catch (e) {
          console.error("알림 설정 불러오기 실패:", e);
        }
        if (Platform.OS !== "web") {
          try {
            const { status } = await Notifications.getPermissionsAsync();
            setPermissionDenied(status !== "granted");
          } catch {
            setPermissionDenied(false);
          }
        }
      })();
    }, []),
  );

  const toggleNotifications = async (next: boolean) => {
    if (saving || notiEnabled === null) return;
    const prev = notiEnabled;
    setNotiEnabled(next); // 화면에서 먼저 바꾸고, 실패하면 되돌림
    setSaving(true);
    try {
      const res = await userApi.updateNotificationSettings(next);
      setNotiEnabled(res.notifications_enabled);
    } catch (e) {
      console.error("알림 설정 저장 실패:", e);
      setNotiEnabled(prev);
      Alert.alert("저장하지 못했어요", "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    if (loggingOut) return;
    Alert.alert("로그아웃", "로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await performLogout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/homescreen"))}
          hitSlop={8}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={22} color={P.ink} />
        </Pressable>
        <Text style={s.headerTitle}>설정</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* 알림 */}
        <Text style={s.sectionLabel}>알림</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Ionicons name="notifications-outline" size={20} color={P.primary} />
            <View style={s.rowTextWrap}>
              <Text style={s.rowTitle}>알림 받기</Text>
              <Text style={s.rowSub}>독서 알림을 푸시로 받아요</Text>
            </View>
            {notiEnabled === null ? (
              <ActivityIndicator size="small" color={P.primary} />
            ) : (
              <Switch
                value={notiEnabled}
                onValueChange={toggleNotifications}
                disabled={saving}
                trackColor={{ false: P.disabled, true: P.primary }}
                thumbColor="#fff"
                accessibilityLabel="알림 받기"
              />
            )}
          </View>

          {notiEnabled && permissionDenied && (
            <Pressable style={s.notice} onPress={() => Linking.openSettings()}>
              <Ionicons name="information-circle-outline" size={16} color={P.accent} />
              <Text style={s.noticeText}>
                휴대폰 설정에서 알림 권한을 켜야 알림이 와요. 눌러서 설정 열기
              </Text>
            </Pressable>
          )}
        </View>

        {/* 계정 */}
        <Text style={s.sectionLabel}>계정</Text>
        <View style={s.card}>
          <Pressable style={s.row} onPress={() => router.push("/editprofile")}>
            <Ionicons name="person-outline" size={20} color={P.primary} />
            <Text style={[s.rowTitle, s.rowFlex]}>내 프로필 수정</Text>
            <Ionicons name="chevron-forward" size={18} color={P.textTertiary} />
          </Pressable>
          <View style={s.divider} />
          <Pressable style={s.row} onPress={confirmLogout} disabled={loggingOut}>
            <Ionicons name="log-out-outline" size={20} color={P.danger} />
            <Text style={[s.rowTitle, s.rowFlex, { color: P.danger }]}>로그아웃</Text>
            {loggingOut && <ActivityIndicator size="small" color={P.danger} />}
          </Pressable>
        </View>

        {/* 앱 정보 */}
        <Text style={s.sectionLabel}>앱 정보</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Ionicons name="information-circle-outline" size={20} color={P.primary} />
            <Text style={[s.rowTitle, s.rowFlex]}>앱 버전</Text>
            <Text style={s.rowValue}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: P.ink, letterSpacing: -0.4 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: P.textSecondary, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: P.surface, borderRadius: 16, borderWidth: 1, borderColor: P.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  rowTextWrap: { flex: 1 },
  rowFlex: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  rowSub: { fontSize: 12, color: P.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 14, color: P.textSecondary },
  divider: { height: 1, backgroundColor: P.border, marginLeft: 48 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: P.accentTint,
  },
  noticeText: { flex: 1, fontSize: 12, color: P.inkSoft, lineHeight: 17 },
});
