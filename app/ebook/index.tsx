import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Header from '../../components/Header';
import { fetchEbookList } from '../../lib/api/ebooks';
import { EbookListItem } from '../../lib/types/ebook';

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
  lavenderSoft: '#F3EEFF',
};

export default function EbookListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EbookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchEbookList({ page: 1, limit: 20 });
      setItems(res.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>전자책</Text>
          <View style={styles.titleBar} />
        </View>
        <Pressable onPress={() => router.push('/ebook/history')} hitSlop={8} style={styles.historyLink}>
          <Ionicons name="time-outline" size={15} color={C.primary} />
          <Text style={styles.historyLinkText}>이력 보기</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={C.primary} />
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>전자책 목록을 불러오지 못했어요</Text>
          <Text style={styles.stateSub}>백엔드 서버가 켜져 있는지 확인해주세요</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>다시 불러오기</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>아직 읽을 수 있는 전자책이 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.book_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
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
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Ionicons name="book-outline" size={20} color={C.primary} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                {item.book_category && (
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{item.book_category}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.inkMute} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center' },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  titleBar: { height: 3, width: 28, borderRadius: 2, backgroundColor: C.primary, marginTop: 4 },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  historyLinkText: { fontSize: 13, fontWeight: '700', color: C.primary },

  list: { padding: 20, gap: 12, paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#4B55C8',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cover: { width: 60, height: 86, borderRadius: 8, backgroundColor: C.line },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '700', color: C.ink },
  author: { fontSize: 13, color: C.inkSub },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.lavenderSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#8B6FE0' },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24, paddingBottom: 120 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  stateSub: { fontSize: 13, color: C.inkSub },
  retryBtn: { marginTop: 10, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 13, fontWeight: '700', color: C.primary },
});