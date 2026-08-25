import { initAuth } from '@/constants/api'; // 추가
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchEbookList } from '../../lib/api/ebooks';
import { EbookListItem } from '../../lib/types/ebook';

export default function EbookListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EbookListItem[]>([]);
  const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
    setLoading(true);
    try {
      await initAuth(); // 추가: 전자책 화면 진입 시 임시 자동 로그인
      const res = await fetchEbookList({ page: 1, limit: 20 });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.book_id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            router.push({
              pathname: '/ebook/[bookId]/read',
              params: { bookId: item.book_id, title: item.title },
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cover: { width: 60, height: 84, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#eee' },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  author: { fontSize: 13, color: '#666', marginTop: 2 },
  category: { fontSize: 12, color: '#999', marginTop: 4 },
});