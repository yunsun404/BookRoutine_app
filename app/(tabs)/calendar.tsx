import {
  Colors,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/tokens";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";

const BASE_URL = "http://localhost:3000/api/v1";
const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// 달성 level에 따른 색상
// 물이 차오르듯 — 0은 투명, 1은 연한 빨강, 2는 진한 빨강
function getLevelColor(level: number) {
  if (level === 2) return "#C0392B"; // 전체 완료
  if (level === 1) return "#E8A09A"; // 일부 완료
  return "transparent"; // 없음
}

type MonthlyItem = {
  date: string;
  total: number;
  done: number;
  level: number;
};

type ChecklistItem = {
  checklist_id: string;
  goal_content: string;
  check_box: boolean;
  date: string;
  book: { title: string };
};

export default function CalendarScreen() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyItem>>(
    {},
  );
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  useEffect(() => {
    fetchMonthly();
    setSelectedDate(null);
    setChecklists([]);
  }, [year, month]);

  async function fetchMonthly() {
    setLoadingCalendar(true);
    try {
      const res = await fetch(
        `${BASE_URL}/checklists/monthly?user_id=${USER_ID}&year=${year}&month=${month}`,
      );
      const data: MonthlyItem[] = await res.json();

      // 배열 → 날짜 키 Record로 변환 — O(1) 조회 가능
      const map: Record<string, MonthlyItem> = {};
      data.forEach((item) => {
        map[item.date] = item;
      });
      setMonthlyData(map);
    } catch (e) {
      console.error("월별 데이터 불러오기 실패:", e);
    } finally {
      setLoadingCalendar(false);
    }
  }

  async function fetchChecklist(dateStr: string) {
    setLoadingChecklist(true);
    try {
      const res = await fetch(
        `${BASE_URL}/checklists?user_id=${USER_ID}&date=${dateStr}`,
      );
      const data: ChecklistItem[] = await res.json();
      console.log("체크리스트 응답:", data); // ✅ 로그 추가
      setChecklists(data);
    } catch (e) {
      console.error("체크리스트 불러오기 실패:", e);
    } finally {
      setLoadingChecklist(false);
    }
  }

  function handleDatePress(day: number) {
    // ✅ UTC 변환 없이 로컬 날짜 문자열로 직접 생성
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    fetchChecklist(dateStr);
  }

  function handlePrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  }

  function handleNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  }

  // 해당 월의 1일 요일과 마지막 날짜 계산
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const lastDay = new Date(year, month, 0).getDate();

  // 캘린더 그리드 — 빈칸 + 날짜 채우기
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  // 7개씩 잘라서 주(row) 단위로
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 월 이동 헤더 */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <Text style={styles.arrow}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {year}년 {month}월
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Text style={styles.arrow}>{">"}</Text>
          </TouchableOpacity>
        </View>

        {/* 캘린더 */}
        <View style={styles.calendarBox}>
          {/* 요일 헤더 */}
          <View style={styles.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.dayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {loadingCalendar ? (
            <ActivityIndicator style={{ marginVertical: 32 }} />
          ) : (
            weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.dayCell} />;

                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const data = monthlyData[dateStr];
                  const level = data?.level ?? 0;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <TouchableOpacity
                      key={di}
                      style={styles.dayCell}
                      onPress={() => handleDatePress(day)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          { backgroundColor: getLevelColor(level) },
                          isToday && styles.todayCircle,
                          isSelected && styles.selectedCircle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isToday && styles.todayText,
                            isSelected && styles.selectedText,
                            level > 0 && styles.levelText,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {/* 주의 빈 칸 채우기 */}
                {week.length < 7 &&
                  Array(7 - week.length)
                    .fill(null)
                    .map((_, i) => (
                      <View key={`empty-${i}`} style={styles.dayCell} />
                    ))}
              </View>
            ))
          )}
        </View>

        {/* 선택한 날짜의 체크리스트 */}
        {selectedDate && (
          <View style={styles.checklistBox}>
            <Text style={styles.checklistTitle}>
              {Number(selectedDate.split("-")[2])}일 체크리스트
            </Text>

            {loadingChecklist ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : checklists.length === 0 ? (
              <Text style={styles.emptyText}>이날은 체크리스트가 없어요</Text>
            ) : (
              checklists.map((item) => (
                <View key={item.checklist_id} style={styles.checkItem}>
                  <View
                    style={[
                      styles.checkbox,
                      item.check_box && styles.checkboxDone,
                    ]}
                  >
                    {item.check_box && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[
                      styles.checkText,
                      item.check_box && styles.checkTextDone,
                    ]}
                  >
                    {item.goal_content}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
  },
  arrowBtn: { padding: 8 },
  arrow: { fontSize: FontSize.lg, color: Colors.textSecondary },
  monthTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  calendarBox: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    padding: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  dayLabel: {
    width: 36,
    textAlign: "center",
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
  },
  selectedCircle: {
    borderWidth: 2,
    borderColor: "#C0392B",
  },
  dayText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  todayText: {
    fontWeight: "600",
  },
  selectedText: {
    color: "#C0392B",
    fontWeight: "600",
  },
  levelText: {
    color: "#fff",
  },

  checklistBox: {
    marginHorizontal: Spacing.lg,
    marginTop: 16,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    padding: 16,
  },
  checklistTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: 12,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: Colors.check },
  checkmark: { fontSize: 11, color: "#fff", fontWeight: "700" },
  checkText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  checkTextDone: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
});
