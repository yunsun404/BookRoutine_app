// [설명: 외부 컴포넌트 및 API 유틸리티 불러오기]
import Header from "@/components/Header";
import { authFetch, BASE_URL } from "@/constants/api";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

// [설명: 디자인 스타일 파일 불러오기]
import { styles } from "./styles/thread.styles";

// [설명: API 엔드포인트(URL) 상수 정의]
const THREADS_ENDPOINT = `${BASE_URL}/threads`;
const AI_SUMMARY_ENDPOINT = `${BASE_URL}/threads-ai/summary`;

// [설명: 고정된 유저 ID와 도서 ID 설정]
const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";
const BOOK_ID = "160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a";

// [설명: 타래 데이터의 구조(Type) 정의]
type Thread = {
  thread_id: string;
  user_id: string;
  book_id: string;
  group_id: string | null;
  content: string;
  current_page: number;
  is_public: boolean;
  likes: number;
  created_at: string;
  updated_at: string;
  isAiSummary?: boolean; // AI 요약 카드 구분을 위한 플래그
};

export default function ThreadScreen() {
  // [설명: 화면 상태(State) 관리 영역]
  const [threads, setThreads] = useState<Thread[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);

  // [설명: API 연동 - 도서별 타래 목록 조회 (GET)]
  const fetchThreads = async () => {
    try {
      const url = `${THREADS_ENDPOINT}?book_id=${BOOK_ID}`;
      const res = await authFetch(url);
      const data = await res.json();
      
      if (!res.ok) {
        console.log("타래 조회 실패:", data);
        return;
      }

      if (Array.isArray(data)) {
        setThreads(data);
      } else if (data && Array.isArray(data.threads)) {
        setThreads(data.threads);
      } else if (data && Array.isArray(data.data)) {
        setThreads(data.data);
      } else {
        setThreads([]);
      }
    } catch (error) {
      console.log("타래 조회 에러:", error);
    }
  };

  // [설명: 화면이 처음 켜질 때 타래 조회 함수 실행]
  useEffect(() => {
    fetchThreads();
  }, []);

  // [설명: API 연동 - 새로운 타래 등록 (POST)]
  const addThread = async () => {
    if (!content.trim()) {
      Alert.alert("알림", "내용을 입력해주세요.");
      return;
    }

    try {
      const res = await authFetch(THREADS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: BOOK_ID,
          group_id: null,
          content,
          current_page: Number(page),
          is_public: true,
        }),
      });

      if (!res.ok) {
        Alert.alert("오류", "타래 저장 실패");
        return;
      }

      await fetchThreads();
      setPage("");
      setContent("");
      setModalVisible(false);
      Alert.alert("성공", "타래가 저장되었습니다.");
    } catch (error) {
      console.log("타래 저장 에러:", error);
      Alert.alert("오류", "서버 연결 실패");
    }
  };

  // [설명: 수정 모드 진입]
  const startEditThread = (item: Thread) => {
    setEditingThreadId(item.thread_id);
    setPage(String(item.current_page));
    setContent(item.content);
    setModalVisible(true);
  };

  // [설명: API 연동 - 기존 타래 수정 (PATCH)]
  const updateThread = async () => {
    if (!editingThreadId) return;

    try {
      const res = await authFetch(`${THREADS_ENDPOINT}/${editingThreadId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content,
          current_page: Number(page),
        }),
      });

      if (!res.ok) {
        Alert.alert("오류", "타래 수정 실패");
        return;
      }

      await fetchThreads();
      setEditingThreadId(null);
      setPage("");
      setContent("");
      setModalVisible(false);
      Alert.alert("성공", "타래가 수정되었습니다.");
    } catch (error) {
      console.log(error);
      Alert.alert("오류", "서버 연결 실패");
    }
  };

  // [설명: API 연동 - 선택한 타래 삭제 (DELETE)]
  const deleteThread = async (threadId: string) => {
    Alert.alert("삭제 확인", "이 타래를 삭제하시겠습니까?", [
      { text: "취소" },
      {
        text: "삭제",
        onPress: async () => {
          try {
            const res = await authFetch(`${THREADS_ENDPOINT}/${threadId}`, {
              method: "DELETE",
            });

            if (!res.ok) {
              Alert.alert("오류", "타래 삭제 실패");
              return;
            }
            await fetchThreads();
            Alert.alert("성공", "타래가 삭제되었습니다.");
          } catch (error) {
            console.log(error);
            Alert.alert("오류", "서버 연결 실패");
          }
        },
      },
    ]);
  };

  // [설명: API 연동 - AI 요약 요청 (POST) 및 맨 위에 새 카드 추가]
  const addSummary = async () => {
    try {
      const res = await authFetch(AI_SUMMARY_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ book_id: BOOK_ID }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert("오류", "AI 요약 실패");
        return;
      }

      // 새로운 AI 요약 타래 객체 생성 (일반 타래와 구별하기 위해 isAiSummary: true 설정)
      const aiSummaryThread: Thread = {
        thread_id: `ai-summary-${Date.now()}`,
        user_id: USER_ID,
        book_id: BOOK_ID,
        group_id: null,
        content: `✨ [AI 핵심 요약]\n${data.summary}`,
        current_page: 0,
        is_public: true,
        likes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isAiSummary: true, // 색상 분기용 플래그
      };

      // 기존 타래 리스트의 맨 앞에 추가
      setThreads((prevThreads) => [aiSummaryThread, ...prevThreads]);
      Alert.alert("성공", "AI 요약 타래가 맨 위에 생성되었습니다!");
    } catch (error) {
      console.log(error);
      Alert.alert("오류", "AI 서버 연결 실패");
    }
  };

  // [설명: 화면 레이아웃(UI) 및 이벤트 연결 영역]
  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>“ 데미안 ”</Text>

      {/* [설명: 상단 탭 버튼 영역 (타래 등록 / 문장 수집)] */}
      <View style={styles.tabContainer}>
        <Pressable style={styles.activeTabButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.activeTabText}>타래 등록</Text>
        </Pressable>
        <Pressable style={styles.tabButton}>
          <Text style={styles.tabText}>문장 수집</Text>
        </Pressable>
      </View>
{/* [설명: 타임라인 및 스크롤 영역 (초록색 선, 동그라미 적용)] */}
   <ScrollView contentContainerStyle={styles.timelineContainer}>
        {threads.length === 0 ? (
          <Text style={styles.emptyText}>아직 등록된 타래가 없습니다.</Text>
        ) : (
          threads.map((item, index) => {
            const isLast = index === threads.length - 1;

            return (
              <View key={item.thread_id} style={styles.timelineWrapper}>
                {/* 마지막 타래만 세로선이 짧게 끝나고, 나머지는 아래로 계속 이어짐 */}
                <View style={isLast ? styles.lastItemLine : styles.itemLine} />
                <View style={styles.dot} />
                {/* 마지막 타래만 꺾인 선, 나머지는 일반 가로선 */}
               <View style={styles.connectorLine} />
                
                <View 
                  style={[
                    styles.card, 
                    item.isAiSummary && { backgroundColor: "#F3EBF6", borderColor: "#D1C4E9" }
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.page}>{item.isAiSummary ? "✨ 요약" : `${item.current_page} pg`}</Text>
                    <Text style={styles.date}>{item.created_at?.slice(0, 10)}</Text>
                  </View>
                  <Text style={styles.content}>{item.content}</Text>
                  
                  {!item.isAiSummary && (
                    <View style={styles.cardButtons}>
                      <Pressable style={styles.smallButton} onPress={() => startEditThread(item)}>
                        <Text style={styles.smallButtonText}>수정</Text>
                      </Pressable>
                      <Pressable style={styles.smallButton} onPress={() => deleteThread(item.thread_id)}>
                        <Text style={styles.smallButtonText}>삭제</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* [설명: AI 요약하기 버튼을 하단에 고정 배치] */}
      <Pressable style={styles.aiButtonFixed} onPress={addSummary}>
        <Text style={styles.aiButtonText}>AI 요약하기</Text>
      </Pressable>

      {/* [설명: 타래 등록/수정 모달창 UI] */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingThreadId ? "타래 수정" : "타래 등록"}</Text>
            <TextInput
              style={styles.pageInput}
              placeholder="45"
              keyboardType="number-pad"
              value={page}
              onChangeText={setPage}
            />
            <Text style={styles.pgText}>쪽</Text>
            <TextInput
              style={styles.contentInput}
              multiline
              placeholder="내용을 입력하세요"
              value={content}
              onChangeText={setContent}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={editingThreadId ? updateThread : addThread}>
                <Text>확인</Text>
              </Pressable>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  setEditingThreadId(null);
                  setPage("");
                  setContent("");
                }}
              >
                <Text>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}