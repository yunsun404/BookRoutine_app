import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Header from "../../components/Header";
import { colors, styles } from "../styles/home.styles";

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
        // 모든 체크리스트가 완료된 책은 제외
        const activeBooks = data.filter((group) => {
          if (!group.tasks || group.tasks.length === 0) return true;
          const allCompleted = group.tasks.every((task) => task.check_box);
          return !allCompleted;
        });

        const sortedData = [...activeBooks].reverse();
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

  // 체크 표시를 먼저 보여준 뒤 0.3초 후 목록에서 제거
  const handleToggle = async (bookId: string, taskId: string) => {
    setBookGroups((prev) =>
      prev.map((group) => {
        if (group.book_id !== bookId) return group;
        return {
          ...group,
          tasks: group.tasks.map((task) =>
            task.checklist_id === taskId ? { ...task, check_box: true } : task
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
        return;
      }

      setTimeout(() => {
        setBookGroups((prev) =>
          prev
            .map((group) => {
              if (group.book_id !== bookId) return group;
              return {
                ...group,
                tasks: group.tasks.filter((task) => task.checklist_id !== taskId),
              };
            })
            .filter((group) => group.tasks.length > 0)
        );
      }, 300);
    } catch (e) {
      console.error("체크 상태 변경 실패:", e);
      fetchUpcoming();
    }
  };

  const booksForCarousel: Book[] = [
    ...bookGroups.map((group) => {
      let totalMaxPage = 0; // 전체 쪽수 (마지막 태스크의 끝 페이지)
      let currentMaxPage = 0; // 현재 읽은 쪽수 (체크된 항목 중 가장 큰 끝 페이지)
      let firstUncheckedStartPage = -1; // 체크 안 된 첫 항목의 시작 페이지

      if (group.tasks && group.tasks.length > 0) {
        const lastTask = group.tasks[group.tasks.length - 1];
        const lastMatch = lastTask.goal_content.match(/~(\s*[\d,]+)/);
        if (lastMatch) {
          const pageNum = parseInt(lastMatch[1].replace(/,/g, ""), 10);
          if (!isNaN(pageNum)) totalMaxPage = pageNum;
        }

        group.tasks.forEach((task) => {
          const rangeMatch = task.goal_content.match(/([\d,]+)\s*~\s*([\d,]+)/);
          if (rangeMatch) {
            const startNum = parseInt(rangeMatch[1].replace(/,/g, ""), 10);
            const endNum = parseInt(rangeMatch[2].replace(/,/g, ""), 10);

            if (!isNaN(endNum) && task.check_box && endNum > currentMaxPage) {
              currentMaxPage = endNum;
            }
            if (!task.check_box && firstUncheckedStartPage === -1 && !isNaN(startNum)) {
              firstUncheckedStartPage = startNum;
            }
          }
        });

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
    },
  ];

  const isLastEmptyPage = bookGroups.length === 0 || currentIndex === booksForCarousel.length - 1;

  const goThread = () =>
    router.push({
      pathname: "/thread",
      params: { bookId: activeGroup.book_id, bookTitle: activeGroup.book_title },
    });

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사 문구 */}
        <View style={styles.greeting}>
          <Text style={styles.greetingSub}>오늘도,</Text>
          <Text style={styles.greetingTitle}>좋은 책과 함께해요</Text>
        </View>

        <View style={styles.carouselContainer}>
                  {bookGroups.length > 0 && (
          <View style={styles.carouselContainer}>
            <BookCarousel
              books={booksForCarousel}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              onPress={() => {
                if (isLastEmptyPage) {
                  router.push("/reading-goals/book-select");
                } else {
                  router.push({
                    pathname: "/book-detail",
                    params: { book_id: activeGroup.book_id },
                  });
                }
              }}
            />
          </View>
        )}
        </View>

        {isLastEmptyPage ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>아직 등록된 책이 없어요</Text>
            <Text style={styles.emptySubText}>책을 등록하고 독서 목표를 시작해보세요</Text>

            <Pressable
              style={({ pressed }) => [styles.registerButton, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/reading-goals/book-select")}
            >
              <View style={styles.registerButtonInner}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.registerButtonText}>책 등록하기</Text>
              </View>
            </Pressable>

            <View style={styles.guideBox}>
              <Text style={styles.guideTitle}>책을 등록하면</Text>
              <View style={styles.guideItem}>
                <View style={styles.guideIconWrap}>
                  <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
                </View>
                <Text style={styles.guideText}>오늘의 독서 목표를 설정하고</Text>
              </View>
              <View style={styles.guideItem}>
                <View style={styles.guideIconWrap}>
                  <Ionicons name="trending-up" size={16} color={colors.primary} />
                </View>
                <Text style={styles.guideText}>독서 진행률을 한눈에 확인하고</Text>
              </View>
              <View style={styles.guideItem}>
                <View style={styles.guideIconWrap}>
                  <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                </View>
                <Text style={styles.guideText}>나만의 독서 기록을 남길 수 있어요</Text>
              </View>
            </View>

            <View style={styles.quoteCard}>
              <View style={styles.quoteBar} />
              <View style={styles.quoteTextContainer}>
                <Text style={styles.quoteTitle}>함께 읽고, 함께 성장해요</Text>
                <Text style={styles.quoteSubText}>
                  오늘의 한 페이지가{"\n"}내일의 나를 만들어갑니다.
                </Text>
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

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>최근 타래</Text>
              <Pressable onPress={goThread} hitSlop={8}>
                <Text style={styles.sectionLink}>전체 보기</Text>
              </Pressable>
            </View>

            {feedLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
            ) : latestFeed ? (
              <Pressable onPress={goThread}>
                <FeedCard item={latestFeed} />
              </Pressable>
            ) : (
              <Pressable
                onPress={goThread}
                style={({ pressed }) => [styles.feedEmpty, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.feedEmptyIcon}>
                  <Ionicons name="create-outline" size={22} color={colors.lavender} />
                </View>
                <Text style={styles.feedEmptyTitle}>이 책의 첫 번째 타래를 남겨보세요</Text>
                <Text style={styles.feedEmptySub}>
                  '{activeGroup.book_title}' 타래 쓰러 가기
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}