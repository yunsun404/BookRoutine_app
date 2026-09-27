import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusBucketRecorder } from '../../../hooks/useFocusBucketRecorder';
import { endReadingSession, fetchBookDetail, sendFocusBatch, startReadingSession } from '../../../lib/api/ebooks';
import { ReadingSession } from '../../../lib/types/ebook';

const SEND_INTERVAL_MS = 30000;

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: '#6B7BFF',
  bg: '#FBFBFD',
  ink: '#1F2233',
  inkSub: '#6E7191',
  inkMute: '#A0A3BD',
  card: '#FFFFFF',
  line: '#ECECF3',
  primarySoft: '#EEF0FF',
  danger: '#F2555A',
};

const formatElapsed = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function EbookReadingScreen() {
  const { bookId, title } = useLocalSearchParams<{ bookId: string; title: string }>();
  const router = useRouter();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
        setError('읽기 세션을 시작하지 못했어요. 백엔드 서버가 켜져 있는지 확인해주세요.');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    };
  }, [bookId]);

  // 집중도 배치 전송
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

  // 읽은 시간 표시용 타이머
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [session]);

  const goResult = (sessionId: string) => {
    setConfirmVisible(false);
    router.replace({
      pathname: '/ebook/[bookId]/result',
      params: { bookId, sessionId, title },
    });
  };

  const handleFinish = async () => {
    if (!session) return;
    setFinishing(true);
    setError('');
    flushCurrentBucket();
    const lastBatch = drainCompletedBuckets();

    try {
      const result = await endReadingSession(session.session_id, lastBatch);
      goResult(result?.session_id ?? session.session_id);
    } catch (e: any) {
      // 에러 내용을 최대한 넓게 모아서 확인 (axios 인터셉터가 에러 모양을 바꿔도 잡히도록)
      const status = e?.response?.status ?? e?.status;
      const body = e?.response?.data ?? e?.data;
      let text = String(e?.message ?? '');
      try {
        text += ' ' + (typeof body === 'string' ? body : JSON.stringify(body ?? {}));
      } catch {}
      console.log('[독서 종료 실패]', { status, body, message: e?.message, code: e?.code });

      // 앞선 요청에서 이미 종료됐다면 실패가 아니라 성공으로 보고 결과 화면으로 이동
      if (text.includes('이미 종료')) {
        goResult(session.session_id);
        return;
      }
      setConfirmVisible(false);
      setError(`세션 종료 처리에 실패했어요. (${status ?? e?.code ?? e?.message ?? '알 수 없는 오류'})`);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  // 세션 시작 자체가 실패한 경우
  if (!session) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { padding: 24 }]}>
        <Text style={styles.errorTitle}>{error || '읽기 세션을 시작하지 못했어요.'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => setConfirmVisible(true)}
          hitSlop={8}
          accessibilityLabel="독서 종료"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>독서 중</Text>
          <Text style={styles.statusTime}>{formatElapsed(elapsed)}</Text>
        </View>
      </View>

      <ScrollView style={styles.textArea} contentContainerStyle={styles.textContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.bookTitle}>{title}</Text>
        <Text style={styles.content}>{content}</Text>
      </ScrollView>

      {!!error && <Text style={styles.inlineError}>{error}</Text>}

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.finishButton, pressed && { opacity: 0.85 }]}
          onPress={() => setConfirmVisible(true)}
        >
          <Text style={styles.finishText}>독서 종료하기</Text>
        </Pressable>
      </View>

      {/* 종료 확인 */}
      <Modal transparent visible={confirmVisible} animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>독서를 종료할까요?</Text>
            <Text style={styles.modalDesc}>
              지금까지 {formatElapsed(elapsed)} 동안 읽었어요. 종료하면 집중도 결과를 볼 수 있어요.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { backgroundColor: C.bg }]}
                onPress={() => setConfirmVisible(false)}
                disabled={finishing}
              >
                <Text style={styles.cancelText}>계속 읽기</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, (pressed || finishing) && { opacity: 0.8 }]}
                onPress={handleFinish}
                disabled={finishing}
              >
                {finishing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>종료하기</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: C.bg },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  statusText: { fontSize: 12, fontWeight: '700', color: C.primary },
  statusTime: { fontSize: 12, fontWeight: '600', color: C.inkSub, fontVariant: ['tabular-nums'] },

  textArea: { flex: 1 },
  textContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  bookTitle: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginBottom: 24 },
  content: { fontSize: 17, lineHeight: 31, color: C.ink },

  inlineError: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: C.danger, paddingHorizontal: 20, marginBottom: 90 },
  errorTitle: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { fontSize: 13, fontWeight: '700', color: C.primary },

  footer: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  finishButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(31,34,51,0.45)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: C.card, borderRadius: 28, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.ink },
  modalDesc: { fontSize: 14, lineHeight: 21, color: C.inkSub },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.inkSub },
  confirmBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});