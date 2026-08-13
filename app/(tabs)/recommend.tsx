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
// ⭕ 정해진 lib/api 경로에서 userApi와 함께 그룹/독서방 관련 API 객체도 가져옵니다.
import { Colors } from "@/constants/tokens";
import { groupApi, userApi } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function RecommendScreen() {
  const [loading, setLoading] = useState(true);
  const [favoriteGenre, setFavoriteGenre] = useState<string>("판타지");
  
  // ⭕ 사용자의 최신 독서 활동 기반 AI 요약 상태 관리
  const [aiRecommendation, setAiRecommendation] = useState<AiSummaryData>({
    bookTitle: "데미안",
    summary: "싱클레어의 어두운 세계와 밝은 세계 사이의 방황, 그리고 데미안이라는 수수께끼 같은 인물을 통해 진정한 '나'를 찾아가는 치열한 성장 기록입니다. 내면의 목소리에 귀를 기울이고 싶을 때 강력히 추천하는 작품입니다."
  });
  
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

        // 2. [AI 요약 매핑] 사용자의 가장 최신 그룹 스레드(타래)나 활동 로그를 기반으로 요약본 매칭
        // 내 그룹 리스트를 먼저 가져온 뒤, 최근 활성화된 그룹의 타래 요약본을 가져오는 로직을 연동합니다.
        const myGroups = await groupApi.getList();
        if (myGroups && myGroups.length > 0) {
          const latestGroupId = myGroups[0].group_id;
          const threads = await groupApi.getGroupThread(latestGroupId);
          
          if (threads && threads.length > 0) {
            // 가장 마지막(최신) 타래 데이터를 AI 요약본 영역에 매핑
            const latestThread = threads[threads.length - 1];
            setAiRecommendation({
              bookTitle: "참여 중인 도서 독서 요약",
              summary: latestThread.content || "최근 작성된 타래 피드가 비어있습니다."
            });
          }
        }

        // 3. 선호 장르 기반 추천 도서 목록 세팅 (홈화면 캐러셀 형태로 가공하기 위한 가상 데이터 포함)
        const mockBooks: Book[] = [
          { id: "1", title: "해리포터와 마법사의 돌", author: "J.K. 롤링", coverUrl: null }, 
          { id: "2", title: "해리 포터와 아즈카반의 죄수", author: "J.K. 롤링", coverUrl: null },
          { id: "3", title: "해리 포터와 비밀의 방", author: "J.K. 롤링", coverUrl: null },
          { id: "4", title: "반지의 제왕", author: "J.R.R. 톨킨", coverUrl: null },
          { id: "5", title: "어스시의 마법사", author: "어슐러 K. 르 귄", coverUrl: null },
        ];
        setRecommendedBooks(mockBooks);

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
        {/* 1. 상단 섹션: 홈화면의 카드 레이아웃 톤을 적용한 AI 요약 브리핑 */}
        <View style={styles.aiSection}>
          <Text style={styles.sectionTitle}>“지금 읽어보고 싶은 도서는?”</Text>
          
          <View style={styles.aiCard}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI 맞춤 분석</Text>
            </View>
            <Text style={styles.aiSummaryText} numberOfLines={6}>
              {aiRecommendation.summary}
            </Text>
            <View style={styles.aiDivider} />
            <Text style={styles.aiBookTarget}>
              🎯 대상 도서: <Text style={styles.boldText}>{aiRecommendation.bookTitle}</Text>
            </Text>
          </View>
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
  aiCard: {
    marginHorizontal: 16,
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