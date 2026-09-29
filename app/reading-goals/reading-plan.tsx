// app/reading-goals/reading-plan.tsx
import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = `${BASE_URL}/reading-goals`;

const days = [
  { label: "일", value: 0 },
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
];
const WEEK_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type CalendarCell = {
  date: Date;
  day: number;
  currentMonth: boolean;
  dateString: string;
};

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  lavender: "#A78BFA",
  bg: "#F7F7FA",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  peach: "#FF8A7C",
  danger: "#F2555A",
};

export default function ReadingPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 이전 화면에서 전달받은 책 정보
  const book = {
    book_id: (params.book_id as string) || "",
    title: (params.title as string) || "",
    author: (params.author as string) || "",
    total_pages: Number(params.total_pages) || 0,
    isbn: (params.isbn as string) || "",
    cover: (params.cover as string) || "",
  };

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const todayString = formatDate(today);

  // 시작일과 종료일이 모두 선택되면, 그 기간에 포함되는 요일 자동 선택
  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    if (start > end) return;

    const daySet = new Set<number>();
    const current = new Date(start);
    while (current <= end) {
      daySet.add(current.getDay());
      current.setDate(current.getDate() + 1);
    }
    setSelectedDays(Array.from(daySet));
  }, [startDate, endDate]);

  const readingDates = useMemo(() => {
    const result: Date[] = [];
    if (!startDate || !endDate) return result;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return result;

    const current = new Date(start);
    while (current <= end) {
      if (selectedDays.includes(current.getDay())) result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [startDate, endDate, selectedDays]);

  const dailyPages = readingDates.length > 0 ? Math.ceil(book.total_pages / readingDates.length) : 0;

  const calendarDays = useMemo(() => {
    const firstDate = new Date(currentYear, currentMonth, 1);
    const lastDate = new Date(currentYear, currentMonth + 1, 0);
    const firstDay = firstDate.getDay();
    const lastDay = lastDate.getDate();
    const prevLastDate = new Date(currentYear, currentMonth, 0).getDate();

    const cells: CalendarCell[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevLastDate - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      cells.push({ date, day, currentMonth: false, dateString: formatDate(date) });
    }
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(currentYear, currentMonth, day);
      cells.push({ date, day, currentMonth: true, dateString: formatDate(date) });
    }
    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - firstDay - lastDay + 1;
      const date = new Date(currentYear, currentMonth + 1, nextDay);
      cells.push({ date, day: nextDay, currentMonth: false, dateString: formatDate(date) });
    }
    return cells;
  }, [currentMonth, currentYear]);

  const moveMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((prev) => prev - 1);
      } else {
        setCurrentMonth((prev) => prev - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((prev) => prev + 1);
      } else {
        setCurrentMonth((prev) => prev + 1);
      }
    }
  };

  const selectCalendarDate = (dateString: string) => {
    if (dateString < todayString) return; // 오늘 이전은 선택 불가 (버튼도 비활성화됨)
    setError("");

    if (!startDate || (startDate && endDate)) {
      setStartDate(dateString);
      setEndDate("");
      return;
    }
    if (new Date(dateString) < new Date(startDate)) {
      setEndDate(startDate);
      setStartDate(dateString);
      return;
    }
    setEndDate(dateString);
  };

  const isInRange = (dateString: string) => {
    if (!startDate || !endDate) return false;
    return dateString > startDate && dateString < endDate;
  };

  const toggleDay = (day: number) => {
    setError("");
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const createGoal = async () => {
    if (!startDate || !endDate) {
      setError("달력에서 시작일과 종료일을 선택해주세요.");
      return;
    }
    if (selectedDays.length === 0) {
      setError("읽을 요일을 하나 이상 선택해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const requestBody: any = {
        title: book.title,
        author: book.author,
        total_pages: book.total_pages,
        isbn: book.isbn || undefined,
        cover: book.cover || undefined,
        start_date: startDate,
        end_date: endDate,
        preferred_days: selectedDays,
      };
      if (book.book_id) requestBody.book_id = book.book_id;

      const res = await authFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        setError("목표를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      router.push("/homescreen");
    } catch (e) {
      console.error(e);
      setError("서버에 연결할 수 없어요. 백엔드 서버가 켜져 있는지 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (d: string) => (d ? `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}` : "—");

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8} accessibilityLabel="책 다시 선택하기">
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>목표 생성</Text>
          {!!book.title && (
            <Text style={s.headerSub} numberOfLines={1}>
              {book.title} · {book.total_pages}쪽
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 달력 */}
        <View style={s.card}>
          <View style={s.calHead}>
            <Pressable onPress={() => moveMonth("prev")} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={C.inkSub} />
            </Pressable>
            <Text style={s.calTitle}>
              {currentYear}년 {currentMonth + 1}월
            </Text>
            <Pressable onPress={() => moveMonth("next")} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={C.inkSub} />
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {WEEK_EN.map((w, i) => (
              <Text key={w} style={[s.weekText, i === 0 && { color: C.peach }]}>
                {w}
              </Text>
            ))}
          </View>

          <View style={s.grid}>
            {calendarDays.map((item) => {
              const isStart = item.dateString === startDate;
              const isEnd = item.dateString === endDate;
              const edge = isStart || isEnd;
              const inRange = isInRange(item.dateString);
              const isPast = item.dateString < todayString;
              const isToday = item.dateString === todayString;
              const hasRange = !!startDate && !!endDate && startDate !== endDate;

              return (
                <Pressable
                  key={item.dateString}
                  style={s.cell}
                  onPress={() => selectCalendarDate(item.dateString)}
                  disabled={isPast}
                >
                  {/* 기간 띠 */}
                  {(inRange || (hasRange && edge)) && (
                    <View
                      style={[
                        s.band,
                        isStart && { left: "50%" },
                        isEnd && { right: "50%" },
                      ]}
                    />
                  )}
                  <View style={[s.dayCircle, edge && s.dayCircleOn]}>
                    <Text
                      style={[
                        s.dayText,
                        (!item.currentMonth || isPast) && s.dayTextMuted,
                        inRange && s.dayTextRange,
                        isToday && !edge && s.dayTextToday,
                        edge && s.dayTextOn,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={s.periodRow}>
            <View style={s.periodBox}>
              <Text style={s.periodLabel}>시작</Text>
              <Text style={s.periodValue}>{fmt(startDate)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={C.inkMute} />
            <View style={s.periodBox}>
              <Text style={s.periodLabel}>종료</Text>
              <Text style={s.periodValue}>{fmt(endDate)}</Text>
            </View>
          </View>
        </View>

        {/* 읽을 요일 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>읽을 요일</Text>
          <View style={s.dayRow}>
            {days.map((day) => {
              const active = selectedDays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  style={[s.dayChip, active && s.dayChipOn]}
                  onPress={() => toggleDay(day.value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[s.dayChipText, active && { color: "#fff" }]}>{day.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 하루 목표량 (자동 계산) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>하루 목표량</Text>
          <View style={s.dailyBox}>
            <Text style={s.dailyHint}>기간과 요일에 맞춰 자동으로 계산돼요</Text>
            <Text style={s.dailyValue}>
              {dailyPages}
              <Text style={s.dailyUnit}> 쪽</Text>
            </Text>
          </View>
        </View>

        {/* 실제 독서일 */}
        <View style={s.result}>
          <Text style={s.resultNum}>{readingDates.length}</Text>
          <Text style={s.resultLabel}>실제 독서일</Text>
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.mainButton, pressed && { opacity: 0.85 }, submitting && { opacity: 0.6 }]}
          onPress={createGoal}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.mainButtonText}>계획 생성하기</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const CELL = `${100 / 7}%` as const;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, fontWeight: "500", color: C.inkSub, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 130, gap: 26 },

  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 18,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, marginBottom: 12 },
  calTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekText: { width: CELL, textAlign: "center", fontSize: 11, fontWeight: "700", color: C.inkMute },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: 42, alignItems: "center", justifyContent: "center" },
  band: { position: "absolute", left: 0, right: 0, top: 5, bottom: 5, backgroundColor: C.primarySoft },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayCircleOn: { backgroundColor: C.primary },
  dayText: { fontSize: 14, fontWeight: "500", color: C.ink },
  dayTextMuted: { color: "#D5D7E3" },
  dayTextRange: { color: C.primary, fontWeight: "700" },
  dayTextToday: { color: C.primary, fontWeight: "800" },
  dayTextOn: { color: "#fff", fontWeight: "800" },

  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  periodBox: { flex: 1, alignItems: "center", gap: 2 },
  periodLabel: { fontSize: 11, fontWeight: "600", color: C.inkMute },
  periodValue: { fontSize: 16, fontWeight: "700", color: C.ink },

  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: C.ink, letterSpacing: -0.3 },
  dayRow: { flexDirection: "row", justifyContent: "space-between" },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipOn: { backgroundColor: C.primary, borderColor: C.primary },
  dayChipText: { fontSize: 14, fontWeight: "700", color: C.inkSub },

  dailyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
    height: 56,
  },
  dailyHint: { flex: 1, fontSize: 12, color: C.inkMute },
  dailyValue: { fontSize: 20, fontWeight: "800", color: C.ink },
  dailyUnit: { fontSize: 14, fontWeight: "700", color: C.primary },

  result: { alignItems: "center", paddingVertical: 4 },
  resultNum: { fontSize: 88, lineHeight: 96, fontWeight: "800", color: C.primary, letterSpacing: -3 },
  resultLabel: { fontSize: 13, fontWeight: "600", color: C.inkSub },

  error: { textAlign: "center", fontSize: 13, fontWeight: "600", color: C.danger },

  footer: { position: "absolute", left: 20, right: 20, bottom: 28 },
  mainButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mainButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});