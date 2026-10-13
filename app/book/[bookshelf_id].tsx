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
import { P } from "@/constants/palette";

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

type Thread = {
  thread_id: string;
  content: string;
  current_page: number;
  created_at: string;
};

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
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    fetchDetail();
  }, []);

  useEffect(() => {
    if (detail?.book.book_id) {
      fetchThreads();
    }
  }, [detail]);

  const fetchDetail = async () => {
    try {
      const response = await authFetch(`${BASE_URL}/bookshelf/${bookshelf_id}`);
      const data = await response.json();
      setDetail(data);
    } catch (error) {
      console.error("책 상세 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      const url = `${BASE_URL}/threads?book_id=${detail?.book.book_id}`;
      //console.log("타래 URL:", url);
      const res = await authFetch(url);
      //console.log("타래 status:", res.status);
      const data = await res.json();
      //console.log("타래 data:", JSON.stringify(data));
      if (Array.isArray(data)) setThreads(data);
      else if (data?.threads) setThreads(data.threads);
      else if (data?.data) setThreads(data.data);
    } catch (error) {
      console.error("타래 에러:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={P.primary} />
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
        <Ionicons name="arrow-back" size={24} color={P.ink} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 책 정보 */}
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

        {/* 타래 목록 */}
        <View style={styles.threadSection}>
          <Text style={styles.threadTitle}>타래</Text>
          {threads.length === 0 ? (
            <Text style={styles.threadEmpty}>아직 기록이 없습니다.</Text>
          ) : (
            threads.map((item) => (
              <View key={item.thread_id} style={styles.threadCard}>
                <View style={styles.threadCardTop}>
                  <Text style={styles.threadPage}>{item.current_page} pg</Text>
                  <Text style={styles.threadDate}>
                    {item.created_at?.slice(0, 10)}
                  </Text>
                </View>
                <Text style={styles.threadContent}>{item.content}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
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
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cover: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: P.coverPlaceholder,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    color: P.textSecondary,
    marginBottom: 2,
  },
  goalDays: {
    fontSize: 12,
    color: P.textSecondary,
    marginBottom: 2,
  },
  goalPeriod: {
    fontSize: 11,
    color: P.textTertiary,
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
    backgroundColor: P.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: P.primary,
    borderRadius: 3,
  },
  pageText: {
    fontSize: 11,
    color: P.textTertiary,
  },
  threadSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 12,
  },
  threadEmpty: {
    fontSize: 14,
    color: P.textTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },
  threadCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  threadCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  threadPage: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
  },
  threadDate: {
    fontSize: 11,
    color: P.textTertiary,
  },
  threadContent: {
    fontSize: 13,
    color: P.ink,
    lineHeight: 20,
  },
});
