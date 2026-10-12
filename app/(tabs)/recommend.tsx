import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";
import Header from "../../components/Header";
import BookRow, { type RowBook } from "../../components/recommend/BookRow";
// ⭕ 정해진 lib/api 경로에서 userApi와 함께 그룹/독서방/추천 관련 API 객체도 가져옵니다.
import { Colors } from "@/constants/tokens";
import { bookApi, userApi } from "../../lib/api";
// ⭕ DB(ai_thread_summaries)에 저장된 AI 요약 조회
import { aiSummaryApi, BookAiSummary } from "../../lib/aiSummaryApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AI_CARD_WIDTH = SCREEN_WIDTH - 48; // 옆 카드가 살짝 보이도록

/** key_insights(Json)가 문자열 배열이면 최대 3개만 뽑아서 사용 */
function toInsights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, 3);
}

export default function RecommendScreen() {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");

  // 국립중앙도서관 사서 추천 (최근 추천순, DB에 없는 책이라 isbn으로 책 소개를 연다)
  const [librarianBooks, setLibrarianBooks] = useState<RowBook[]>([]);

  // 또래가 읽고 있는 책 — scope가 all이면 전체 사용자 인기 책
  const [peerBooks, setPeerBooks] = useState<RowBook[]>([]);
  const [peerAgeGroup, setPeerAgeGroup] = useState<number | null>(null);

  // ⭕ DB에 저장된 AI 요약 — 마지막으로 요약된 책 5개 (책마다 1개, 오래된 순)
  const [aiSummaries, setAiSummaries] = useState<BookAiSummary[]>([]);

  // 나만을 위한 추천 (장르유사도/난이도매칭/완독패턴 가중합)
  const [recommendedBooks, setRecommendedBooks] = useState<RowBook[]>([]);

  useEffect(() => {
    async function initRecommendData() {
      try {
        setLoading(true);

        // 1. 사용자 닉네임
        const me = await userApi.getMe();
        if (me) setNickname(me.nickname ?? "");

        // 사서 추천 / 또래 추천은 서로 기다릴 필요 없어서 동시에 요청 (하나 실패해도 나머지는 표시)
        const [librarianRes, peerRes] = await Promise.allSettled([
          bookApi.getLibrarianRecommendations(10),
          bookApi.getPeerRecommendations(10),
        ]);

        if (librarianRes.status === "fulfilled") {
          setLibrarianBooks(
            librarianRes.value.items.map((b) => ({
              key: b.isbn,
              title: b.title,
              author: b.author,
              coverUrl: b.cover_url,
              caption: `${b.recommended_at} · ${b.category}`,
              onPress: () => router.push({ pathname: "/book-detail", params: { isbn: b.isbn } }),
            })),
          );
        } else {
          console.error("사서 추천 불러오기 실패:", librarianRes.reason);
        }

        if (peerRes.status === "fulfilled") {
          setPeerAgeGroup(peerRes.value.scope === "peer" ? peerRes.value.age_group : null);
          setPeerBooks(
            peerRes.value.items.map((b) => ({
              key: b.book_id,
              title: b.title,
              author: b.author,
              coverUrl: b.cover_url,
              caption: `${b.reader_count}명이 담았어요`,
              onPress: () => router.push({ pathname: "/book-detail", params: { book_id: b.book_id, infoOnly: "1" } }),
            })),
          );
        } else {
          console.error("또래 추천 불러오기 실패:", peerRes.reason);
        }

        // 2. [AI 요약] 내 타래 + 내 그룹 타래 기준, 마지막으로 요약된 책 5개를 DB에서 조회
        try {
          const summaries = await aiSummaryApi.getRecent(5);
          setAiSummaries(summaries);
        } catch (summaryError) {
          // 요약만 실패해도 추천 목록은 계속 보여준다.
          console.error("AI 요약 불러오기 실패:", summaryError);
          setAiSummaries([]);
        }

        // 3. 추천 알고리즘 연동 — 장르 유사도 + 난이도 매칭 + 완독 패턴 가중합으로
        //    정렬된 top-N 목록을 백엔드(GET /recommendation)에서 받아온다.
        try {
          const recs = await bookApi.getRecommendations(10);
          setRecommendedBooks(
            recs.map((r) => ({
              key: r.book_id,
              title: r.title,
              author: r.author,
              coverUrl: r.cover_url,
              onPress: () => router.push({ pathname: "/book-detail", params: { book_id: r.book_id, infoOnly: "1" } }),
            })),
          );
        } catch (recError) {
          // 추천 목록만 실패해도 화면 전체(AI 요약 등)는 계속 보여준다.
          console.error("추천 목록 불러오기 실패:", recError);
          setRecommendedBooks([]);
        }

      } catch (error) {
        console.error("추천 데이터 빌드 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    initRecommendData();
  }, []);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.textSecondary || "#333"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 상단 섹션: DB에 저장된 AI 타래 요약 (책별 1개, 가로 스와이프) */}
        <View style={styles.aiSection}>
          <Text style={styles.sectionTitle}>“지금 읽어보고 싶은 도서는?”</Text>

          {aiSummaries.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={AI_CARD_WIDTH + 12}
              decelerationRate="fast"
              contentContainerStyle={styles.aiScrollPadding}
            >
              {aiSummaries.map((item) => {
                const insights = toInsights(item.key_insights);
                return (
                  <View key={item.summary_id} style={[styles.aiCard, { width: AI_CARD_WIDTH }]}>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI 맞춤 분석</Text>
                    </View>
                    <Text style={styles.aiSummaryText} numberOfLines={6}>
                      {item.summary}
                    </Text>

                    {insights.length > 0 && (
                      <View style={styles.insightList}>
                        {insights.map((insight, i) => (
                          <Text key={i} style={styles.insightText} numberOfLines={2}>
                            • {insight}
                          </Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.aiDivider} />
                    <Text style={styles.aiBookTarget}>
                      🎯 대상 도서: <Text style={styles.boldText}>{item.book_title}</Text>
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={[styles.aiCard, styles.aiCardSingle]}>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI 맞춤 분석</Text>
              </View>
              <Text style={styles.emptyText}>
                아직 요약된 타래가 없어요.{"\n"}그룹에서 타래를 남기면 AI가 요약해줄게요!
              </Text>
            </View>
          )}
        </View>

        {/* 2. 국립중앙도서관 사서 추천: 4개 분류 합쳐서 최근 추천순 10권 */}
        <View style={styles.genreSection}>
          <Text style={[styles.sectionTitle, styles.sectionTitleTight]}>
            <Text style={styles.genreHighlight}>사서</Text>가 추천한 책
          </Text>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>국립중앙도서관 사서 추천 · 최근 추천순</Text>
          </View>
          {librarianBooks.length > 0 ? (
            <BookRow books={librarianBooks} />
          ) : (
            <Text style={styles.rowEmpty}>추천할 책을 불러오지 못했어요.</Text>
          )}
        </View>

        {/* 3. 또래가 읽고 있는 책: 같은 연령대 사용자 책장 기준 (부족하면 전체 사용자 인기 책) */}
        {peerBooks.length > 0 && (
          <View style={styles.genreSection}>
            <Text style={styles.sectionTitle}>
              {peerAgeGroup != null ? (
                <>
                  <Text style={styles.genreHighlight}>{peerAgeGroup}대</Text> 북루틴 사용자들이 읽고 있어요
                </>
              ) : (
                <>
                  <Text style={styles.genreHighlight}>북루틴</Text> 사용자들이 많이 읽는 책
                </>
              )}
            </Text>
            <BookRow books={peerBooks} />
          </View>
        )}

        {/* 4. 나만을 위한 추천: 장르유사도/난이도매칭/완독패턴 가중합 */}
        <View style={styles.genreSection}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.genreHighlight}>{nickname || "회원"}</Text>님만을 위한 책을 추천해드려요
          </Text>
          {recommendedBooks.length > 0 ? (
            <BookRow books={recommendedBooks} />
          ) : (
            <Text style={styles.rowEmpty}>아직 추천할 책이 없어요.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: -0.5,
    color: "#000",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  // 사서 추천 칩이 붙을 때는 제목 아래 여백을 줄임
  sectionTitleTight: {
    marginBottom: 6,
  },
  // 장르 추천 출처 표시 (작게)
  sourceBadge: {
    alignSelf: "flex-start",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F2F4F7",
  },
  sourceBadgeText: {
    fontSize: 11,
    color: "#667085",
    fontWeight: "600",
  },
  // 💡 홈화면 피드/체크리스트 카드 구조를 이식한 AI 요약 블록 스타일
  aiSection: {
    marginTop: 16,
  },
  aiScrollPadding: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6, // 그림자 잘림 방지
  },
  aiCard: {
    padding: 20,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border || "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardSingle: {
    marginHorizontal: 16,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiBadgeText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "700",
  },
  aiSummaryText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#333",
    fontWeight: "500",
  },
  insightList: {
    marginTop: 10,
    gap: 4,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#555",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#999",
  },
  aiDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },
  aiBookTarget: {
    fontSize: 13,
    color: "#666",
  },
  boldText: {
    fontWeight: "700",
    color: "#000",
  },
  // 💡 홈화면 BookCarousel 규격을 참고한 디자인 구조
  genreSection: {
    marginTop: 28,
  },
  genreHighlight: {
    color: Colors.textSecondary || "#4A90E2",
  },
  rowEmpty: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#999",
  },
});