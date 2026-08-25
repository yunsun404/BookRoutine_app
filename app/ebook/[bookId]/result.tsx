import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchSessionFocusDetail, fetchSessionReward } from '../../../lib/api/ebooks';
import { SessionReward } from '../../../lib/types/ebook';

export default function ReadingResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [reward, setReward] = useState<SessionReward | null>(null);
  const [goldenTime, setGoldenTime] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    (async () => {
      const [rewardRes, detailRes] = await Promise.all([
        fetchSessionReward(sessionId),
        fetchSessionFocusDetail(sessionId),
      ]);
      setReward(rewardRes);
      setGoldenTime({
        start: detailRes.session.golden_time_start ?? null,
        end: detailRes.session.golden_time_end ?? null,
      });
    })();
  }, [sessionId]);

  if (!reward) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.score}>집중도 {reward.avgFocusScore}점</Text>
      <Text style={styles.reward}>+{reward.rewardPoints} 포인트 · +{reward.rewardExp} EXP</Text>
      {goldenTime.start && goldenTime.end && (
        <Text style={styles.golden}>
          골든타임: {new Date(goldenTime.start).toLocaleTimeString()} ~{' '}
          {new Date(goldenTime.end).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  score: { fontSize: 28, fontWeight: '700' },
  reward: { fontSize: 16, color: '#555' },
  golden: { fontSize: 14, color: '#999' },
});