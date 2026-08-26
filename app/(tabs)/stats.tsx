import { authFetch, BASE_URL } from "@/constants/api";
import { Colors } from "@/constants/tokens";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";
import { styles } from "../styles/stats.styles";

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
  booksProgress: BookProgress[]; // 백엔드에서 넘어오는 책별 진행률 리스트
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = [2024, 2025, 2026, 2027];

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);

  const currentDate = new Date();
const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [tabType, setTabType] = useState<"weekly" | "monthly">("weekly");

  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const myNickname = "hongildong";

  useEffect(() => {
    fetchStats();
  }, [selectedYear, selectedMonth, tabType]);

  // ★ 백엔드 통계 API 하나만 호출하여 데이터와 책 진행률을 동시에 세팅합니다.
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
  const maxVal = graphValues.length > 0 ? Math.max(...graphValues, 1) : 10;
  const booksWithProgress = data?.booksProgress || [];

  return (
    <View style={styles.safeArea}>
      <Header />
      
      {/* 상단 타이틀 및 드롭다운 선택 영역 */}
      <View style={styles.headerRow}>
        <View style={styles.mainTitleContainer}>
          <Text style={styles.mainTitleNum}>{selectedMonth}</Text>
          <Text style={styles.mainTitleText}>월의 통계</Text>
        </View>

        <View style={styles.pickerContainer}>
          <TouchableOpacity 
            style={styles.pickerBubble} 
            onPress={() => setMonthModalVisible(true)}
          >
            <Text style={styles.pickerText}>{MONTH_NAMES[selectedMonth - 1]}</Text>
            <Text style={{ fontSize: 10, color: "#4A5568" }}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pickerBubble} 
            onPress={() => setYearModalVisible(true)}
          >
            <Text style={styles.pickerText}>{selectedYear}</Text>
            <Text style={{ fontSize: 10, color: "#4A5568" }}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 월 선택 모달 */}
      <Modal visible={monthModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthModalVisible(false)}>
          <View style={styles.dropdownBox}>
            <FlatList
              data={MONTH_NAMES}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedMonth(index + 1);
                    setMonthModalVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedMonth === index + 1 && { color: "#8C7AE6", fontWeight: "bold" }]}>
                    {item} ({index + 1}월)
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 연도 선택 모달 */}
      <Modal visible={yearModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setYearModalVisible(false)}>
          <View style={styles.dropdownBox}>
            <FlatList
              data={YEARS}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedYear(item);
                    setYearModalVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedYear === item && { color: "#8C7AE6", fontWeight: "bold" }]}>
                    {item}년
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* 그래프 카드 영역 */}
        <View style={styles.chartCard}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, tabType === "weekly" && styles.tabButtonActive]}
              onPress={() => setTabType("weekly")}
            >
              <Text style={[styles.tabButtonText, tabType === "weekly" && styles.tabButtonTextActive]}>
                주간
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tabType === "monthly" && styles.tabButtonActive]}
              onPress={() => setTabType("monthly")}
            >
              <Text style={[styles.tabButtonText, tabType === "monthly" && styles.tabButtonTextActive]}>
                월간
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ height: 160 }} color={Colors.textSecondary} />
          ) : graphValues.length === 0 ? (
            <View style={{ height: 160, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: "#718096", fontSize: 13 }}>표시할 통계 데이터가 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.graphWrapper}>
              <View style={styles.barsContainer}>
                {graphValues.map((val, idx) => (
                  <View key={idx} style={styles.barColumn}>
                    <View
                      style={[
                        styles.barActiveShape,
                        { height: `${Math.min((val / maxVal) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.xAxisLine} />
              <View style={styles.labelsContainer}>
                {tabType === "weekly"
                  ? ["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                      <Text key={i} style={styles.axisLabel}>{day}</Text>
                    ))
                  : ["1월", "2월", "3월", "4월", "5월", "6월", "7월"].map((month, i) => (
                      <Text key={i} style={styles.axisLabel}>{month}</Text>
                    ))}
              </View>
            </View>
          )}
        </View>

        {/* 평균 독서 시간 배너 */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            {myNickname} 님의 주 독서 시간대는{" "}
            <Text style={{ fontWeight: "bold" }}>
              {data?.averageReadingTime || "00:00"}
            </Text>{" "}
            입니다.
          </Text>
        </View>

        {/* 독서 진행률 카드 영역 */}
        <View style={styles.bookSectionCard}>
          <Text style={styles.sectionTitle}>독서 진행률</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.textSecondary} />
          ) : booksWithProgress.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: "#718096", fontSize: 13 }}>등록된 독서 목표 도서가 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.bookGrid}>
              {booksWithProgress.map((book) => (
                <View key={book.id} style={styles.bookCard}>
                  <Image
                    source={book.coverUrl ? { uri: book.coverUrl } : require("@/assets/images/react-logo.png")}
                    style={styles.bookCover}
                    resizeMode="cover"
                  />
                  <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(book.progress, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressPercentText}>{book.progress} %</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}