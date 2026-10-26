import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraPermission } from 'react-native-vision-camera';
import {
  CALIBRATION_PREVIEW_SPACE,
  type CalibrationPhase,
  GazeCalibrationOverlay,
} from '../../../components/gaze/GazeCalibrationOverlay';
import { useFocusBucketRecorder } from '../../../hooks/useFocusBucketRecorder';
import { useGazeFocusTracker } from '../../../hooks/useGazeFocusTracker';
import { endReadingSession, fetchBookDetail, sendFocusBatch, startReadingSession } from '../../../lib/api/ebooks';
import { GAZE_CONFIG } from '../../../lib/gaze/gazeConfig';
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
  focused: '#2BA84A',
  unfocused: '#E5A100',
};

/* 집중 상태 칩 표시 */
const FOCUS_CHIP = {
  focused: { label: '집중', color: C.focused },
  unfocused: { label: '딴짓', color: C.unfocused },
  away: { label: '자리 비움', color: C.danger },
} as const;

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

  const { pushFrame, flushCurrentBucket, drainCompletedBuckets, requeueBuckets } = useFocusBucketRecorder();
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // [시선추적] 카메라 권한 → 0.5초마다 판정 → pushFrame 으로 30초 버킷에 기록
  const { hasPermission, requestPermission } = useCameraPermission();
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // [개인 보정] 세션 시작 직후 보정 화면 → 끝나면 독서 화면 (칩을 누르면 다시 보정)
  const [calibrating, setCalibrating] = useState(true);
  const [calPhase, setCalPhase] = useState<CalibrationPhase>('posture');
  const showCalibration = !!session && hasPermission && calibrating;

  const cameraRef = useRef<CameraRef>(null);
  const tracking = !!session && hasPermission && !finishing;
  const {
    photoOutput,
    result: focus,
    subscribe,
    setCalibration,
    notifyScroll,
  } = useGazeFocusTracker({ enabled: tracking, onFrame: pushFrame, calibrating: showCalibration, cameraRef });

  // 독서 중간에 다시 보정하면: 그때까지의 버킷을 마무리 (보정 시간이 "자리 비움"으로 쌓이지 않게)
  useEffect(() => {
    if (showCalibration && session) flushCurrentBucket();
  }, [showCalibration, session, flushCurrentBucket]);

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

  // 집중도 배치 전송 (실패하면 되돌려 놓고 다음 주기에 다시 보냄. 서버가 중복은 무시)
  useEffect(() => {
    if (!session) return;
    sendTimerRef.current = setInterval(async () => {
      const batch = drainCompletedBuckets();
      if (batch.length === 0) return;
      try {
        await sendFocusBatch(session.session_id, batch);
      } catch {
        requeueBuckets(batch);
      }
    }, SEND_INTERVAL_MS);

    return () => {
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    };
  }, [session, drainCompletedBuckets, requeueBuckets]);

  // 읽은 시간 표시용 타이머 (보정 중에는 멈춤 → 실제로 읽은 시간만)
  useEffect(() => {
    if (!session || showCalibration) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [session, showCalibration]);

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
      requeueBuckets(lastBatch); // 다시 "종료하기"를 누르면 같이 보냄
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

  // 집중 상태 칩 문구
  const focusChip = !hasPermission
    ? { label: '카메라 꺼짐 · 집중도 측정 안 됨', color: C.inkMute }
    : !focus
      ? { label: '측정 준비 중', color: C.inkMute }
      : focus.phase === 'calibrating'
        ? { label: `화면을 봐 주세요 ${Math.round(focus.calibrationProgress * 100)}%`, color: C.primary }
        : focus.detail === 'staring'
          ? { label: '멍때림', color: C.unfocused }
          : FOCUS_CHIP[focus.state];

  // 카메라 뷰 위치: 자세 맞추기 = 크게 보이게 / 그 외 = 글 뒤에 숨김
  //  (셔터 소리 없는 "미리보기 캡처" 방식이라 뷰가 일정 크기 이상이어야 해서, 작게 줄이지 않고 뒤에 숨김)
  const camStyle = showCalibration && calPhase === 'posture' ? styles.camLarge : styles.camBehind;

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

        {/* 집중 상태 (누르면 다시 보정) */}
        <Pressable
          style={styles.focusChip}
          onPress={hasPermission ? () => setCalibrating(true) : requestPermission}
          accessibilityLabel="집중 상태, 누르면 다시 보정"
        >
          <View style={[styles.statusDot, { backgroundColor: focusChip.color }]} />
          <Text style={[styles.focusText, { color: focusChip.color }]} numberOfLines={1}>
            {focusChip.label}
          </Text>
        </Pressable>

        {/* 측정 중 표시 (카메라 화면은 글 뒤에 숨어 있음) */}
        {hasPermission && (
          <View style={styles.camBadge}>
            <Ionicons name="videocam" size={16} color={tracking ? C.primary : C.inkMute} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.textArea}
        contentContainerStyle={styles.textContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => notifyScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={500}
      >
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

      {/* 개인 보정 화면 (독서 시작 전 / 칩을 눌렀을 때) */}
      {showCalibration && (
        <GazeCalibrationOverlay
          subscribe={subscribe}
          onPhaseChange={setCalPhase}
          onDone={(cal) => {
            setCalibration(cal);
            setCalibrating(false);
          }}
        />
      )}

      {/* 카메라 — 항상 1개만 두고 위치·크기만 바꿈 (다시 만들면 카메라가 재시작됨)
          화면은 기기 안에서만 처리, 저장·전송 안 함 */}
      {hasPermission && (
        <View style={camStyle} pointerEvents="none">
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device="front"
            isActive={tracking}
            outputs={[photoOutput]}
            implementationMode="compatible"
          />
        </View>
      )}

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
  // (참고) 카메라 뷰는 zIndex -1 로 글 뒤에 있음 → 글 영역(textArea)은 배경색이 있어 가려짐

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
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
  focusChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  camBadge: {
    width: 32, height: 32, borderRadius: 16, marginLeft: 'auto', backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  camBehind: {
    position: 'absolute', top: 0, left: 0, width: GAZE_CONFIG.SNAPSHOT_VIEW.width, height: GAZE_CONFIG.SNAPSHOT_VIEW.height,
    opacity: 0, zIndex: -1,
  },
  camLarge: {
    position: 'absolute', top: (CALIBRATION_PREVIEW_SPACE - 240) / 2, alignSelf: 'center', width: 240, height: 240,
    borderRadius: 120, overflow: 'hidden', borderWidth: 4, borderColor: C.primary, backgroundColor: C.line, zIndex: 20,
  },


  textArea: { flex: 1, backgroundColor: C.bg },
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
