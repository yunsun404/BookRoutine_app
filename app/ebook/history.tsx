import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchReadingHistory } from '../../lib/api/ebooks';

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

export default function ReadingHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchReadingHistory({ page: 1, limit: 20 });
        setItems(res.items);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.push('/ebook'))}
          hitSlop={8}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>이력 보기</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={C.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>이력을 불러오지 못했어요</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.stateTitle}>아직 읽은 기록이 없어요</Text>
          <Text style={styles.stateText}>전자책을 읽으면 집중도 기록이 여기에 쌓여요</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const book = item.book ?? {};
            return (
              <View style={styles.row}>
                {book.cover_url ? (
                  <Image source={{ uri: book.cover_url }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Ionicons name="book-outline" size={18} color={C.primary} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={1}>{book.title}</Text>
                  {!!book.author && <Text style={styles.sub} numberOfLines={1}>{book.author}</Text>}
                  <Text style={styles.date}>{new Date(item.started_at).toLocaleDateString('ko-KR')}</Text>
                </View>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreLabel}>집중도</Text>
                  <Text style={styles.score}>
                    {item.avg_focus_score ?? '—'}
                    <Text style={styles.scoreUnit}>점</Text>
                  </Text>
                  {item.reward_points != null && <Text style={styles.points}>+{item.reward_points}P</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24, paddingBottom: 120 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  stateText: { fontSize: 13, color: C.inkSub, textAlign: 'center' },

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
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 },

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 120 },
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
  cover: { width: 50, height: 72, borderRadius: 6, backgroundColor: C.line },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: C.ink },
  sub: { fontSize: 13, color: C.inkSub },
  date: { fontSize: 12, color: C.inkMute, marginTop: 2 },
  scoreCol: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 11, fontWeight: '600', color: C.inkMute },
  score: { fontSize: 22, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },
  scoreUnit: { fontSize: 12, fontWeight: '700' },
  points: { fontSize: 11, fontWeight: '700', color: C.inkSub, marginTop: 2 },
});