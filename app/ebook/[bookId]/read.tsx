/**
 * 전자책 독서 화면
 *
 *  - 독서 시작 → 개인 보정 화면 → 몰입 모드(글만 보임)
 *  - 글을 터치하면 위·아래 바가 나타남 (4초 뒤 자동으로 숨김)
 *      위: 뒤로가기 · 제목 · 읽은 시간 · 측정 중 표시
 *      아래: 실시간 집중도 · 집중 시간 · 골든타임 · 30초 집중 그래프 · 진행률 · 종료
 *  - 바가 숨겨져 있어도 오른쪽 위 작은 칩에 지금 상태와 집중도가 항상 보임
 *  - 골든타임을 처음 달성하면 상단에 알림
 *  - 카메라는 글 뒤에 숨어 0.5초마다 판정 (화면은 기기 밖으로 나가지 않음)
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, type CameraRef, useCameraPermission } from 'react-native-vision-camera';
import {
  CALIBRATION_PREVIEW_SPACE,
  type CalibrationPhase,
  GazeCalibrationOverlay,
} from '../../../components/gaze/GazeCalibrationOverlay';
import { FocusTimeline } from '../../../components/reading/FocusTimeline';
import { useFocusBucketRecorder } from '../../../hooks/useFocusBucketRecorder';
import { useGazeFocusTracker } from '../../../hooks/useGazeFocusTracker';
import { endReadingSession, fetchBookDetail, sendFocusBatch, startReadingSession } from '../../../lib/api/ebooks';
import { goldenStatus, type GoldenStatus } from '../../../lib/focus/goldenTime';
import { GAZE_CONFIG } from '../../../lib/gaze/gazeConfig';
import { ReadingSession } from '../../../lib/types/ebook';

const SEND_INTERVAL_MS = 30000;
const BARS_AUTO_HIDE_MS = 4000;

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
  golden: '#FF8A7C',
  goldenSoft: '#FFF1EE',
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
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const mmss = (ms: number) => formatElapsed(Math.floor(ms / 1000));

/** 실시간 표시용 통계 */
interface LiveStats {
  score: number | null; // 집중 ÷ (집중 + 딴짓) × 100 (서버 avgFocusScore 와 같은 식)
  focusedSec: number;
  golden: GoldenStatus;
  bars: { start: number; end: number; rate: number }[];
}

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
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [progress, setProgress] = useState(0); // 스크롤 진행률 0~1

  const { pushFrame, flushCurrentBucket, drainCompletedBuckets, requeueBuckets, getStats } = useFocusBucketRecorder();
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

  /* ─────────── 위·아래 바 (터치하면 보이고 4초 뒤 숨김) ─────────── */
  const [barsVisible, setBarsVisible] = useState(true);
  const barsAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBars = (visible: boolean) => {
    setBarsVisible(visible);
    Animated.timing(barsAnim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (visible) hideTimer.current = setTimeout(() => showBars(false), BARS_AUTO_HIDE_MS);
  };
  // 보정이 끝나 독서를 시작하면 잠깐 보여 줬다가 숨김
  useEffect(() => {
    if (session && !showCalibration) showBars(true);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, showCalibration]);

  /* ─────────── 골든타임 달성 알림 ─────────── */
  const [toast, setToast] = useState<string | null>(null);
  const goldenNotifiedRef = useRef(false);

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

  // 1초마다: 읽은 시간 + 실시간 집중도·골든타임 갱신 (보정 중에는 멈춤 → 실제로 읽은 시간만)
  useEffect(() => {
    if (!session || showCalibration) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      const st = getStats();
      const seen = st.focusedSec + st.unfocusedSec;
      const golden = goldenStatus(st.history);
      setStats({
        score: seen >= 10 ? Math.round((st.focusedSec / seen) * 100) : null,
        focusedSec: st.focusedSec,
        golden,
        bars: st.history.map((b) => {
          const s = new Date(b.bucketStart).getTime();
          const e = new Date(b.bucketEnd).getTime();
          return { start: s, end: e, rate: b.focusedSec / ((e - s) / 1000) };
        }),
      });
      if (golden.best && !goldenNotifiedRef.current) {
        goldenNotifiedRef.current = true;
        setToast(`골든타임 달성! ${hhmm(golden.best.start)}부터 5분 넘게 집중했어요`);
        setTimeout(() => setToast(null), 5000);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [session, showCalibration, getStats]);

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

  // 상태 칩 문구
  const focusChip = !hasPermission
    ? { label: '카메라 꺼짐', color: C.inkMute }
    : !focus
      ? { label: '측정 준비 중', color: C.inkMute }
      : focus.phase === 'calibrating'
        ? { label: `기준 잡는 중 ${Math.round(focus.calibrationProgress * 100)}%`, color: C.primary }
        : focus.detail === 'staring'
          ? { label: '멍때림', color: C.unfocused }
          : FOCUS_CHIP[focus.state];

  // 골든타임 한 줄
  const g = stats?.golden;
  const goldenOngoing = !!(g?.best && g.current && g.current.start === g.best.start);
  const goldenText = !g
    ? '5분 이어서 집중하면 골든타임'
    : goldenOngoing
      ? `골든타임 진행 중 · ${mmss(g.current!.ms)}`
      : g.best
        ? `골든타임 ${hhmm(g.best.start)}~${hhmm(g.best.end)}`
        : g.current
          ? `골든타임까지 ${mmss(Math.max(0, g.minMs - g.current.ms))}`
          : '5분 이어서 집중하면 골든타임';

  // 카메라 뷰 위치: 자세 맞추기 = 크게 보이게 / 그 외 = 글 뒤에 숨김
  //  (셔터 소리 없는 "미리보기 캡처" 방식이라 뷰가 일정 크기 이상이어야 해서, 작게 줄이지 않고 뒤에 숨김)
  const camStyle = showCalibration && calPhase === 'posture' ? styles.camLarge : styles.camBehind;
  const barTranslateTop = barsAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  const barTranslateBottom = barsAnim.interpolate({ inputRange: [0, 1], outputRange: [220, 0] });

  return (
    <SafeAreaView style={styles.container}>
      {/* 본문 (터치하면 위·아래 바 보이기/숨기기) */}
      <ScrollView
        style={styles.textArea}
        contentContainerStyle={styles.textContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          notifyScroll(contentOffset.y);
          const max = contentSize.height - layoutMeasurement.height;
          setProgress(max > 0 ? Math.min(1, Math.max(0, contentOffset.y / max)) : 0);
        }}
        scrollEventThrottle={500}
      >
        <Pressable onPress={() => showBars(!barsVisible)}>
          <Text style={styles.bookTitle}>{title}</Text>
          <Text style={styles.content}>{content}</Text>
        </Pressable>
      </ScrollView>

      {/* 상태 칩 — 바가 숨겨져 있어도 항상 보임 (누르면 다시 보정) */}
      <Pressable
        style={[styles.focusChip, { top: barsVisible ? 68 : 12 }]}
        onPress={hasPermission ? () => setCalibrating(true) : requestPermission}
        accessibilityLabel="집중 상태, 누르면 다시 보정"
      >
        <View style={[styles.statusDot, { backgroundColor: focusChip.color }]} />
        <Text style={[styles.focusText, { color: focusChip.color }]} numberOfLines={1}>
          {focusChip.label}
        </Text>
        {stats?.score != null && <Text style={styles.focusScore}>{stats.score}%</Text>}
        {goldenOngoing && <Ionicons name="sunny" size={13} color={C.golden} />}
      </Pressable>

      {/* 골든타임 달성 알림 */}
      {!!toast && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="sunny" size={18} color={C.golden} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* 위 바 */}
      <Animated.View
        style={[styles.topBar, { opacity: barsAnim, transform: [{ translateY: barTranslateTop }] }]}
        pointerEvents={barsVisible ? 'auto' : 'none'}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => setConfirmVisible(true)}
          hitSlop={8}
          accessibilityLabel="독서 종료"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusTime}>{formatElapsed(elapsed)}</Text>
        </View>
        {hasPermission && (
          <View style={styles.camBadge}>
            <Ionicons name="videocam" size={16} color={tracking ? C.primary : C.inkMute} />
          </View>
        )}
      </Animated.View>

      {/* 아래 바: 실시간 측정값 */}
      <Animated.View
        style={[styles.bottomBar, { opacity: barsAnim, transform: [{ translateY: barTranslateBottom }] }]}
        pointerEvents={barsVisible ? 'auto' : 'none'}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>실시간 집중도</Text>
            <Text style={styles.statValue}>{stats?.score != null ? `${stats.score}%` : '—'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>집중한 시간</Text>
            <Text style={styles.statValue}>{mmss((stats?.focusedSec ?? 0) * 1000)}</Text>
          </View>
          <View style={[styles.statBox, styles.goldenBox, goldenOngoing && styles.goldenBoxOn]}>
            <Ionicons name="sunny-outline" size={14} color={C.golden} />
            <Text style={styles.goldenText} numberOfLines={2}>
              {goldenText}
            </Text>
          </View>
        </View>

        <FocusTimeline bars={stats?.bars ?? []} golden={g?.best ?? null} height={36} maxBars={40} />

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>

        {!!error && <Text style={styles.inlineError}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.finishButton, pressed && { opacity: 0.85 }]}
          onPress={() => setConfirmVisible(true)}
        >
          <Text style={styles.finishText}>독서 종료하기</Text>
        </Pressable>
      </Animated.View>

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
              지금까지 {formatElapsed(elapsed)} 동안 읽었어요
              {stats?.score != null ? ` (집중도 ${stats.score}%)` : ''}. 종료하면 집중도 결과를 볼 수 있어요.
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

  /* 본문 */
  textArea: { flex: 1, backgroundColor: C.bg },
  textContent: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 260 },
  bookTitle: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginBottom: 24 },
  content: { fontSize: 17, lineHeight: 31, color: C.ink },

  /* 상태 칩 (항상 보임) */
  focusChip: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 15,
    shadowColor: '#4B55C8',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  focusText: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
  focusScore: { fontSize: 13, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },

  /* 골든타임 알림 */
  toast: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.goldenSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 16,
    elevation: 4,
  },
  toastText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#B4473A' },

  /* 위 바 */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(251,251,253,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    zIndex: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
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
  topTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusTime: { fontSize: 12, fontWeight: '700', color: C.primary, fontVariant: ['tabular-nums'] },
  camBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 아래 바 */
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 14,
    shadowColor: '#4B55C8',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: C.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.inkMute },
  statValue: { fontSize: 20, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  goldenBox: { flex: 1.3, backgroundColor: C.goldenSoft, justifyContent: 'center' },
  goldenBoxOn: { borderWidth: 1.5, borderColor: C.golden },
  goldenText: { fontSize: 12, fontWeight: '700', color: '#B4473A' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.primary },
  progressText: { fontSize: 11, fontWeight: '600', color: C.inkSub, fontVariant: ['tabular-nums'] },
  finishButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  inlineError: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: C.danger },
  errorTitle: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { fontSize: 13, fontWeight: '700', color: C.primary },

  /* 카메라 */
  camLarge: {
    position: 'absolute',
    top: (CALIBRATION_PREVIEW_SPACE - 240) / 2,
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: C.primary,
    backgroundColor: C.line,
    zIndex: 20,
  },
  camBehind: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GAZE_CONFIG.SNAPSHOT_VIEW.width,
    height: GAZE_CONFIG.SNAPSHOT_VIEW.height,
    opacity: 0,
    zIndex: -1,
  },

  /* 종료 확인 */
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
