import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import ReadPagesModal from "@/components/home/ReadPagesModal";
import { authFetch, BASE_URL } from "@/constants/api";
import {
  bookProgress,
  buildServerProgress,
  type ServerProgress,
} from "@/lib/home/bookProgress";
import { findBookshelfId } from "@/lib/bookshelf/findBookshelfId";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import Header from "../../components/Header";
import { colors, styles } from "../styles/home.styles";

type ChecklistItem = {
  checklist_id: string;
  goal_id: string | null;
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

  // 책별 전체 쪽(목표)·서버 읽은 쪽(남은 칸에 쪽수가 없을 때만 씀) — lib/home/bookProgress.ts
  const [progressByBook, setProgressByBook] = useState<Record<string, ServerProgress>>({});

  useFocusEffect(
    useCallback(() => {
      fetchUpcoming();
      fetchProgress();
    }, [])
  );

  async function fetchProgress() {
    try {
      const [shelfRes, goalRes] = await Promise.all([
        authFetch(`${BASE_URL}/bookshelf`),
        authFetch(`${BASE_URL}/reading-goals`),
      ]);
      const shelves = shelfRes.ok ? await shelfRes.json() : null;
      const goals = goalRes.ok ? await goalRes.json() : null;
      setProgressByBook(buildServerProgress(shelves, goals));
    } catch (e) {
      // 실패하면 남은 체크리스트로 짐작한 값을 보여 줌
      console.error("읽은 쪽수 불러오기 실패:", e);
    }
  }

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

  // 책 목록이 줄어들면(완료 등) 범위를 벗어난 인덱스를 첫 번째 책으로 되돌림
  useEffect(() => {
    if (currentIndex > bookGroups.length) setCurrentIndex(0);
  }, [bookGroups.length]);

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
  // 체크리스트 "수정" → 오늘 읽은 쪽수 입력 팝업
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);

  const submitReadPages = async (readUntil: number): Promise<string | null> => {
    if (!editingTask) return null;
    try {
      const res = await authFetch(`${BASE_URL}/checklists/${editingTask.checklist_id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ read_until: readUntil }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.message ?? "저장하지 못했어요. 잠시 후 다시 시도해주세요.";
      }
      setEditingTask(null);
      fetchUpcoming();
      fetchProgress();
      return null;
    } catch (e) {
      console.error("읽은 쪽수 저장 실패:", e);
      return "서버에 연결할 수 없어요.";
    }
  };

  const handleToggle = async (bookId: string, taskId: string) => {
    // 체크 표시를 먼저 보여 줌 → 읽은 쪽·온도도 그 칸 끝 쪽까지 바로 오름 (bookProgress)
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
        // 거절 이유를 알려 줌 (예: 서버가 UTC 기준이라 한국 오전 0~9시에는 오늘 칸도 "아직 다가오지 않은 날짜"로 거절)
        const data = await res.json().catch(() => null);
        const message = Array.isArray(data?.message) ? data.message.join("\n") : data?.message;
        Alert.alert("체크하지 못했어요", message || "잠시 후 다시 시도해주세요.");
        fetchUpcoming();
        fetchProgress();
        return;
      }

      fetchProgress();
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
      Alert.alert("체크하지 못했어요", "서버에 연결할 수 없어요.");
      fetchUpcoming();
      fetchProgress();
    }
  };

  const booksForCarousel: Book[] = [
    ...bookGroups.map((group) => {
      // 읽은 쪽 = 다음에 읽을 칸의 시작 쪽 - 1, 전체 쪽 = 목표의 total_pages — lib/home/bookProgress.ts
      const { currentPage, totalPages } = bookProgress(group.tasks ?? [], progressByBook[group.book_id]);
      return {
        id: group.book_id,
        title: group.book_title,
        author: "",
        subtitle: "",
        coverUrl: group.cover_url,
        currentPage,
        totalPages,
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

  // 타래 버튼 → 내 책장의 그 책 화면(/book/{bookshelf_id})에서 타래 쓰기·AI 요약
  // 책장에서 못 찾거나 연결이 안 되면 기존 타래 화면(/thread)을 열 수 있게 물어봄 — lib/bookshelf/findBookshelfId.ts
  const [openingBook, setOpeningBook] = useState(false);

  const openOldThreadScreen = (bookId: string, bookTitle: string) =>
    router.push({ pathname: "/thread", params: { bookId, bookTitle } });

  const goThread = async () => {
    const group = activeGroup;
    if (!group || isLastEmptyPage || openingBook) return; // 읽는 책이 없거나 "책 등록하기" 칸이면 아무것도 안 함
    setOpeningBook(true);
    const result = await findBookshelfId(group.book_id, async (path) => {
      const res = await authFetch(`${BASE_URL}${path}`);
      if (!res.ok) throw new Error(`${path} ${res.status}`);
      return res.json();
    });
    setOpeningBook(false);

    if (result.ok) {
      router.push({ pathname: "/book/[bookshelf_id]", params: { bookshelf_id: result.bookshelfId } });
      return;
    }
    Alert.alert(
      result.reason === "network" ? "책장 정보를 불러오지 못했어요" : "내 책장에서 이 책을 찾지 못했어요",
      "기존 타래 화면에서 타래를 쓸 수 있어요.",
      [
        { text: "취소", style: "cancel" },
        { text: "타래 화면 열기", onPress: () => openOldThreadScreen(group.book_id, group.book_title) },
      ],
    );
  };

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

        {/* 책이 한 권도 없을 때만 안내 화면 */}
        {bookGroups.length === 0 ? (
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
        ) : isLastEmptyPage ? null : (
          <>
            {activeGroup && (
              <View key={activeGroup.book_id}>
                <GoalSection
                  goal={activeGroup.book_title}
                  tasks={activeGroup.tasks.map(toTask)}
                  onGoalEdit={() => {
                    const goalId = activeGroup.tasks.find((t) => t.goal_id)?.goal_id;
                    if (!goalId) return;
                    router.push({
                      pathname: "/reading-goals/reading-plan",
                      params: { goal_id: goalId },
                    });
                  }}
                  onTaskToggle={(taskId) => handleToggle(activeGroup.book_id, taskId)}
                  onTaskEdit={(taskId) =>
                    setEditingTask(activeGroup.tasks.find((t) => t.checklist_id === taskId) ?? null)
                  }
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

      <ReadPagesModal
        visible={!!editingTask}
        taskText={editingTask?.goal_content ?? ""}
        onClose={() => setEditingTask(null)}
        onSubmit={submitReadPages}
      />
    </View>
  );
}