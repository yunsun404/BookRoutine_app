import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";

interface BookDetail {
  bookshelf_id: string;
  progress: number;
  current_page: number;
  status: number;
  book: {
    book_id: string;
    title: string;
    author: string;
    cover_url: string;
    total_pages: number;
  };
  reading_goals: {
    goal_id: string;
    start_date: string;
    end_date: string;
    period: number;
    daily_pages: number;
    preferred_days: number[];
  }[];
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const getDayLabel = (days: number[]) => {
  return days.map((d) => DAY_LABELS[d]).join("/");
};

export default function BookDetailScreen() {
  const { bookshelf_id } = useLocalSearchParams<{ bookshelf_id: string }>();
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      // ✅ authFetch로 교체 — 토큰 자동 포함
      const response = await authFetch(`${BASE_URL}/bookshelf/${bookshelf_id}`);
      const data = await response.json();
      setDetail(data);
    } catch (error) {
      console.error("책 상세 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text>책 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const goal = detail.reading_goals?.[0] ?? null;

  return (
    <View style={styles.container}>
      <Header />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bookInfoRow}>
          <Image source={{ uri: detail.book.cover_url }} style={styles.cover} />
          <View style={styles.bookInfo}>
            <Text style={styles.title}>{detail.book.title}</Text>
            <Text style={styles.author}>{detail.book.author}</Text>

            {goal && (
              <Text style={styles.goalDays}>
                [{getDayLabel(goal.preferred_days)}] {goal.daily_pages} page
              </Text>
            )}

            {goal && (
              <Text style={styles.goalPeriod}>
                {formatDate(goal.start_date)} ~ {formatDate(goal.end_date)}
              </Text>
            )}

            <View style={styles.progressRow}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${detail.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.pageText}>
                {detail.current_page}/{detail.book.total_pages}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EFED",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bookInfoRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cover: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: "#E1D9D1",
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  goalDays: {
    fontSize: 12,
    color: "#555",
    marginBottom: 2,
  },
  goalPeriod: {
    fontSize: 11,
    color: "#999",
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C8B84A",
    borderRadius: 3,
  },
  pageText: {
    fontSize: 11,
    color: "#999",
  },
});
