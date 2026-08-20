// src/screens/styles/home.styles.ts
import { FontSize } from "@/constants/tokens";
import { Dimensions, StyleSheet } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 40, paddingHorizontal: 16 },
  
  // 📚 책이 있을 때 캐러셀 영역 컨테이너
  carouselContainer: { 
    marginVertical: 12,
    alignItems: "center",
  },
  
  sectionTitle: { 
    fontSize: FontSize.md, 
    fontWeight: "bold", 
    marginTop: 20,
    marginBottom: 10,
    color: "#1a1a1a" 
  },
  
  // 📚 책이 없을 때 전체 컨테이너
  emptyContainer: {
    alignItems: "center",
    paddingTop: 10,
  },
  emptyCarouselBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  arrowText: {
    fontSize: 16,
    color: "#333",
  },
  illustrationPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "#F2F9F5",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  illustrationEmoji: {
    fontSize: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: "#888888",
    marginTop: 6,
  },
  registerButton: {
    backgroundColor: "#55A36B",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 28,
    marginTop: 20,
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  guideBox: {
    width: "100%",
    backgroundColor: "#F2F7F4",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  guideItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  guideIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  guideText: {
    fontSize: 13,
    color: "#555555",
  },
  quoteCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0E6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  quoteSubText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
  },
});