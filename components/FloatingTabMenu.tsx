import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  lavender: "#A78BFA",
  ink: "#1F2233",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
};

/* 하단바 4개 탭 (가운데 + 버튼 제외) */
type Tab = {
  key: string;
  title: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
  route: string | null; // null이면 더보기 시트를 연다
  match: string[]; // 현재 경로에 이 단어가 들어 있으면 활성 표시
};

const LEFT_TABS: Tab[] = [
  { key: "home", title: "홈", icon: "home-outline", iconActive: "home", route: "/(tabs)/homescreen", match: ["homescreen"] },
  { key: "shelf", title: "책장", icon: "book-outline", iconActive: "book", route: "/bookshelf", match: ["bookshelf", "folder"] },
];
const RIGHT_TABS: Tab[] = [
  { key: "stats", title: "통계", icon: "stats-chart-outline", iconActive: "stats-chart", route: "/(tabs)/stats", match: ["stats"] },
  // TODO: '내 서재' 전용 화면이 생기면 route를 그 경로로 바꾸면 됨
  { key: "my", title: "기타", icon: "person-outline", iconActive: "person", route: null, match: [] },
];

/* 하단바에서 빠진 메뉴들 → '내 서재'를 누르면 시트로 열림 */
const MORE_ITEMS: { title: string; icon: IoniconsName; route: string }[] = [
  { title: "달력", icon: "calendar-outline", route: "/(tabs)/calendar" },
  { title: "랭킹", icon: "trophy-outline", route: "/ranking" },
  { title: "그룹", icon: "people-outline", route: "/(tabs)/group" },
  { title: "추천", icon: "sparkles-outline", route: "/(tabs)/recommend" },
  { title: "전자책", icon: "tablet-portrait-outline", route: "/ebook" },

];

const ADD_ROUTE = "/reading-goals/book-select"; // 가운데 + 버튼

/* 하단바를 보여줄 화면 (메인 화면들만. 입력 화면 등에서는 숨김) */
const SHOW_ROUTES = [
  "/homescreen",
  "/stats",
  "/bookshelf",
  "/calendar",
  "/group",
  "/groupdetail",
  "/recommend",
  "/notifications",
  "/ranking",
  "/myprofile",
];

/* 전자책은 목록·이력·결과 화면에서만 표시 (상세·읽기 화면은 숨김) */
const isEbookBarRoute = (p: string) =>
  p === "/ebook" || p === "/ebook/history" || /^\/ebook\/[^/]+\/result$/.test(p);

export default function FloatingTabMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  const showBar =
    SHOW_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) || isEbookBarRoute(pathname);
  if (!showBar) {
    return null;
  }

  const go = (route: string) => {
    setMoreOpen(false);
    router.push(route as any);
  };

  const renderTab = (tab: Tab) => {
    const active = tab.match.some((m) => pathname.includes(m)) || (tab.route === null && moreOpen);
    return (
      <Pressable
        key={tab.key}
        style={styles.tab}
        onPress={() => (tab.route ? go(tab.route) : setMoreOpen(true))}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.title}
      >
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={active ? tab.iconActive : tab.icon} size={22} color={active ? C.primary : C.inkMute} />
        </View>
        <Text style={[styles.label, active && styles.labelActive]}>{tab.title}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {LEFT_TABS.map(renderTab)}

        {/* 가운데 + 버튼 */}
        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => go(ADD_ROUTE)}
            style={({ pressed }) => [styles.addBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            accessibilityLabel="책 등록하기"
          >
            <Ionicons name="add" size={32} color="#fff" />
          </Pressable>
        </View>

        {RIGHT_TABS.map(renderTab)}
      </View>

      {/* 더보기 시트 */}
      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMoreOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onPress={() => { }}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>기타</Text>
            <View style={styles.grid}>
              {MORE_ITEMS.map((item) => (
                <Pressable key={item.title} style={styles.gridItem} onPress={() => go(item.route)}>
                  <View style={styles.gridIcon}>
                    <Ionicons name={item.icon} size={22} color={C.primary} />
                  </View>
                  <Text style={styles.gridLabel}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    zIndex: 100,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: { width: 44, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: C.primarySoft },
  label: { fontSize: 11, fontWeight: "600", color: C.inkMute },
  labelActive: { color: C.primary, fontWeight: "700" },

  centerSlot: { flex: 1, alignItems: "center" },
  addBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -34, // 바 위로 튀어나오게
    marginBottom: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: C.card,
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  overlay: { flex: 1, backgroundColor: "rgba(31,34,51,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: C.ink, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 18 },
  gridItem: { width: "25%", alignItems: "center", gap: 6 },
  gridIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: { fontSize: 12, fontWeight: "600", color: C.ink },
});