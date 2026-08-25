import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header'; // 추가
import { fetchEbookList } from '../../lib/api/ebooks';
import { EbookListItem } from '../../lib/types/ebook';

export default function EbookListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EbookListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEbookList({ page: 1, limit: 20 });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <Header /> {/* 추가 */}

      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>전자책</Text>
        <Pressable onPress={() => router.push('/ebook/history')}>
          <Text style={styles.historyLink}>이력 보기</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.book_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/ebook/[bookId]',
                  params: { bookId: item.book_id },
                })
              }
            >
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                {item.book_category && <Text style={styles.category}>{item.book_category}</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  historyLink: { fontSize: 14, color: '#555', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cover: { width: 60, height: 84, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#eee' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  author: { fontSize: 13, color: '#666', marginTop: 2 },
  category: { fontSize: 12, color: '#999', marginTop: 4 },
});