import SentenceTab from "@/components/sentences/SentenceTab";
import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "./styles/book-detail.styles";
import { P } from "@/constants/palette";

type BookDetail = {
  book_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_pages: number | null;
  book_intro: string | null;
  rating: number | null; // 알라딘 평점 (0~5 또는 0~10)
};

// GET /threads?book_id= 응답 (threads.service.ts findAll: 로그인 유저가 이 책에 남긴 타래)
type Thread = {
  thread_id: string;
  content: string;
  current_page: number | null;
  created_at: string;
};

type TabKey = "info" | "sentences";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "책 정보" },
  { key: "sentences", label: "문장 수집" },
];

export default function BookDetailScreen() {
  // tab 파라미터를 받으면 처음부터 해당 탭으로 열 수 있습니다.
  // 예) router.push({ pathname: "/book-detail", params: { book_id, tab: "sentences" } })
  const params = useLocalSearchParams<{ book_id: string; tab?: string }>();
  const bookId = params.book_id as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(params.tab === "sentences" ? "sentences" : "info");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);

  // 책 정보와 타래는 서로 의존하지 않으므로(둘 다 bookId만 필요) 동시에 요청합니다.
  useEffect(() => {
    if (!bookId) return;
    fetchBookDetail();
    fetchThreads();
  }, [bookId]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${BASE_URL}/reading-goals/books/${bookId}`);
      // 404 같은 에러 응답({ message, statusCode })을 책 정보로 착각해 그리지 않도록 방어
      if (!res.ok) {
        setBook(null);
        return;
      }
      const data = await res.json();
      setBook(data);
    } catch (e) {
      console.error("책 상세 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await authFetch(`${BASE_URL}/threads?book_id=${bookId}`);
      if (!res.ok) return; // 타래 실패가 책 상세 전체를 막지 않도록 조용히 무시
      const data = await res.json();
      // 응답 모양이 배열 / { threads } / { data } 어느 쪽이어도 받도록 방어
      if (Array.isArray(data)) setThreads(data);
      else if (Array.isArray(data?.threads)) setThreads(data.threads);
      else if (Array.isArray(data?.data)) setThreads(data.data);
    } catch (e) {
      console.error("타래 조회 실패:", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.center}>
        <Text>책 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={P.ink} />
        </TouchableOpacity>

        <View style={styles.coverWrapper}>
          <Image
            source={{ uri: book.cover_url ?? undefined }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title}>{book.title}</Text>
        {book.author && <Text style={styles.author}>{book.author}</Text>}

        <View style={styles.metaRow}>
          {book.rating != null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={P.star} />
              <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
            </View>
          )}
          {book.total_pages != null && (
            <Text style={styles.pagesText}>총 {book.total_pages}쪽</Text>
          )}
        </View>

        {/* 탭 바: 책 정보 | 문장 수집 */}
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "info" ? (
          <>
            <View style={styles.introBox}>
              <Text style={styles.introLabel}>책 소개</Text>
              <Text style={styles.introText}>
                {book.book_intro || "책 소개 정보가 없습니다."}
              </Text>
            </View>

            {/* 타래: 책 소개 바로 아래 */}
            <View style={styles.threadSection}>
              <Text style={styles.threadTitle}>타래</Text>
              {threads.length === 0 ? (
                <Text style={styles.threadEmpty}>아직 기록이 없습니다.</Text>
              ) : (
                threads.map((item) => (
                  <View key={item.thread_id} style={styles.threadCard}>
                    <View style={styles.threadCardTop}>
                      <Text style={styles.threadPage}>
                        {item.current_page != null ? `${item.current_page} pg` : ""}
                      </Text>
                      <Text style={styles.threadDate}>{item.created_at?.slice(0, 10)}</Text>
                    </View>
                    <Text style={styles.threadContent}>{item.content}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <SentenceTab
            bookId={book.book_id ?? bookId}
            bookTitle={book.title}
            bookAuthor={book.author}
            totalPages={book.total_pages}
            addSheetVisible={addSheetOpen}
            onCloseAddSheet={() => setAddSheetOpen(false)}
          />
        )}
      </ScrollView>

      {/* 문장 추가 버튼: ScrollView 바깥에 둬야 스크롤해도 화면에 고정됩니다.
          전역 FloatingTabMenu 버튼(bottom 24)과 겹치지 않게 그 위에 배치 */}
      {tab === "sentences" && (
        <TouchableOpacity
          style={styles.addFab}
          onPress={() => setAddSheetOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color={P.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
