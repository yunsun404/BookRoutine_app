import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "./styles/book-detail.styles";

type BookDetail = {
  book_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_pages: number | null;
  book_intro: string | null;
  rating: number | null; // 알라딘 평점 (0~5 또는 0~10)
};

export default function BookDetailScreen() {
  const params = useLocalSearchParams();
  const bookId = params.book_id as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookDetail();
  }, [bookId]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${BASE_URL}/reading-goals/books/${bookId}`);
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
        <ActivityIndicator size="large" color="#4A3B32" />
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="#333" />
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
            <Ionicons name="star" size={16} color="#F5B301" />
            <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
          </View>
        )}
        {book.total_pages != null && (
          <Text style={styles.pagesText}>총 {book.total_pages}쪽</Text>
        )}
      </View>

      <View style={styles.introBox}>
        <Text style={styles.introLabel}>책 소개</Text>
        <Text style={styles.introText}>
          {book.book_intro || "책 소개 정보가 없습니다."}
        </Text>
      </View>
    </ScrollView>
  );
}