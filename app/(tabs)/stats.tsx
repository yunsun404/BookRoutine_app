import { gaugeColor } from "@/components/home/BookCarousel";
import { authFetch, BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "../../components/Header";

interface BookProgress {
  id: string;
  title: string;
  coverUrl: string | null;
  progress: number;
}

interface StatsData {
  graphData: number[];
  averageReadingTime: string;
  overallProgress: number;
  booksProgress: BookProgress[];
}

const YEARS = [2024, 2025, 2026, 2027];
const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  bg: "#F7F7FA",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  peach: "#FF8A7C",
  peachSoft: "#FFF1EE",
};

/* 월간 그래프 x축 라벨: 데이터 개수에 맞춰 생성 */
function getLabels(type: "weekly" | "monthly", count: number) {
  if (type === "weekly") return WEEK_LABELS.slice(0, count);
  if (count === 12) return Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
  if (count <= 6) return Array.from({ length: count }, (_, i) => `${i + 1}주`);
  return Array.from({ length: count }, (_, i) => `${i + 1}`);
}

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [tabType, setTabType] = useState<"weekly" | "monthly">("weekly");
  const [picker, setPicker] = useState<null | "month" | "year">(null);

  // 로그인한 사용자 이름 (앱 시작 때 /users/me 로 채워짐)
  const myNickname = useAuthStore((st) => st.user?.nickname) || "나";

  useEffect(() => {
    fetchStats();
  }, [selectedYear, selectedMonth, tabType]);

  async function fetchStats() {
    try {
      setLoading(true);
      const statsUrl = `${BASE_URL}/api/v1/stats/me?year=${selectedYear}&month=${selectedMonth}&type=${tabType}`;
      const statsRes = await authFetch(statsUrl);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setData(statsData);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error("통계 데이터 불러오기 실패:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const graphValues = data?.graphData || [];
  const rawMax = graphValues.length > 0 ? Math.max(...graphValues, 1) : 10;
  const maxVal = Math.max(2, Math.ceil(rawMax / 2) * 2); // 눈금이 깔끔하게 떨어지도록 짝수로 올림
  const ticks = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];
  const peakIdx = graphValues.length > 0 ? graphValues.indexOf(Math.max(...graphValues)) : -1;
  const labels = getLabels(tabType, graphValues.length);
  const booksWithProgress = data?.booksProgress || [];

  return (
    <View style={s.screen}>
      <Header />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 제목 + 연/월 선택 */}
        <View style={s.titleRow}>
          <View style={s.titleLeft}>
            <Text style={s.titleNum}>{selectedMonth}월</Text>
            <Text style={s.titleText}>통계</Text>
          </View>
          <View style={s.pickerRow}>
            <Pressable style={s.pickerBubble} onPress={() => setPicker("month")}>
              <Text style={s.pickerText}>{selectedMonth}월</Text>
              <Ionicons name="chevron-down" size={13} color={C.inkSub} />
            </Pressable>
            <Pressable style={s.pickerBubble} onPress={() => setPicker("year")}>
              <Text style={s.pickerText}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={13} color={C.inkSub} />
            </Pressable>
          </View>
        </View>

        {/* 그래프 카드 */}
        <View style={s.card}>
          <View style={s.chartHead}>
            <Text style={s.cardTitle}>독서 시간</Text>
            <View style={s.seg}>
              {(["weekly", "monthly"] as const).map((t) => {
                const active = tabType === t;
                return (
                  <Pressable key={t} onPress={() => setTabType(t)} style={[s.segItem, active && s.segItemOn]}>
                    <Text style={[s.segText, active && { color: C.primary }]}>
                      {t === "weekly" ? "주간" : "월간"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ height: 190 }} color={C.primary} />
          ) : graphValues.length === 0 ? (
            <View style={s.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={26} color={C.inkMute} />
              <Text style={s.emptyText}>이 기간에는 독서 기록이 없어요</Text>
            </View>
          ) : (
            <>
              <View style={s.chart}>
                <View style={s.yAxis}>
                  {ticks.map((t, i) => (
                    <Text key={i} style={s.yTick}>{Number.isInteger(t) ? t : t.toFixed(1)}</Text>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={StyleSheet.absoluteFill}>
                    {ticks.map((_, i) => (
                      <View key={i} style={[s.grid, i === ticks.length - 1 && s.gridBase]} />
                    ))}
                  </View>
                  <View style={s.bars}>
                    {graphValues.map((val, idx) => {
                      const isPeak = idx === peakIdx && val > 0;
                      return (
                        <View key={idx} style={s.barCol}>
                          {isPeak && <Text style={s.peakLabel}>{val}</Text>}
                          {val > 0 ? (
                            <View
                              style={[
                                s.bar,
                                { height: `${Math.min((val / maxVal) * 100, 100)}%` },
                                isPeak && { backgroundColor: C.primary },
                              ]}
                            />
                          ) : (
                            <View style={s.barZero} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View style={s.xAxis}>
                {labels.map((l, i) => (
                  <Text key={i} style={[s.xLabel, i === peakIdx && { color: C.primary, fontWeight: "800" }]}>
                    {l}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        {/* 주 독서 시간대 */}
        <View style={s.peakCard}>
          <View style={s.peakIcon}>
            <Ionicons name="time-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.peakCaption}>{myNickname} 님의 주 독서 시간대</Text>
            <Text style={s.peakTime}>{data?.averageReadingTime || "00:00"}</Text>
          </View>
        </View>

        {/* 독서 진행률 */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 16 }]}>독서 진행률</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={C.primary} />
          ) : booksWithProgress.length === 0 ? (
            <View style={s.bookEmpty}>
              <Text style={s.emptyText}>독서 목표를 세운 책이 아직 없어요</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {booksWithProgress.map((book) => {
                const pct = Math.max(0, Math.min(book.progress, 100));
                const color = gaugeColor(pct / 100);
                return (
                  <View key={book.id} style={s.bookItem}>
                    {book.coverUrl ? (
                      <Image source={{ uri: book.coverUrl }} style={s.bookCover} resizeMode="cover" />
                    ) : (
                      <View style={[s.bookCover, s.bookCoverEmpty]}>
                        <Ionicons name="book-outline" size={22} color={C.primary} />
                      </View>
                    )}
                    <Text style={s.bookTitle} numberOfLines={1}>{book.title}</Text>
                    <View style={s.track}>
                      <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[s.bookPct, { color }]}>
                      {Math.round(pct)}
                      <Text style={s.bookPctUnit}>°C</Text>
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* 연/월 선택 시트 */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={s.overlay} onPress={() => setPicker(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{picker === "month" ? "월 선택" : "연도 선택"}</Text>
            <View style={s.pickerGrid}>
              {(picker === "month" ? Array.from({ length: 12 }, (_, i) => i + 1) : YEARS).map((v) => {
                const active = picker === "month" ? v === selectedMonth : v === selectedYear;
                return (
                  <Pressable
                    key={v}
                    style={[s.pickerItem, active && s.pickerItemOn]}
                    onPress={() => {
                      picker === "month" ? setSelectedMonth(v) : setSelectedYear(v);
                      setPicker(null);
                    }}
                  >
                    <Text style={[s.pickerItemText, active && { color: "#fff" }]}>
                      {picker === "month" ? `${v}월` : v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CHART_H = 170;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 130, gap: 16 },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingBottom: 4 },
  titleLeft: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  titleNum: { fontSize: 32, fontWeight: "800", color: C.primary, letterSpacing: -1 },
  titleText: { fontSize: 20, fontWeight: "700", color: C.ink },
  pickerRow: { flexDirection: "row", gap: 8 },
  pickerBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pickerText: { fontSize: 13, fontWeight: "700", color: C.ink },

  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 20,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: C.ink, letterSpacing: -0.3 },

  chartHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  seg: { flexDirection: "row", backgroundColor: C.primarySoft, borderRadius: 999, padding: 3 },
  segItem: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 999 },
  segItemOn: {
    backgroundColor: C.card,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segText: { fontSize: 12, fontWeight: "700", color: C.inkMute },

  chartEmpty: { height: 190, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 13, color: C.inkSub },

  chart: { flexDirection: "row", height: CHART_H },
  yAxis: { width: 28, justifyContent: "space-between", marginTop: -7, marginBottom: -7 },
  yTick: { fontSize: 10, fontWeight: "600", color: C.inkMute },
  grid: { flex: 1, borderTopWidth: 1, borderTopColor: C.line, borderStyle: "dashed" },
  gridBase: { flex: 0, borderTopColor: "#D5D7E3", borderStyle: "solid" },
  bars: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  barCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: "52%",
    maxWidth: 26,
    backgroundColor: "#D9DDFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  barZero: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line, marginBottom: -3 },
  peakLabel: { fontSize: 11, fontWeight: "800", color: C.primary, marginBottom: 4 },
  xAxis: { flexDirection: "row", marginTop: 8, paddingLeft: 28 },
  xLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: C.inkSub },

  peakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.peachSoft,
    borderRadius: 20,
    padding: 16,
  },
  peakIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  peakCaption: { fontSize: 13, fontWeight: "500", color: C.inkSub },
  peakTime: { fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.5, marginTop: 1 },

  bookEmpty: { paddingVertical: 24, alignItems: "center" },
  bookItem: { width: 100, gap: 6 },
  bookCover: { width: 100, height: 144, borderRadius: 8, backgroundColor: C.line },
  bookCoverEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: C.primarySoft },
  bookTitle: { fontSize: 13, fontWeight: "700", color: C.ink, marginTop: 4 },
  track: { height: 6, borderRadius: 6, backgroundColor: C.line, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  bookPct: { fontSize: 14, fontWeight: "800" },
  bookPctUnit: { fontSize: 11, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: "rgba(31,34,51,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 36,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: C.ink, marginBottom: 14 },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerItem: { width: "23%", paddingVertical: 12, borderRadius: 14, backgroundColor: C.bg, alignItems: "center" },
  pickerItemOn: { backgroundColor: C.primary },
  pickerItemText: { fontSize: 14, fontWeight: "700", color: C.ink },
});