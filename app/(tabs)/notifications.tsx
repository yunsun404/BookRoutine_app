import { P } from "@/constants/palette";
import { notificationApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationItem = {
  notification_id: string;
  type: string | null;
  title: string | null;
  content: string | null;
  is_read: boolean;
  created_at: string;
};

// 상대 시간 표시 ("몇 분 전" / "몇 시간 전" / "며칠 전") — 별도 날짜 라이브러리를
// 새로 깔지 않고, checklists.service.ts에서 이미 쓰는 것과 같은 "직접 계산" 방식.
function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getList();
      setNotifications(res.notifications as NotificationItem[]);
    } catch (e) {
      console.error("알림 목록 불러오기 실패:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 이 화면에 들어올 때마다(다른 탭 갔다가 돌아올 때도) 새로 불러옵니다 —
  // homescreen.tsx의 fetchUpcoming도 같은 useFocusEffect 패턴을 씁니다.
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const handlePress = async (item: NotificationItem) => {
    if (item.is_read) return;

    // 낙관적 업데이트: 서버 응답을 기다리지 않고 화면부터 읽음 표시로 바꿉니다.
    // 실패해도 치명적이지 않은 UI 상태(읽음 여부)라서, 사용자 체감 속도를 우선했습니다.
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === item.notification_id
          ? { ...n, is_read: true }
          : n,
      ),
    );

    try {
      await notificationApi.markAsRead(item.notification_id);
    } catch (e) {
      console.error("읽음 처리 실패:", e);
    }
  };

  // 위쪽 바: 뒤로 가기 + 제목 (전자책·독서 목표·타래 화면의 뒤로 가기와 같은 모양)
  const header = (
    <View style={styles.header}>
      <Pressable
        style={styles.backBtn}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/homescreen"))}
        hitSlop={8}
        accessibilityLabel="뒤로 가기"
      >
        <Ionicons name="chevron-back" size={22} color={P.ink} />
      </Pressable>
      <Text style={styles.headerTitle}>알림</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
    {header}
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(item) => item.notification_id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchNotifications();
          }}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>아직 알림이 없어요.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.item, !item.is_read && styles.unreadItem]}
          onPress={() => handlePress(item)}
        >
          {!item.is_read && <View style={styles.dot} />}
          <View style={styles.itemBody}>
            <Text style={styles.title}>{item.title ?? "알림"}</Text>
            <Text style={styles.content} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={styles.time}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
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
  container: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: { color: "#999", fontSize: 14 },
  item: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0EFED",
  },
  unreadItem: { backgroundColor: "#FFFBF5" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5A144",
    marginRight: 10,
    marginTop: 6,
  },
  itemBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 4 },
  content: { fontSize: 13, color: "#666", marginBottom: 6 },
  time: { fontSize: 11, color: "#aaa" },
});
