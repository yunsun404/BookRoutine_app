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
  book_id: string | null; // 추천 화면의 알라딘 책은 DB에 없어서 null
  title: string;
  author: string | null;
  cover_url: string | null;
  total_pages: number | null;
  book_intro: string | null;
  rating: number | null; // 알라딘 평점 (0~5 또는 0~10)
};

type TabKey = "info" | "sentences";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "책 정보" },
  { key: "sentences", label: "문장 수집" },
];

export default function BookDetailScreen() {
  // tab 파라미터를 받으면 처음부터 해당 탭으로 열 수 있습니다.
  // 예) router.push({ pathname: "/book-detail", params: { book_id, tab: "sentences" } })
  // 추천 화면의 장르 추천 책은 DB에 없어서 book_id 대신 isbn으로 열립니다.
  // 예) router.push({ pathname: "/book-detail", params: { isbn } })
  const params = useLocalSearchParams<{ book_id?: string; isbn?: string; tab?: string }>();
  const bookId = (params.book_id as string) || "";
  const isbn = (params.isbn as string) || "";

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(params.tab === "sentences" ? "sentences" : "info");
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  useEffect(() => {
    fetchBookDetail();
  }, [bookId, isbn]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const url = bookId
        ? `${BASE_URL}/reading-goals/books/${bookId}`
        : `${BASE_URL}/recommendation/books/${encodeURIComponent(isbn)}`;
      const res = await authFetch(url);
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

        {/* 탭 바: 책 정보 | 문장 수집 (DB에 없는 추천 책은 문장 수집이 불가해서 탭을 숨김) */}
        {!!book.book_id && (
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
        )}

        {tab === "info" || !book.book_id ? (
          <View style={styles.introBox}>
            <Text style={styles.introLabel}>책 소개</Text>
            <Text style={styles.introText}>
              {book.book_intro || "책 소개 정보가 없습니다."}
            </Text>
          </View>
        ) : (
          <SentenceTab
            bookId={book.book_id ?? bookId}
            totalPages={book.total_pages}
            addSheetVisible={addSheetOpen}
            onCloseAddSheet={() => setAddSheetOpen(false)}
          />
        )}
      </ScrollView>

      {/* 문장 추가 버튼: ScrollView 바깥에 둬야 스크롤해도 화면에 고정됩니다.
          전역 FloatingTabMenu 버튼(bottom 24)과 겹치지 않게 그 위에 배치 */}
      {tab === "sentences" && !!book.book_id && (
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
