import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { authFetch, BASE_URL } from "@/constants/api";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

type ThreadResponse = {
  id?: string;
  thread_id?: string;
  content: string;
  created_at: string;
  user?: {
    username?: string;
    avatarEmoji?: string;
  };
};

function toTask(item: ChecklistItem): Task {
  return {
    id: item.checklist_id,
    text: item.goal_content,
    done: item.check_box,
    dueDate: item.date,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [latestFeed, setLatestFeed] = useState<FeedItem | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);

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

  const activeGroup = bookGroups[currentIndex];

  useEffect(() => {
    if (!activeGroup) {
      setLatestFeed(null);
      return;
    }

    async function fetchThreadsForBook() {
      setFeedLoading(true);
      try {
        const res = await authFetch(`${BASE_URL}/threads?book_id=${activeGroup.book_id}`);
        const data: ThreadResponse[] = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const sortedThreads = [...data].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const newest = sortedThreads[0];

          setLatestFeed({
            id: newest.id || newest.thread_id || "thread-1",
            bookTitle: activeGroup.book_title,
            username: newest.user?.username || "독서메이트",
            avatarEmoji: newest.user?.avatarEmoji || "📖",
            date: newest.created_at ? newest.created_at.split("T")[0] : "",
            content: newest.content,
          });
        } else {
          setLatestFeed(null);
        }
      } catch (e) {
        console.error("책별 타래 불러오기 실패:", e);
        setLatestFeed(null);
      } finally {
        setFeedLoading(false);
      }
    }

    fetchThreadsForBook();
  }, [activeGroup]);

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

  const booksForCarousel: Book[] = [
    ...bookGroups.map((group) => {
      let totalMaxPage = 0; // 책의 전체 쪽수 (모든 태스크 중 가장 마지막 끝 페이지 번호)
      let currentMaxPage = 0; // 현재 읽은 쪽수 (체크된 항목들의 끝 페이지 중 가장 큰 값)
      let firstUncheckedStartPage = -1; // 체크되지 않은 첫 번째 항목의 시작 페이지

      if (group.tasks && group.tasks.length > 0) {
        // 1. 전체 쪽수 구하기 (마지막 체크리스트의 끝 페이지)
        const lastTask = group.tasks[group.tasks.length - 1];
        const lastMatch = lastTask.goal_content.match(/~(\s*[\d,]+)/);
        if (lastMatch) {
          const pageNum = parseInt(lastMatch[1].replace(/,/g, ""), 10);
          if (!isNaN(pageNum)) {
            totalMaxPage = pageNum;
          }
        }

        // 2. 체크된 항목들의 최대 끝 페이지 및 체크되지 않은 첫 항목의 시작 페이지 찾기
        group.tasks.forEach((task) => {
          const rangeMatch = task.goal_content.match(/([\d,]+)\s*~\s*([\d,]+)/);
          if (rangeMatch) {
            const startNum = parseInt(rangeMatch[1].replace(/,/g, ""), 10);
            const endNum = parseInt(rangeMatch[2].replace(/,/g, ""), 10);

            if (!isNaN(endNum)) {
              if (task.check_box && endNum > currentMaxPage) {
                currentMaxPage = endNum;
              }
            }

            if (!task.check_box && firstUncheckedStartPage === -1) {
              if (!isNaN(startNum)) {
                firstUncheckedStartPage = startNum;
              }
            }
          }
        });

        // 만약 체크된 항목이 없고, 체크되지 않은 첫 번째 항목이 있다면 그 시작 페이지를 현재 페이지로 설정 (예: 92~105면 92)
        if (currentMaxPage === 0 && firstUncheckedStartPage !== -1) {
          currentMaxPage = firstUncheckedStartPage;
        }
      }

      return {
        id: group.book_id,
        title: group.book_title,
        author: "",
        subtitle: "",
        coverUrl: group.cover_url,
        currentPage: currentMaxPage,
        totalPages: totalMaxPage > 0 ? totalMaxPage : 100,
      };
    }),
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

  const isLastEmptyPage = bookGroups.length === 0 || currentIndex === booksForCarousel.length - 1;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
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
            {feedLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : latestFeed ? (
              <Pressable 
                onPress={() => {
                  router.push({
                    pathname: "/thread",
                    params: { bookId: activeGroup.book_id, bookTitle: activeGroup.book_title }
                  });
                }}
              >
                <FeedCard item={latestFeed} />
              </Pressable>
            ) : (
              <Pressable 
                onPress={() => {
                  router.push({
                    pathname: "/thread",
                    params: { bookId: activeGroup.book_id, bookTitle: activeGroup.book_title }
                  });
                }}
              >
                <View style={{
                  backgroundColor: "#d0d0dc",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginVertical: 4,
                  borderWidth: 1,
                  borderColor: "#bcbcc8",
                  borderStyle: "dashed",
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 20 }}>✏️</Text>
                  <Text style={{ color: "#333333", fontSize: 15, fontWeight: "600" }}>
                    이 책의 첫 번째 타래를 남겨보세요
                  </Text>
                  <Text style={{ color: "#666666", fontSize: 13, textAlign: "center" }}>
                    터치해서 '{activeGroup.book_title}' 타래 쓰러 가기 &gt;
                  </Text>
                </View>
              </Pressable>
            )}
          </>
        )}

      </ScrollView>
    </>
  );
}