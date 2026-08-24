import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { authFetch, BASE_URL } from "@/constants/api";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import Header from "../../components/Header";
import { styles } from "../styles/home.styles";

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
  created_at?: string;
};

function toTask(item: ChecklistItem): Task {
  return {
    id: item.checklist_id,
    text: item.goal_content,
    done: item.check_box,
    dueDate: item.date,
  };
}

const MOCK_FEED: FeedItem[] = [{
  id: "f1", 
  bookTitle: "데미안", 
  username: "hongildong1", 
  avatarEmoji: "🦊",
  date: "2026-04-30", 
  content: '"내 속에서 솟아 나오려는 것, 바로 그것을 나는 살아보려 했다. 왜 그것이 그토록 어려웠을까." 서문의 이 첫 문장이 책의 전세 내용을 얘기하고 있는 것 같아 읽자마자 집중할 수 있었다.'
}];

export default function HomeScreen() {
  const router = useRouter();
  const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchUpcoming();
    }, [])
  );

  async function fetchUpcoming() {
    try {
      const res = await authFetch(`${BASE_URL}/checklists/upcoming`);
      const data: BookGroup[] = await res.json();
      
      if (Array.isArray(data)) {
        const sortedData = [...data].reverse(); 
        setBookGroups(sortedData);
      } else {
        setBookGroups([]);
      }
    } catch (e) {
      console.error("체크리스트 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleToggle = async (bookId: string, taskId: string) => {
    setBookGroups((prev) =>
      prev.map((group) => {
        if (group.book_id !== bookId) return group;
        return {
          ...group,
          tasks: group.tasks.map((task) =>
            task.checklist_id === taskId
              ? { ...task, check_box: !task.check_box }
              : task
          ),
        };
      })
    );

    try {
      const res = await authFetch(`${BASE_URL}/checklists/${taskId}/check`, {
        method: "PATCH",
      });

      if (!res.ok) {
        fetchUpcoming();
      }
    } catch (e) {
      console.error("체크 상태 변경 실패:", e);
      fetchUpcoming();
    }
  };

  // 💡 캐러셀 데이터 목록 맨 마지막에 '책 등록하기' 빈 슬롯 아이템을 추가합니다!
  const booksForCarousel: Book[] = [
    ...bookGroups.map((group) => ({
      id: group.book_id,
      title: group.book_title,
      author: "",
      subtitle: "",
      coverUrl: group.cover_url,
      currentPage: 24,
      totalPages: 48,
    })),
    {
      id: "empty-slot",
      title: "책 등록하기",
      author: "",
      subtitle: "",
      coverUrl: null,
      currentPage: 0,
      totalPages: 0,
    }
  ];

  // 마지막 인덱스(책 등록하기 카드)에 도달했는지 여부
  const isLastEmptyPage = bookGroups.length === 0 || currentIndex === booksForCarousel.length - 1;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  const activeGroup = bookGroups[currentIndex];

  return (
    <>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 📚 캐러셀은 항상 위에 떠서 좌우 화살표로 책과 '책 등록하기' 카드를 순환합니다 */}
        <View style={styles.carouselContainer}>
          <BookCarousel 
            books={booksForCarousel} 
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onPress={() => {
              if (isLastEmptyPage) {
                router.push("/reading-goals/book-select");
              }
            }} 
          />
        </View>

        {/* 📚 [디자인 1] 마지막 '책 등록하기' 카드를 보고 있거나 등록된 책이 아예 없을 때 */}
        {isLastEmptyPage ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>아직 등록된 책이 없어요</Text>
            <Text style={styles.emptySubText}>책을 등록하고 독서 목표를 시작해보세요 :)</Text>

            <Pressable 
              style={[
                styles.registerButton, 
                { 
                  width: "75%", 
                  minWidth: 240, 
                  alignSelf: "center", 
                  paddingVertical: 14,
                  alignItems: "center",   
                  justifyContent: "center" 
                }
              ]} 
              onPress={() => router.push("/reading-goals/book-select")}
            >
              <Text style={[styles.registerButtonText, { textAlign: "center" }]}>+ 책 등록하기</Text>
            </Pressable>

            <View style={styles.guideBox}>
              <Text style={styles.guideTitle}>책을 등록하면</Text>
              <View style={styles.guideItem}><Text style={styles.guideIcon}>📝</Text><Text style={styles.guideText}>오늘의 독서 목표를 설정하고</Text></View>
              <View style={styles.guideItem}><Text style={styles.guideIcon}>📈</Text><Text style={styles.guideText}>독서 진행률을 한눈에 확인하고</Text></View>
              <View style={styles.guideItem}><Text style={styles.guideIcon}>🔖</Text><Text style={styles.guideText}>나만의 독서 기록을 남길 수 있어요</Text></View>
            </View>

            <View style={styles.quoteCard}>
              <View style={styles.avatarCircle}><Text style={styles.avatarEmoji}>🦊</Text></View>
              <View style={styles.quoteTextContainer}>
                <Text style={styles.quoteTitle}>“함께 읽고, 함께 성장해요”</Text>
                <Text style={styles.quoteSubText}>오늘도 한 페이지의 변화가{'\n'}내일의 나를 만들어갑니다.</Text>
              </View>
            </View>
          </View>
        ) : (
          // 📖 [디자인 2] 일반 책 카드를 보고 있을 때 (해당 책의 체크리스트 + 타래)
          <>
            {activeGroup && (
              <View key={activeGroup.book_id}>
                <GoalSection 
                  goal={activeGroup.book_title}
                  tasks={activeGroup.tasks.map(toTask)}
                  onGoalEdit={() => router.push("/reading-goals/book-select")}
                  onTaskToggle={(taskId) => handleToggle(activeGroup.book_id, taskId)}
                />
              </View>
            )}

            <Text style={styles.sectionTitle}>최근 타래</Text>
            {MOCK_FEED.map((item) => (
              <Pressable key={item.id} onPress={() => router.push("/thread")}>
                <FeedCard item={item} />
              </Pressable>
            ))}
          </>
        )}

      </ScrollView>
    </>
  );
}