import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { fetchReadingHistory } from '../../lib/api/ebooks';

export default function ReadingHistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetchReadingHistory({ page: 1, limit: 20 });
      setItems(res.items);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.session_id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title}>{item.book.title}</Text>
          <Text style={styles.meta}>집중도 {item.avg_focus_score}점 · +{item.reward_points}P</Text>
          <Text style={styles.date}>{new Date(item.started_at).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  date: { fontSize: 12, color: '#aaa', marginTop: 2 },
});