import { StyleSheet } from "react-native";

// 리디자인 색상 (이 파일 안에서만 관리)
export const colors = {
  primary: "#6B7BFF",
  lavender: "#A78BFA",
  bg: "#F7F7FA",
  ink: "#1F2233",
  peach: "#FF8A7C",
  card: "#FFFFFF",
  inkSub: "#6E7191",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  lavenderSoft: "#F3EEFF",
};

const radius = { sheet: 28, card: 20, input: 14 };
const space = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const shadow = {
  card: {
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  float: {
    shadowColor: "#6B7BFF",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const styles = StyleSheet.create({
  /* 레이아웃 */
  screen: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, paddingBottom: 120 },

  /* 인사 문구 */
  greeting: { paddingTop: space.sm, paddingBottom: space.xl },
  greetingSub: { fontSize: 17, fontWeight: "500", color: colors.inkSub, marginBottom: 2 },
  greetingTitle: { fontSize: 26, fontWeight: "700", color: colors.ink, letterSpacing: -0.6 },

  carouselContainer: { marginBottom: space.lg },

  /* 책이 없을 때 */
  emptyContainer: { alignItems: "center", paddingTop: space.md, gap: space.sm },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, letterSpacing: -0.4 },
  emptySubText: { fontSize: 14, color: colors.inkSub, marginBottom: space.md },

  registerButton: {
    width: "75%",
    minWidth: 240,
    alignSelf: "center",
    borderRadius: radius.input,
    ...shadow.float,
  },
  registerButtonInner: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  registerButtonText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },

  guideBox: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    padding: space.xl,
    marginTop: space.xl,
    gap: space.md,
    ...shadow.card,
  },
  guideTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 2 },
  guideItem: { flexDirection: "row", alignItems: "center", gap: space.md },
  guideIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  // 이전 버전 호환용 (이모지 아이콘)
  guideIcon: { fontSize: 16 },
  guideText: { fontSize: 14, color: colors.ink, fontWeight: "500" },

  quoteCard: {
    width: "100%",
    flexDirection: "row",
    gap: space.md,
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.card,
    padding: space.lg,
    marginTop: space.md,
  },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: colors.lavender },
  // 이전 버전 호환용 (아바타)
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 22 },
  quoteTextContainer: { flex: 1, gap: 4 },
  quoteTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  quoteSubText: { fontSize: 13, lineHeight: 19, color: colors.inkSub },

  /* 최근 타래 */
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontWeight: "600", color: colors.primary },

  feedEmpty: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: "dashed",
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    alignItems: "center",
    gap: 6,
  },
  feedEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  feedEmptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  feedEmptySub: { fontSize: 13, color: colors.inkSub, textAlign: "center" },
});