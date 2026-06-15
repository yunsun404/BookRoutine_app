import { Colors, FontSize } from "@/constants/tokens";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";

const BASE_URL = "http://localhost:3000/api/v1";
const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";

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

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);
  
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(4);
  const [tabType, setTabType] = useState<"weekly" | "monthly">("weekly");

  const myNickname = "hongildong";

  useEffect(() => {
    fetchStats();
  }, [selectedYear, selectedMonth, tabType]);

  async function fetchStats() {
    try {
      setLoading(true);
      const url = `${BASE_URL}/stats?user_id=${USER_ID}&year=${selectedYear}&month=${selectedMonth}&type=${tabType}`;
      console.log("요청 URL:", url); // 👈 로그 추가: URL이 맞는지 확인

      const res = await fetch(url);
      
      // 401 에러 등을 잡기 위해 응답 상태 체크
      if (!res.ok) {
        console.error("서버 응답 에러 상태:", res.status);
        return;
      }

      const resData = await res.json();
      console.log("서버에서 받은 데이터:", resData); // 👈 로그 추가: 데이터가 오는지 확인
      setData(resData);
    } catch (e) {
      console.error("통계 데이터 가져오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  const maxVal = data?.graphData && data.graphData.length > 0 ? Math.max(...data.graphData, 1) : 1;

  return (
    <View style={styles.safeArea}>
      <Header />
      <View style={styles.headerRow}>
        <Text style={styles.mainTitle}>{selectedMonth}<Text style={styles.mainTitleSub}>월의 통계</Text></Text>
        <View style={styles.pickerContainer}>
          <TouchableOpacity style={styles.pickerBubble}><Text style={styles.pickerText}>Apr ▾</Text></TouchableOpacity>
          <TouchableOpacity style={styles.pickerBubble}><Text style={styles.pickerText}>2026 ▾</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.chartCard}>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabButton, tabType === "weekly" && styles.tabButtonActive]} onPress={() => setTabType("weekly")}>
              <Text style={[styles.tabButtonText, tabType === "weekly" && styles.tabButtonTextActive]}>✓ 주간</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, tabType === "monthly" && styles.tabButtonActive]} onPress={() => setTabType("monthly")}>
              <Text style={[styles.tabButtonText, tabType === "monthly" && styles.tabButtonTextActive]}>월간</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ height: 160 }} color={Colors.textSecondary} />
          ) : (
            <View style={styles.graphWrapper}>
              <View style={styles.barsContainer}>
                {(data?.graphData || []).map((val, idx) => (
                  <View key={idx} style={styles.barColumn}>
                    <View style={[styles.barActiveShape, { height: `${(val / maxVal) * 100}%` }]} />
                  </View>
                ))}
              </View>
              <View style={styles.xAxisLine} />
              <View style={styles.labelsContainer}>
                {tabType === "weekly" ? ["일", "월", "화", "수", "목", "금", "토"].map((day, i) => <Text key={i} style={styles.axisLabel}>{day}</Text>) : ["1주", "2주", "3주", "4주", "5주"].map((week, i) => <Text key={i} style={styles.axisLabel}>{week}</Text>)}
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            {myNickname} 님의 주 독서 시간대는 <Text style={{ fontWeight: "bold" }}>{data?.averageReadingTime || "00:00"}</Text> 입니다.
          </Text>
        </View>

        <View style={styles.bookSection}>
          {/* 데이터가 없으면 안내 문구를 띄워 확인하기 쉽게 함 */}
          {(!data?.booksProgress || data.booksProgress.length === 0) && !loading && (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>표시할 독서 데이터가 없습니다.</Text>
          )}
          {(data?.booksProgress || []).map((book) => (
            <View key={book.id} style={styles.bookCard}>
              <Image source={book.coverUrl ? { uri: book.coverUrl } : require("@/assets/images/react-logo.png")} style={styles.bookCover} resizeMode="cover" />
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${book.progress}%` }]} />
                </View>
                <Text style={styles.progressPercentText}>{book.progress} %</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
// (Styles)

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16, marginTop: 8 },
  mainTitle: { fontSize: 28, fontWeight: "bold", color: "#000" },
  mainTitleSub: { fontSize: 20, fontWeight: "600" },
  
  pickerContainer: { flexDirection: "row", gap: 8 },
  pickerBubble: { borderWidth: 1, borderColor: "#DDD", borderRadius: 8, backgroundColor: "#FAFAFA" },
  pickerText: { fontSize: FontSize.sm, color: "#666", paddingHorizontal: 10, paddingVertical: 4 },

  chartCard: { 
    borderWidth: 1, 
    borderColor: "#E0E0E0", 
    borderRadius: 24, 
    padding: 16, 
    backgroundColor: "#FFF", 
    marginBottom: 16 
  },
  tabContainer: { flexDirection: "row", alignSelf: "flex-end", backgroundColor: "#EFEFEF", borderRadius: 12, padding: 3, marginBottom: 16 },
  tabButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9 },
  tabButtonActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabButtonText: { fontSize: FontSize.xs, color: "#777", fontWeight: "500" },
  tabButtonTextActive: { color: "#000", fontWeight: "bold" },
  
  graphWrapper: { height: 180, justifyContent: "flex-end", paddingTop: 10 },
  barsContainer: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", flex: 1, paddingHorizontal: 8 },
  barColumn: { width: 24, height: "100%", justifyContent: "flex-end" },
  barActiveShape: { width: "100%", backgroundColor: "#C8C8C8", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  xAxisLine: { height: 4, backgroundColor: "#E0E0E0", width: "100%", marginTop: 4 },
  labelsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  axisLabel: { fontSize: FontSize.xs, color: "#333", fontWeight: "600" },

  infoBanner: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, alignItems: "center", marginBottom: 16 },
  infoBannerText: { fontSize: FontSize.sm, color: "#111" },

  bookSection: { gap: 16 },
  bookCard: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 24, padding: 20, alignItems: "center", backgroundColor: "#FFF" },
  bookCover: { width: 110, height: 160, borderRadius: 4, marginBottom: 16, backgroundColor: "#333" },
  progressContainer: { width: "100%", alignItems: "center" },
  progressBarBg: { width: "80%", height: 8, backgroundColor: "#EAEAEA", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressBarFill: { height: "100%", backgroundColor: "#FFD200" }, 
  progressPercentText: { fontSize: FontSize.sm, fontWeight: "bold", color: "#333" },
});