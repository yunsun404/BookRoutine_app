import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Header from "../../components/Header";
// ⭕ 정해진 lib/api 경로에서 userApi와 함께 그룹/독서방/추천 관련 API 객체도 가져옵니다.
import { Colors } from "@/constants/tokens";
import { bookApi, userApi } from "../../lib/api";
// ⭕ DB(ai_thread_summaries)에 저장된 AI 요약 조회
import { aiSummaryApi, BookAiSummary } from "../../lib/aiSummaryApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AI_CARD_WIDTH = SCREEN_WIDTH - 48; // 옆 카드가 살짝 보이도록

// 도서 인터페이스 정의 (홈화면 스타일 규격 맞춤)
interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl: string | null;
  genre?: string;
}

// AI 요약 데이터 타입 정의
interface AiSummaryData {
  bookTitle: string;
  summary: string;
  reason?: string;
}

/** key_insights(Json)가 문자열 배열이면 최대 3개만 뽑아서 사용 */
function toInsights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, 3);
}

export default function RecommendScreen() {
  const [loading, setLoading] = useState(true);
  const [favoriteGenre, setFavoriteGenre] = useState<string>("판타지");

  // ⭕ DB에 저장된 AI 요약 — 마지막으로 요약된 책 5개 (책마다 1개, 오래된 순)
  const [aiSummaries, setAiSummaries] = useState<BookAiSummary[]>([]);

  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);

  useEffect(() => {
    async function initRecommendData() {
      try {
        setLoading(true);

        // 1. 사용자 선호 장르 데이터 호출
        const me = await userApi.getMe();
        if (me && me.favorite_genre) {
          const genreText = typeof me.favorite_genre === 'string'
            ? me.favorite_genre
            : JSON.stringify(me.favorite_genre);
          setFavoriteGenre(genreText.replace(/"/g, '')); // 따옴표 제거 가공
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
              id: r.book_id,
              title: r.title,
              author: r.author ?? undefined,
              coverUrl: r.cover_url,
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

        {/* 2. 하단 섹션: 홈화면 BookCarousel 스타일을 오마주한 가로 스크롤 추천 리스트 */}
        <View style={styles.genreSection}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>이런 <Text style={styles.genreHighlight}>{favoriteGenre}</Text> 책은 어떤가요?</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookScrollPadding}
          >
            {recommendedBooks.map((book) => (
              <Pressable key={book.id} style={styles.bookCard}>
                <View style={styles.coverWrapper}>
                  {book.coverUrl ? (
                    <Image source={{ uri: book.coverUrl }} style={styles.coverImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderText}>BOOK</Text>
                    </View>
                  )}
                </View>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
                  {book.author && <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>}
                </View>
              </Pressable>
            ))}
          </ScrollView>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreHighlight: {
    color: Colors.textSecondary || "#4A90E2",
  },
  bookScrollPadding: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  bookCard: {
    width: 114,
    marginRight: 16,
  },
  coverWrapper: {
    width: 114,
    height: 165,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
  },
  placeholderText: {
    color: "#BDBDBD",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bookInfo: {
    paddingHorizontal: 2,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 11,
    color: "#777",
  },
});