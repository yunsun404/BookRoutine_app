import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
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
    backgroundColor: "#1a1a1a",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#222",
    marginBottom: 6,
  },
  author: {
    fontSize: 14,
    color: "#7A6FDB",
    textAlign: "center",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  pagesText: {
    fontSize: 14,
    color: "#666",
  },
  introBox: {
    backgroundColor: "#EAF3EC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  introLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
  },
});