import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FreedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import Header from "@/components/Header";
import { useRouter } from "expo-router";




const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(today.getDate() + 2);

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

const MOCK_TASKS: Task[] = [
  {
    id: "t1",
    text: "데미안 25 ~ 35 쪽 읽기",
    done: false,
    dueDate: today.toISOString(),
  },
  {
    id: "t2",
    text: "데미안 35 ~ 45 쪽 읽기",
    done: false,
    dueDate: tomorrow.toISOString(),
  },
  {
    id: "t3",
    text: "데미안 45 ~ 48 쪽 읽기",
    done: false,
    dueDate: dayAfter.toISOString(),
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
  const router = useRouter();

  return (
    <>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/goals")}>
          <BookCarousel books={MOCK_BOOKS} />
        </Pressable>

        <GoalSection
          goal="데미안 읽기"
          tasks={MOCK_TASKS}
          onGoalEdit={() => console.log("목표 수정")}
          onTaskEdit={(id) => console.log("할일 수정:", id)}
        />

        <View style={styles.feedSection}>
          {MOCK_FEED.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push("/thread")}
            >
              <FeedCard item={item} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  feedSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});