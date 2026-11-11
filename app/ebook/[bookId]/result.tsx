/**
 * 독서 세션 결과 — 두 화면을 좌우로 넘김 (버튼으로도 넘어감)
 *  ① 보상   : 평균 집중도(숫자가 차오름) · 포인트·EXP · 골든타임 배지 → [자세히 보기]
 *  ② 집중 분석: 평균 집중도 한 줄 · 집중 흐름 그래프 · 시간 구성 · 가장 집중한 시간 → [목록으로] [이어 읽기]
 * 서버 요청·데이터는 그대로, 화면 배치만 나눔
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusTimeline, TimelineLegend, type TimelineBar } from '../../../components/reading/FocusTimeline';
import { fetchSessionFocusDetail, fetchSessionReward } from '../../../lib/api/ebooks';
import { SessionReward } from '../../../lib/types/ebook';

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: '#6B7BFF',
  lavender: '#A78BFA',
  bg: '#F7F7FA',
  ink: '#1F2233',
  inkSub: '#6E7191',
  inkMute: '#A0A3BD',
  card: '#FFFFFF',
  line: '#ECECF3',
  primarySoft: '#EEF0FF',
  lavenderSoft: '#F3EEFF',
  peach: '#FF8A7C',
  peachSoft: '#FFF1EE',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const toMin = (sec?: number | null) => Math.round((sec ?? 0) / 60);

const PAGE_COUNT = 2;

/** 점수가 0부터 차오르는 숫자 */
function CountUp({ value, style }: { value: number; style: object }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = v.addListener(({ value: x }) => setShown(Math.round(x)));
    v.setValue(0);
    const a = Animated.timing(v, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => {
      a.stop();
      v.removeListener(id);
    };
  }, [value, v]);
  return <Text style={style}>{shown}</Text>;
}

/** 집중 · 딴짓 · 자리 비움 시간 (초) */
interface Breakdown {
  focused: number;
  unfocused: number;
  away: number;
}

export default function ReadingResultScreen() {
  const { sessionId, bookId, title } = useLocalSearchParams<{
    sessionId: string;
    bookId: string;
    title?: string;
  }>();
  const router = useRouter();

  const [reward, setReward] = useState<SessionReward | null>(null);
  const [goldenTime, setGoldenTime] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [bars, setBars] = useState<TimelineBar[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 두 화면 넘기기
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const goPage = (i: number) => {
    const next = Math.min(Math.max(i, 0), PAGE_COUNT - 1);
    pagerRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  // 화면에 들어오면 집중 결과와 보상을 함께 불러옴
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [detailRes, rewardRes] = await Promise.allSettled([
        fetchSessionFocusDetail(sessionId),
        fetchSessionReward(sessionId),
      ]);
      if (detailRes.status === 'fulfilled') {
        const { session, timeline } = detailRes.value;
        setGoldenTime({
          start: session.golden_time_start ?? null,
          end: session.golden_time_end ?? null,
        });
        // 30초 버킷별 집중 비율 (서버가 focus_rate 0~100 을 붙여 줌)
        setBars(
          (timeline ?? []).map((b: any) => ({
            start: new Date(b.bucket_start).getTime(),
            end: new Date(b.bucket_end).getTime(),
            rate: (b.focus_rate ?? 0) / 100,
          })),
        );
        setBreakdown({
          focused: session.total_focused_sec ?? 0,
          unfocused: session.total_unfocused_sec ?? 0,
          away: (session as any).total_away_sec ?? 0,
        });
      }
      if (rewardRes.status === 'fulfilled') setReward(rewardRes.value);
      if (detailRes.status === 'rejected' && rewardRes.status === 'rejected') setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const score = reward?.avgFocusScore;
  const golden =
    goldenTime.start && goldenTime.end
      ? { start: new Date(goldenTime.start).getTime(), end: new Date(goldenTime.end).getTime() }
      : null;
  const total = breakdown ? breakdown.focused + breakdown.unfocused + breakdown.away : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push('/ebook')}
          hitSlop={8}
          accessibilityLabel="전자책 목록으로"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
      </View>

      {loading || error ? (
        <View style={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>독서 세션 결과</Text>
            {!!title && <Text style={styles.cardSub} numberOfLines={1}>{title}</Text>}
            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.stateText}>결과를 정리하고 있어요</Text>
              </View>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>결과를 불러오지 못했어요</Text>
                <Pressable style={styles.retryBtn} onPress={load}>
                  <Text style={styles.retryText}>다시 불러오기</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPagerEnd}
            style={{ flex: 1 }}
          >
            {/* ① 보상 */}
            <ScrollView style={{ width }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>독서 완료!</Text>
                {!!title && <Text style={styles.cardSub} numberOfLines={1}>{title}</Text>}

                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>평균 집중도</Text>
                  <Text style={styles.scoreValue}>
                    {score != null ? <CountUp value={score} style={styles.scoreValue} /> : '—'}
                    <Text style={styles.scoreUnit}> 점</Text>
                  </Text>
                </View>

                {reward && (
                  <View style={styles.rewardRow}>
                    <View style={[styles.rewardBox, { backgroundColor: C.lavenderSoft }]}>
                      <Ionicons name="gift-outline" size={20} color={C.lavender} />
                      <Text style={styles.rewardValue}>+{reward.rewardPoints}</Text>
                      <Text style={styles.rewardLabel}>포인트</Text>
                    </View>
                    <View style={[styles.rewardBox, { backgroundColor: C.primarySoft }]}>
                      <Ionicons name="sparkles-outline" size={20} color={C.primary} />
                      <Text style={styles.rewardValue}>+{reward.rewardExp}</Text>
                      <Text style={styles.rewardLabel}>EXP</Text>
                    </View>
                  </View>
                )}

                <View style={[styles.goldenBadge, golden ? styles.goldenBadgeOn : null]}>
                  <Ionicons name={golden ? 'sunny' : 'sunny-outline'} size={18} color={golden ? '#FF9F2E' : C.inkMute} />
                  <Text style={[styles.goldenBadgeText, golden ? { color: '#B4473A' } : null]}>
                    {golden && goldenTime.start && goldenTime.end
                      ? `골든타임 달성 · ${formatTime(goldenTime.start)}~${formatTime(goldenTime.end)}`
                      : '다음엔 5분 이어서 집중해 봐요'}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, styles.fullBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => goPage(1)}
                >
                  <Text style={styles.primaryText}>자세히 보기</Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            </ScrollView>

            {/* ② 집중 분석 */}
            <ScrollView style={{ width }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>집중 분석</Text>
                <View style={styles.scoreLine}>
                  <Text style={styles.scoreLineLabel}>평균 집중도</Text>
                  <Text style={styles.scoreLineValue}>{score != null ? `${score}점` : '—'}</Text>
                </View>

                {/* 집중 흐름 (30초 단위) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>집중 흐름 (30초 단위)</Text>
                  <FocusTimeline bars={bars} golden={golden} height={72} showTimes />
                  <TimelineLegend />
                </View>

                {/* 시간 구성 */}
                {breakdown && total > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>시간 구성</Text>
                    <View style={styles.stackBar}>
                      <View style={{ flex: breakdown.focused, backgroundColor: C.primary }} />
                      <View style={{ flex: breakdown.unfocused, backgroundColor: '#E5A100' }} />
                      <View style={{ flex: breakdown.away, backgroundColor: C.line }} />
                    </View>
                    <Text style={styles.stackText}>
                      집중 {toMin(breakdown.focused)}분 · 딴짓·멍때림 {toMin(breakdown.unfocused)}분 · 자리 비움 {toMin(breakdown.away)}분
                    </Text>
                  </View>
                )}

                {/* 가장 집중한 시간 */}
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: C.peachSoft }]}>
                    <Ionicons name="sunny-outline" size={18} color={C.peach} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>가장 집중한 시간</Text>
                    <Text style={styles.infoValue}>
                      {goldenTime.start && goldenTime.end
                        ? `${formatTime(goldenTime.start)} ~ ${formatTime(goldenTime.end)}`
                        : '이번엔 없어요'}
                    </Text>
                    {!golden && (
                      <Text style={styles.infoHint}>30초 중 21초 이상 집중을 5분 넘게 이어 가면 기록돼요</Text>
                    )}
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [styles.ghostBtn, pressed && { backgroundColor: C.bg }]}
                    onPress={() => router.push('/ebook')}
                  >
                    <Text style={styles.ghostText}>목록으로</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={() =>
                      router.push({
                        pathname: '/ebook/[bookId]/read',
                        params: { bookId, title },
                      })
                    }
                  >
                    <Text style={styles.primaryText}>이어 읽기</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </ScrollView>

          {/* 몇 번째 화면인지 (누르면 이동) */}
          <View style={styles.dots}>
            {Array.from({ length: PAGE_COUNT }, (_, i) => (
              <Pressable key={i} onPress={() => goPage(i)} hitSlop={10} accessibilityLabel={i === 0 ? '보상' : '집중 분석'}>
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 24,
    gap: 16,
    shadowColor: '#4B55C8',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center' },
  cardSub: { fontSize: 13, color: C.inkSub, textAlign: 'center', marginTop: -10 },

  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48 },
  stateText: { fontSize: 14, color: C.inkSub },
  retryBtn: { backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 13, fontWeight: '700', color: C.primary },

  scoreBox: {
    backgroundColor: C.primarySoft,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: C.inkSub },
  scoreValue: { fontSize: 56, lineHeight: 64, fontWeight: '800', color: C.primary, letterSpacing: -2 },
  scoreUnit: { fontSize: 16, fontWeight: '700', color: C.primary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '600', color: C.inkMute },
  infoValue: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 2 },
  infoHint: { fontSize: 11, color: C.inkMute, marginTop: 2 },

  rewardRow: { flexDirection: 'row', gap: 12 },
  rewardBox: { flex: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center', gap: 2 },
  rewardValue: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 4 },
  rewardLabel: { fontSize: 12, fontWeight: '600', color: C.inkSub },
  goldenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.bg,
  },
  goldenBadgeOn: { backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#FFD48A' },
  goldenBadgeText: { fontSize: 13, fontWeight: '700', color: C.inkSub, flexShrink: 1 },
  fullBtn: { flex: 0, flexDirection: 'row', gap: 4, marginTop: 4 },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scoreLineLabel: { fontSize: 13, fontWeight: '600', color: C.inkSub },
  scoreLineValue: { fontSize: 18, fontWeight: '800', color: C.primary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.line },
  dotActive: { width: 22, backgroundColor: C.primary },

  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.inkSub },
  stackBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: C.line },
  stackText: { fontSize: 12, color: C.inkSub },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  ghostBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 15, fontWeight: '600', color: C.inkSub },
  primaryBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});