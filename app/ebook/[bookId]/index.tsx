import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EbookDetail, fetchBookDetail } from '../../../lib/api/ebooks';

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: '#6B7BFF',
  bg: '#F7F7FA',
  ink: '#1F2233',
  inkSub: '#6E7191',
  inkMute: '#A0A3BD',
  card: '#FFFFFF',
  line: '#ECECF3',
  primarySoft: '#EEF0FF',
};

export default function EbookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const [book, setBook] = useState<EbookDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const detail = await fetchBookDetail(bookId);
        setBook(detail);
      } catch {
        setBook(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.push('/ebook'))}
          hitSlop={8}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{book?.title ?? '전자책'}</Text>
        <Pressable onPress={() => router.push('/ebook/history')} hitSlop={8}>
          <Text style={styles.historyLink}>이력 보기</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={C.primary} />
      ) : !book ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>책 정보를 불러오지 못했어요</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              {book.cover_url ? (
                <Image source={{ uri: book.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Ionicons name="book-outline" size={36} color={C.primary} />
                </View>
              )}

              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.author}>{book.author}</Text>

              <View style={styles.metaRow}>
                {book.book_category && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>장르</Text>
                    <Text style={styles.metaValue}>{book.book_category}</Text>
                  </View>
                )}
                {book.total_pages != null && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>분량</Text>
                    <Text style={styles.metaValue}>{book.total_pages}쪽</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push({
                  pathname: '/ebook/[bookId]/read',
                  params: { bookId: book.book_id, title: book.title },
                })
              }
            >
              <Text style={styles.startButtonText}>독서 시작하기</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateText: { fontSize: 14, color: C.inkSub },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4B55C8',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.ink },
  historyLink: { fontSize: 13, fontWeight: '700', color: C.primary },

  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#4B55C8',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cover: { width: 150, height: 216, borderRadius: 10, backgroundColor: C.line, marginBottom: 24 },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  title: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6, textAlign: 'center' },
  author: { fontSize: 14, color: C.inkSub, marginTop: 6 },
  metaRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  metaItem: { flex: 1, alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 11, fontWeight: '600', color: C.inkMute },
  metaValue: { fontSize: 15, fontWeight: '700', color: C.ink },

  footer: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  startButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});