import { StyleSheet } from "react-native";
import { P } from "@/constants/palette";

export const styles = StyleSheet.create({
  // ScrollView와 떠 있는 + 버튼을 함께 담는 바깥 틀
  screen: {
    flex: 1,
    backgroundColor: P.surface,
  },
  container: {
    flex: 1,
    backgroundColor: P.surface,
    paddingHorizontal: 20,
  },
  // 마지막 문장 카드가 + 버튼/전역 메뉴 버튼에 가려지지 않도록 아래 여백 확보
  scrollContent: {
    paddingBottom: 160,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    marginTop: 16,
    marginBottom: 8,
    width: 32,
  },
  coverWrapper: {
    alignItems: "center",
    marginVertical: 16,
  },
  coverImage: {
    width: 160,
    height: 230,
    borderRadius: 4,
    backgroundColor: P.coverPlaceholder,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: P.ink,
    marginBottom: 6,
  },
  author: {
    fontSize: 14,
    color: P.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.ink,
  },
  pagesText: {
    fontSize: 14,
    color: P.textSecondary,
  },
  introBox: {
    backgroundColor: P.primaryTint,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  introLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: P.inkSoft,
  },

  // ---- 탭 (책 정보 | 문장 수집) ----
  tabBar: {
    flexDirection: "row",
    backgroundColor: P.primaryTint,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: P.surface,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.textSecondary,
  },
  tabTextActive: {
    color: P.primary,
  },
  // ---- 문장 추가 버튼 (전역 FloatingTabMenu: bottom 24 / 56px 위에 배치) ----
  addFab: {
    position: "absolute",
    right: 28,
    bottom: 96,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: P.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
});
