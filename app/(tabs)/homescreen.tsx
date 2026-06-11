import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { Colors, FontSize, Spacing } from "@/constants/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Header from "../../components/Header";

const BASE_URL = "http://localhost:3000/api/v1";
const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ChecklistItem = {
  checklist_id: string;
  goal_content: string;
  check_box: boolean;
  date: string;
  book: { title: string };
};

type BookGroup = {
  book_id: string;
  book_title: string;
  cover_url: string | null;
  tasks: ChecklistItem[];
};

function toTask(item: ChecklistItem): Task {
  return {
    id: item.checklist_id,
    text: item.goal_content,
    done: item.check_box,
    dueDate: item.date,
  };
}

// 시연용 Mock 데이터 (현재 등록된 도서 정보)
const MOCK_BOOKS: Book[] = [{
  id: "1", title: "데미안", author: "Hermann Hesse", subtitle: "Emil Sinclair",
  coverUrl: null, currentPage: 24, totalPages: 48,
}];

const MOCK_FEED: FeedItem[] = [{
  id: "f1", bookTitle: "데미안", username: "hongildong1", avatarEmoji: "🦊",
  date: "2026-04-30", content: '"내 속에서 솟아 나오려는 것, 바로 그것을 나는 살아보려 했다."'
}];

export default function HomeScreen() {
  const router = useRouter();
  const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { fetchUpcoming(); }, []);

  async function fetchUpcoming() {
    try {
      const res = await fetch(`${BASE_URL}/checklists/upcoming?user_id=${USER_ID}`);
      const data: BookGroup[] = await res.json();
      setBookGroups(data);
    } catch (e) { 
      console.error("체크리스트 불러오기 실패:", e); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleToggle(bookId: string, taskId: string) {
    setBookGroups((prev) => prev.map((group) => group.book_id !== bookId ? group : {
      ...group, tasks: group.tasks.map((t) => t.checklist_id === taskId ? { ...t, check_box: !t.check_box } : t),
    }));
    try {
      await fetch(`${BASE_URL}/checklists/${taskId}/check`, { method: "PATCH" });
    } catch (e) {
      setBookGroups((prev) => prev.map((group) => group.book_id !== bookId ? group : {
        ...group, tasks: group.tasks.map((t) => t.checklist_id === taskId ? { ...t, check_box: !t.check_box } : t),
      }));
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 1. 상단 책 캐러셀 섹션 (등록된 책 카드들과 빈 추가 카드가 함께 스와이프됨) */}
        <View style={styles.carouselContainer}>
          <BookCarousel
            books={MOCK_BOOKS}
            onPress={() => router.push("/goals")}
          />
        </View>

        {/* 2. 하단 오늘 해야 할 독서 목표 태스크 섹션 */}
        {bookGroups.length === 0 ? (
          <Pressable style={styles.emptyBox} onPress={() => router.push("/goals")}>
            <Text style={styles.emptyText}>목표를 설정해보세요</Text>
          </Pressable>
        ) : (
          <View>
            <FlatList
              data={bookGroups} 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.book_id} 
              scrollEventThrottle={16}
              onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              renderItem={({ item: group }) => (
                <View style={{ width: SCREEN_WIDTH }}>
                  <GoalSection
                    goal={group.book_title}
                    tasks={group.tasks.map(toTask)}
                    onGoalEdit={() => router.push("/goals")}
                    onTaskToggle={(taskId) => handleToggle(group.book_id, taskId)}
                  />
                </View>
              )}
            />
            {bookGroups.length > 1 && (
              <View style={styles.dotRow}>
                {bookGroups.map((_, i) => <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />)}
              </View>
            )}
          </View>
        )}

        {/* 3. 최근 타래 피드 섹션 */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>최근 타래</Text>
          {MOCK_FEED.length > 0 ? (
            MOCK_FEED.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push("/thread")}
              >
                <FeedCard item={item} />
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>등록된 타래가 없습니다.</Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 24 },
  carouselContainer: { marginVertical: 12 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "bold", paddingHorizontal: 16, marginTop: 20 },
  feedSection: { paddingHorizontal: 16, paddingTop: 4 },
  emptyBox: { marginHorizontal: Spacing.lg, marginVertical: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 12, borderStyle: 'dashed' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary },
  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.textSecondary },
});