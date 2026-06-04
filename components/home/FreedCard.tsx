import {
    Colors,
    FontSize,
    Radius,
    Spacing,
} from "@/components/constants/tokens";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export type FeedItem = {
  id: string;
  bookTitle: string;
  username: string;
  avatarUrl?: string | null;
  avatarEmoji?: string;
  date: string;
  content: string;
};

type Props = {
  item: FeedItem;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(".", "");
}

export default function FeedCard({ item }: Props) {
  const { bookTitle, username, avatarUrl, avatarEmoji, date, content } = item;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>
                {avatarEmoji ?? username?.[0] ?? "?"}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.bookTitle}>"{bookTitle}"</Text>
            <Text style={styles.username}>{username}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(date)}</Text>
      </View>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7a6548",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarEmoji: {
    fontSize: 18,
  },
  bookTitle: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  username: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  content: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});
