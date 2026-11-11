import { authFetch, BASE_URL } from "@/constants/api";
import { findMyRow, isMe } from "@/lib/ranking/myRank";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Header from "../components/Header";

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
  lavenderSoft: "#F3EEFF",
  peach: "#FF8A7C",
  peachSoft: "#FFF1EE",
};

/* 프로필 사진 (없으면 닉네임 첫 글자) */
function Avatar({ uri, name, size, ring }: { uri: string | null; name: string; size: number; ring?: string }) {
  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 3 : 0,
    borderColor: ring ?? "transparent",
  };
  if (uri) return <Image source={{ uri }} style={[base, { backgroundColor: C.line }]} />;
  return (
    <View style={[base, { backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: C.primary, fontWeight: "800", fontSize: size * 0.38 }}>
        {(name || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export default function RankingScreen() {
  const [rankingData, setRankingData] = useState<RankUser[]>([]);
  const [ageGroup, setAgeGroup] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 로그인한 사용자 (앱 시작 때 /users/me 로 채워짐)
  const me = useAuthStore((st) => st.user);
  const myName = me?.nickname || "나";

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(`${BASE_URL}/ranking/age-group`);
      const data: ApiResponse = await res.json();
      setRankingData(data.ranking || []);
      setAgeGroup(data.ageGroup || 0);
    } catch (e) {
      console.error("랭킹 데이터 불러오기 실패:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const myRow = findMyRow(rankingData, me);
  const top1 = rankingData.find((u) => u.rank === 1);
  const top2 = rankingData.find((u) => u.rank === 2);
  const top3 = rankingData.find((u) => u.rank === 3);
  const maxCount = Math.max(1, ...rankingData.slice(0, 3).map((u) => u.completed_books_count));
  const currentMonth = new Date().getMonth() + 1;

  // 시상대 순서: 2위 - 1위 - 3위
  const podium: { user?: RankUser; rank: number }[] = [
    { user: top2, rank: 2 },
    { user: top1, rank: 1 },
    { user: top3, rank: 3 },
  ];

  return (
    <View style={s.screen}>
      <Header />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.titleRow}>
          <Text style={s.titleNum}>{currentMonth}월</Text>
          <Text style={s.titleText}>독서 랭킹</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 80 }} color={C.primary} />
        ) : error ? (
          <View style={s.stateBox}>
            <Text style={s.stateTitle}>랭킹을 불러오지 못했어요</Text>
            <Pressable style={s.retryBtn} onPress={fetchRanking}>
              <Text style={s.retryText}>다시 불러오기</Text>
            </Pressable>
          </View>
        ) : rankingData.length === 0 ? (
          <View style={s.stateBox}>
            <Text style={s.stateTitle}>이번 달 랭킹이 아직 없어요</Text>
            <Text style={s.stateSub}>책을 완독하면 랭킹에 이름이 올라가요</Text>
          </View>
        ) : (
          <>
            {/* 시상대 */}
            <View style={[s.card, s.podiumCard]}>
              <View style={s.podium}>
                {podium.map(({ user, rank }) => {
                  const first = rank === 1;
                  if (!user) return <View key={rank} style={s.podiumCol} />;
                  const barH = 60 + (user.completed_books_count / maxCount) * 80;
                  return (
                    <View key={rank} style={s.podiumCol}>
                      {first && <Ionicons name="trophy" size={18} color={C.peach} style={{ marginBottom: 4 }} />}
                      <View style={first ? s.firstRing : undefined}>
                        <Avatar
                          uri={user.profile_image}
                          name={user.nickname}
                          size={first ? 62 : 50}
                          ring={first ? undefined : C.card}
                        />
                      </View>
                      <Text style={[s.podiumName, first && { color: C.ink }]} numberOfLines={1}>
                        {user.nickname}
                      </Text>
                      <Text style={s.podiumCount}>{user.completed_books_count}권</Text>
                      <View style={[s.bar, { height: barH }, first ? s.barFirst : s.barOther]}>
                        <Text style={[s.barRank, first && { color: "#fff" }]}>{rank}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 내 위치 + 전체 순위 */}
            <View style={s.card}>
              <View style={s.banner}>
                <Text style={s.bannerText}>
                  {myName} 님은 같은 연령대 {ageGroup}대에서
                </Text>
                {/* 서버가 상위 20명만 줘서 "상위 N%"는 계산할 수 없음 → 목록에 있을 때만 순위 표시 */}
                <Text style={s.bannerStrong}>
                  {myRow ? `${myRow.rank}위 · ${myRow.completed_books_count}권 완독` : "아직 순위 밖이에요"}
                </Text>
              </View>

              <View style={s.list}>
                {rankingData.map((user) => {
                  const mine = isMe(user, me);
                  const top = user.rank <= 3;
                  return (
                    <View key={`${user.rank}-${user.username}`} style={[s.row, mine && s.rowMine]}>
                      <View style={[s.rankBadge, top && s.rankBadgeTop]}>
                        <Text style={[s.rankNum, top && { color: C.primary }]}>{user.rank}</Text>
                      </View>
                      <Avatar uri={user.profile_image} name={user.nickname} size={34} />
                      <Text style={s.rowName} numberOfLines={1}>
                        {user.nickname}
                        {mine && <Text style={{ color: C.primary }}>  나</Text>}
                      </Text>
                      <Text style={s.rowCount}>{user.completed_books_count}권 완독</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 130, gap: 16 },

  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 6, paddingTop: 8, paddingBottom: 4 },
  titleNum: { fontSize: 32, fontWeight: "800", color: C.primary, letterSpacing: -1 },
  titleText: { fontSize: 20, fontWeight: "700", color: C.ink },

  stateBox: { alignItems: "center", gap: 6, paddingVertical: 80 },
  stateTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  stateSub: { fontSize: 13, color: C.inkSub },
  retryBtn: { marginTop: 10, backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 13, fontWeight: "700", color: C.primary },

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

  podiumCard: { paddingTop: 28, paddingBottom: 0, overflow: "hidden" },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  podiumCol: { flex: 1, alignItems: "center" },
  firstRing: { padding: 3, borderRadius: 40, backgroundColor: C.peach },
  podiumName: { marginTop: 6, fontSize: 12, fontWeight: "700", color: C.inkSub, maxWidth: "100%" },
  podiumCount: { fontSize: 11, color: C.inkMute, marginTop: 1, marginBottom: 8 },
  bar: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: "center",
    paddingTop: 12,
  },
  barFirst: { backgroundColor: C.primary },
  barOther: { backgroundColor: C.primarySoft },
  barRank: { fontSize: 22, fontWeight: "800", color: C.primary },

  banner: { backgroundColor: C.primarySoft, borderRadius: 16, padding: 16, alignItems: "center" },
  bannerText: { fontSize: 13, fontWeight: "500", color: C.inkSub },
  bannerStrong: { fontSize: 20, fontWeight: "800", color: C.primary, marginTop: 2 },

  list: { gap: 8, marginTop: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.bg,
  },
  rowMine: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.primary },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankBadgeTop: { backgroundColor: C.primarySoft },
  rankNum: { fontSize: 14, fontWeight: "800", color: C.inkMute },
  rowName: { flex: 1, fontSize: 15, fontWeight: "700", color: C.ink },
  rowCount: { fontSize: 12, fontWeight: "600", color: C.inkSub },
});