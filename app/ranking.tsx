import { FontSize } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
// 🛠️ 에러 수정: ranking 폴더 깊이에 맞게 경로를 ../../로 올바르게 수정했습니다.
import Header from "../components/Header";

const BASE_URL = "http://localhost:3000/api/v1";
const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";

interface RankUser {
  rank: number;
  username: string;
  nickname: string;
  profile_image: string | null;
  completed_books_count: number;
}

interface ApiResponse {
  ageGroup: number;
  ranking: RankUser[];
}

export default function RankingScreen() {
  const [rankingData, setRankingData] = useState<RankUser[]>([]);
  const [ageGroup, setAgeGroup] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const myNickname = "데미안"; 
  const myPercentile = 3; 

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    try {
      const res = await fetch(`${BASE_URL}/ranking/age-group?user_id=${USER_ID}`);
      const data: ApiResponse = await res.json();
      setRankingData(data.ranking);
      setAgeGroup(data.ageGroup);
    } catch (e) {
      console.error("랭킹 데이터 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  const top1 = rankingData.find((u) => u.rank === 1);
  const top2 = rankingData.find((u) => u.rank === 2);
  const top3 = rankingData.find((u) => u.rank === 3);
  
  const remainedRankers = rankingData.filter((u) => u.rank >= 4);
  const currentMonth = new Date().getMonth() + 1;

  return (
    <View style={styles.container}>
      {/* ✅ 책장 스크린과 100% 동일한 배치 순서 */}
      <Header />
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.monthTitle}>
          {currentMonth}<Text style={styles.monthSub}> 월 랭킹</Text>
        </Text>

        <View style={styles.podiumContainer}>
          {/* 2등 */}
          <View style={styles.podiumColumn}>
            {top2 && (
              <>
                <Image 
                  source={top2.profile_image ? { uri: top2.profile_image } : require("@/assets/images/react-logo.png")} 
                  style={styles.profileSecondary} 
                />
                <Text style={styles.podiumName} numberOfLines={1}>{top2.nickname}</Text>
                <View style={[styles.bar, { height: 75, backgroundColor: "#E6E6E6" }]}>
                  <Text style={styles.barText}>2</Text>
                </View>
              </>
            )}
          </View>

          {/* 1등 */}
          <View style={styles.podiumColumn}>
            {top1 && (
              <>
                <Text style={styles.crown}>👑</Text>
                <Image 
                  source={top1.profile_image ? { uri: top1.profile_image } : require("@/assets/images/react-logo.png")} 
                  style={styles.profilePrimary} 
                />
                <Text style={[styles.podiumName, { fontWeight: "bold" }]} numberOfLines={1}>{top1.nickname}</Text>
                <View style={[styles.bar, { height: 105, backgroundColor: "#D9D9D9" }]}>
                  <Text style={[styles.barText, { color: "#555" }]}>1</Text>
                </View>
              </>
            )}
          </View>

          {/* 3등 */}
          <View style={styles.podiumColumn}>
            {top3 && (
              <>
                <Image 
                  source={top3.profile_image ? { uri: top3.profile_image } : require("@/assets/images/react-logo.png")} 
                  style={styles.profileSecondary} 
                />
                <Text style={styles.podiumName} numberOfLines={1}>{top3.nickname}</Text>
                <View style={[styles.bar, { height: 55, backgroundColor: "#EEEEEE" }]}>
                  <Text style={styles.barText}>3</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>
            {myNickname} 님은 같은 연령대 {ageGroup}대에서 상위 {myPercentile}%입니다.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {remainedRankers.map((user) => (
            <View key={user.rank} style={styles.rankItem}>
              <View style={styles.itemLeft}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>{user.rank}</Text>
                </View>
                <Image 
                  source={user.profile_image ? { uri: user.profile_image } : require("@/assets/images/react-logo.png")} 
                  style={styles.listProfile} 
                />
                <Text style={styles.listNickname} numberOfLines={1}>{user.nickname}</Text>
              </View>
              <Text style={styles.bookCountText}>{user.completed_books_count}권 완독</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  backButton: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  scrollContainer: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  monthTitle: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginVertical: 16, color: "#222" },
  monthSub: { fontSize: FontSize.md, fontWeight: "normal", color: "#666" },
  podiumContainer: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", height: 210, marginBottom: 24 },
  podiumColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  crown: { fontSize: 16, marginBottom: 2 },
  profilePrimary: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: "#FFD700" },
  profileSecondary: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: "#E0E0E0" },
  podiumName: { fontSize: FontSize.xs, color: "#333", marginTop: 6, textAlign: "center", paddingHorizontal: 4 },
  bar: { width: "85%", borderTopLeftRadius: 10, borderTopRightRadius: 10, marginTop: 8, justifyContent: "center", alignItems: "center" },
  barText: { fontSize: FontSize.md, fontWeight: "bold", color: "#888" },
  bannerBox: { backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, alignItems: "center", marginBottom: 20 },
  bannerText: { fontSize: FontSize.sm, color: "#444", textAlign: "center", lineHeight: 20 },
  listContainer: { gap: 10 },
  rankItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F2F2F2", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14 },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E0E0E0", justifyContent: "center", alignItems: "center" },
  rankBadgeText: { fontSize: FontSize.sm, fontWeight: "bold", color: "#666" },
  listProfile: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ccc" },
  listNickname: { fontSize: FontSize.sm, fontWeight: "500", color: "#222", flex: 1 },
  bookCountText: { fontSize: FontSize.xs, color: "#777", fontWeight: "600" },
});