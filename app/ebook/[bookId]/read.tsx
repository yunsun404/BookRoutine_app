import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusBucketRecorder } from '../../../hooks/useFocusBucketRecorder';
import { endReadingSession, fetchBookDetail, sendFocusBatch, startReadingSession } from '../../../lib/api/ebooks';
import { ReadingSession } from '../../../lib/types/ebook';

const SEND_INTERVAL_MS = 30000;

export default function EbookReadingScreen() {
  const { bookId, title } = useLocalSearchParams<{ bookId: string; title: string }>();
  const router = useRouter();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { pushFrame, flushCurrentBucket, drainCompletedBuckets } = useFocusBucketRecorder();
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [sessionRes, bookDetail] = await Promise.all([
          startReadingSession(bookId),
          fetchBookDetail(bookId),
        ]);
        setSession(sessionRes);
        setContent(bookDetail.content ?? '원문을 불러오지 못했습니다.');
      } catch (e) {
        Alert.alert('오류', '읽기 세션을 시작하지 못했습니다.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    };
  }, [bookId]);

  useEffect(() => {
    if (!session) return;
    sendTimerRef.current = setInterval(async () => {
      const batch = drainCompletedBuckets();
      if (batch.length === 0) return;
      try {
        await sendFocusBatch(session.session_id, batch);
      } catch {
        // 실패 시 재시도 큐잉 로직 필요하면 여기에 추가
      }
    }, SEND_INTERVAL_MS);

    return () => {
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    };
  }, [session]);

  const handleFinish = async () => {
    if (!session) return;
    flushCurrentBucket();
    const lastBatch = drainCompletedBuckets();

    try {
      const result = await endReadingSession(session.session_id, lastBatch);
      router.replace({
        pathname: '/ebook/[bookId]/result',
        params: { bookId, sessionId: result.session_id },
      });
    } catch {
      Alert.alert('오류', '세션 종료 처리에 실패했습니다.');
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.textArea} 
        contentContainerStyle={{ padding: 20 }}  
      >
        <Text style={styles.bookTitle}>{title}</Text>
        <Text style={styles.content}>{content}</Text>
      </ScrollView>

      <Pressable style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishText}>독서 종료</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  container: { flex: 1 },
  textArea: { flex: 1 },
  bookTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  content: { fontSize: 16, lineHeight: 26 },
  finishButton: { padding: 16, backgroundColor: '#222', alignItems: 'center' },
  finishText: { color: '#fff', fontWeight: '600' },
});