import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
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

/**
 * 선호 장르 파싱 — DB에는 { favorite_genre: ["판타지", "추리"] } 형태로 저장돼 있음
 * (예전 데이터 대비로 배열/문자열도 받아줌)
 */
function toGenres(value: unknown): string[] {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { favorite_genre?: unknown }).favorite_genre
      : value;
  if (Array.isArray(raw)) return raw.filter((g): g is string => typeof g === "string" && g.length > 0);
  if (typeof raw === "string" && raw) return [raw];
  return [];
}

/** key_insights(Json)가 문자열 배열이면 최대 3개만 뽑아서 사용 */
function toInsights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, 3);
}

export default function RecommendScreen() {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");

  // 선호 장르 (여러 개면 칩으로 골라서 봄)
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [genreBooks, setGenreBooks] = useState<RowBook[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // ⭕ DB에 저장된 AI 요약 — 마지막으로 요약된 책 5개 (책마다 1개, 오래된 순)
  const [aiSummaries, setAiSummaries] = useState<BookAiSummary[]>([]);

  // 나만을 위한 추천 (장르유사도/난이도매칭/완독패턴 가중합)
  const [recommendedBooks, setRecommendedBooks] = useState<RowBook[]>([]);

  useEffect(() => {
    async function initRecommendData() {
      try {
        setLoading(true);

        // 1. 사용자 닉네임 / 선호 장르
        const me = await userApi.getMe();
        if (me) {
          setNickname(me.nickname ?? "");
          const favorite = toGenres(me.favorite_genre);
          setGenres(favorite);
          setSelectedGenre(favorite[0] ?? "");
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

  // 장르 기반 추천 — 고른 장르의 알라딘 책 10권 (DB에 없는 책이라 isbn으로 책 소개를 연다)
  useEffect(() => {
    if (!selectedGenre) {
      setGenreBooks([]);
      return;
    }
    let cancelled = false;

    (async () => {
      setGenreLoading(true);
      try {
        const res = await bookApi.getGenreRecommendations(selectedGenre, 10);
        if (cancelled) return;
        setGenreBooks(
          res.items.map((b) => ({
            key: b.isbn,
            title: b.title,
            author: b.author,
            coverUrl: b.cover_url,
            onPress: () => router.push({ pathname: "/book-detail", params: { isbn: b.isbn } }),
          })),
        );
      } catch (e) {
        console.error("장르 추천 불러오기 실패:", e);
        if (!cancelled) setGenreBooks([]);
      } finally {
        if (!cancelled) setGenreLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGenre]);

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

        {/* 2. 장르 기반 추천: 선호 장르의 알라딘 책 10권 (선호 장르가 없으면 숨김) */}
        {genres.length > 0 && (
          <View style={styles.genreSection}>
            <Text style={styles.sectionTitle}>
              이런 <Text style={styles.genreHighlight}>{selectedGenre}</Text> 책은 어떤가요?
            </Text>

            {genres.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {genres.map((g) => {
                  const active = g === selectedGenre;
                  return (
                    <Pressable
                      key={g}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedGenre(g)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {genreLoading ? (
              <View style={styles.rowLoading}>
                <ActivityIndicator color={Colors.textSecondary || "#333"} />
              </View>
            ) : genreBooks.length > 0 ? (
              <BookRow books={genreBooks} />
            ) : (
              <Text style={styles.rowEmpty}>추천할 책을 불러오지 못했어요.</Text>
            )}
          </View>
        )}

        {/* 3. 나만을 위한 추천: 장르유사도/난이도매칭/완독패턴 가중합 */}
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
  // 선호 장르 칩 (장르가 여러 개일 때)
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border || "#E0E0E0",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#222",
    borderColor: "#222",
  },
  chipText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  rowLoading: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  rowEmpty: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#999",
  },
});