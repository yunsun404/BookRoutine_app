import { Colors, FontSize, Spacing } from "@/components/constants/tokens";
import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FreedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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

const MOCK_BOOKS: Book[] = [
  {
    id: "1",
    title: "데미안",
    author: "Hermann Hesse",
    subtitle: "Emil Sinclair",
    coverUrl: null,
    currentPage: 24,
    totalPages: 48,
  },
];

const MOCK_FEED: FeedItem[] = [
  {
    id: "f1",
    bookTitle: "데미안",
    username: "hongildong1",
    avatarEmoji: "🦊",
    date: "2026-04-30",
    content:
      '"내 속에서 솟아 나오려는 것, 바로 그것을 나는 살아보려 했다. 왜 그것이 그토록 어려웠을까." 서문의 이 첫 문장이 책의 전체 내용을 얘기하고 있는 것 같아 읽자마자 집중할 수 있었다.',
  },
];

export default function HomeScreen() {
  const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  async function fetchUpcoming() {
    try {
      const res = await fetch(
        `${BASE_URL}/checklists/upcoming?user_id=${USER_ID}`,
      );
      const data: BookGroup[] = await res.json();
      setBookGroups(data);
    } catch (e) {
      console.error("체크리스트 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  // 낙관적 업데이트 — 특정 책 그룹의 특정 태스크 토글
  async function handleToggle(bookId: string, taskId: string) {
    setBookGroups((prev) =>
      prev.map((group) =>
        group.book_id !== bookId
          ? group
          : {
              ...group,
              tasks: group.tasks.map((t) =>
                t.checklist_id === taskId
                  ? { ...t, check_box: !t.check_box }
                  : t,
              ),
            },
      ),
    );

    try {
      await fetch(`${BASE_URL}/checklists/${taskId}/check`, {
        method: "PATCH",
      });
    } catch (e) {
      // 실패 시 원상복구
      setBookGroups((prev) =>
        prev.map((group) =>
          group.book_id !== bookId
            ? group
            : {
                ...group,
                tasks: group.tasks.map((t) =>
                  t.checklist_id === taskId
                    ? { ...t, check_box: !t.check_box }
                    : t,
                ),
              },
        ),
      );
      console.error("체크 업데이트 실패:", e);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BookCarousel books={MOCK_BOOKS} />

        {bookGroups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>진행 중인 목표가 없어요</Text>
          </View>
        ) : (
          <View>
            {/* 책별 스와이프 */}
            <FlatList
              data={bookGroups}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.book_id}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onScroll={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActiveIndex(index);
              }}
              renderItem={({ item: group }) => (
                <View style={{ width: SCREEN_WIDTH }}>
                  <GoalSection
                    goal={group.book_title}
                    tasks={group.tasks.map(toTask)}
                    onGoalEdit={() => console.log("목표 수정")}
                    onTaskToggle={(taskId) =>
                      handleToggle(group.book_id, taskId)
                    }
                  />
                </View>
              )}
            />

            {/* 페이지 인디케이터 — 몇 번째 책인지 점으로 표시 */}
            {bookGroups.length > 1 && (
              <View style={styles.dotRow}>
                {bookGroups.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.feedSection}>
          {MOCK_FEED.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  feedSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyBox: {
    marginHorizontal: Spacing.lg,
    marginVertical: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.textSecondary,
  },
});
