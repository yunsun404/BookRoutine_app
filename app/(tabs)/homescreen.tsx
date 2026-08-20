import BookCarousel, { type Book } from "@/components/home/BookCarousel";
import FeedCard, { type FeedItem } from "@/components/home/FeedCard";
import GoalSection, { type Task } from "@/components/home/GoalSection";
import { authFetch, BASE_URL } from "@/constants/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
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

  useEffect(() => { fetchUpcoming(); }, []);

  async function fetchUpcoming() {
    try {
      const res = await authFetch(`${BASE_URL}/checklists/upcoming`);
      const data: BookGroup[] = await res.json();
      setBookGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("체크리스트 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }

  // 임시 handleToggle 함수
  const handleToggle = (bookId: string, taskId: string) => {
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
  };

  const booksForCarousel: Book[] = bookGroups.map((group) => ({
    id: group.book_id,
    title: group.book_title,
    author: "",
    subtitle: "",
    coverUrl: group.cover_url,
    currentPage: 24,
    totalPages: 48,
  }));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      <Header />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 📚 책 등록 여부에 따른 분기 처리 */}
        {bookGroups.length === 0 ? (
          // [디자인 1] 등록된 책이 없을 때
          <View style={styles.emptyContainer}>
            {/* 동그라미 배경 제거를 위해 backgroundColor 및 borderRadius를 transparent/0 으로 재정의 */}
            <View style={[styles.emptyCarouselBox, { backgroundColor: "transparent", borderRadius: 0 }]}>
              <View style={styles.arrowButton}><Text style={styles.arrowText}>{"<"}</Text></View>
              
              <View style={[styles.illustrationPlaceholder, { backgroundColor: "transparent", borderRadius: 0 }]}>
                <Image 
                  source={require("@/assets/images/empty_book.png")} 
                  style={{ width: 180, height: 180, resizeMode: "contain" }} 
                />
              </View>

              <View style={styles.arrowButton}><Text style={styles.arrowText}>{">"}</Text></View>
            </View>

            <Text style={styles.emptyTitle}>아직 등록된 책이 없어요</Text>
            <Text style={styles.emptySubText}>책을 등록하고 독서 목표를 시작해보세요 :)</Text>

           {/* 버튼 너비 확장 및 텍스트 정중앙 정렬 */}
            <Pressable 
              style={[
                styles.registerButton, 
                { 
                  width: "75%", 
                  minWidth: 240, 
                  alignSelf: "center", 
                  paddingVertical: 14,
                  alignItems: "center",    // 가로 중앙 정렬
                  justifyContent: "center" // 세로 중앙 정렬
                }
              ]} 
              onPress={() => router.push("/goals")}
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
          // [디자인 2] 등록된 책이 있을 때 (캐러셀, 목표/체크리스트, 피드)
          <>
            <View style={styles.carouselContainer}>
              <BookCarousel books={booksForCarousel} onPress={() => router.push("/goals")} />
            </View>

            {/* 목표 및 체크리스트 섹션 */}
            {bookGroups.map((group) => (
              <View key={group.book_id}>
                <GoalSection 
                  goal={group.book_title}
                  tasks={group.tasks.map(toTask)}
                  onGoalEdit={() => router.push("/goals")}
                  onTaskToggle={(taskId) => handleToggle(group.book_id, taskId)}
                />
              </View>
            ))}

            {/* 최근 타래 섹션 */}
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