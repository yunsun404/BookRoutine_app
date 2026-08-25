import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Header from '../../../components/Header';
import { EbookDetail, fetchBookDetail } from '../../../lib/api/ebooks';

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
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  if (loading) return <ActivityIndicator style={styles.center} />;
  if (!book) return null;

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.card}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}

        <Text style={styles.title}>{book.title}</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.infoText}>작가: {book.author}</Text>
          {book.book_category && <Text style={styles.infoText}>장르: {book.book_category}</Text>}
          {book.total_pages != null && (
            <Text style={styles.infoText}>페이지 수: {book.total_pages} 페이지</Text>
          )}
        </View>

        <Pressable
          style={styles.startButton}
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
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  container: { flex: 1 },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cover: { width: 140, height: 200, borderRadius: 8, marginBottom: 16 },
  coverPlaceholder: { backgroundColor: '#eee' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  infoBlock: { alignSelf: 'stretch', gap: 6, marginBottom: 24 },
  infoText: { fontSize: 14, color: '#333' },
  startButton: {
    backgroundColor: '#5B4B8A',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  startButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});