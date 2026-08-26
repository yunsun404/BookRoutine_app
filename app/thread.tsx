import Header from "@/components/Header";
import { authFetch, BASE_URL } from "@/constants/api";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { styles } from "./styles/thread.styles";

const THREADS_ENDPOINT = `${BASE_URL}/threads`;
const AI_SUMMARY_ENDPOINT = `${BASE_URL}/threads-ai/summary`;

const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";

// AI 요약 타래를 구분하는 마커 (addSummary에서 저장할 때도 이 문구로 시작함)
const AI_SUMMARY_MARKER = "✨ [AI 핵심 요약]";

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
  isAiSummary?: boolean;
};

// 서버에서 받아온 타래 목록 중, 내용이 AI 요약 마커로 시작하는 걸 isAiSummary로 표시
const markAiSummaryThreads = (list: Thread[]): Thread[] =>
  list.map((t) => ({
    ...t,
    isAiSummary: t.isAiSummary || t.content?.startsWith(AI_SUMMARY_MARKER),
  }));

export default function ThreadScreen() {
  // 💡 홈 화면에서 전달받은 파라미터 처리 (배열 형태로 올 경우 첫 번째 값 사용, 없으면 기존 데미안 유지)
  const params = useLocalSearchParams();
  const rawBookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;
  const rawBookTitle = Array.isArray(params.bookTitle) ? params.bookTitle[0] : params.bookTitle;

  const BOOK_ID = rawBookId || "160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a";
  const BOOK_TITLE = rawBookTitle || "데미안";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  // 👇 웹에서 쓸 커스텀 삭제 확인 모달용 상태
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      const url = `${THREADS_ENDPOINT}?book_id=${BOOK_ID}`;
      const res = await authFetch(url);
      const data = await res.json();
      
      if (!res.ok) return;

      if (Array.isArray(data)) {
        setThreads(markAiSummaryThreads(data));
      } else if (data && Array.isArray(data.threads)) {
        setThreads(markAiSummaryThreads(data.threads));
      } else if (data && Array.isArray(data.data)) {
        setThreads(markAiSummaryThreads(data.data));
      } else {
        setThreads([]);
      }
    } catch (error) {
      console.log("타래 조회 에러:", error);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [BOOK_ID]);

  const addThread = async () => {
    if (!page.trim() || !content.trim()) {
      Alert.alert("알림", "쪽수와 내용을 모두 입력해주세요.");
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
          current_page: parseInt(page, 10),
          is_public: true,
        }),
      });

      if (!res.ok) throw new Error();

      await fetchThreads();
      resetForm();
      Alert.alert("성공", "타래가 저장되었습니다.");
    } catch (error) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  const startEditThread = (item: Thread) => {
    setEditingThreadId(item.thread_id);
    setPage(String(item.current_page));
    setContent(item.content);
    setModalVisible(true);
  };

  const updateThread = async () => {
    if (!editingThreadId || !page.trim() || !content.trim()) {
      Alert.alert("알림", "쪽수와 내용을 모두 입력해주세요.");
      return;
    }

    try {
      const res = await authFetch(`${THREADS_ENDPOINT}/${editingThreadId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content,
          current_page: parseInt(page, 10),
        }),
      });

      if (!res.ok) throw new Error();

      await fetchThreads();
      resetForm();
      Alert.alert("성공", "타래가 수정되었습니다.");
    } catch (error) {
      Alert.alert("오류", "수정에 실패했습니다.");
    }
  };

  const resetForm = () => {
    setPage("");
    setContent("");
    setEditingThreadId(null);
    setModalVisible(false);
  };

  // 실제 삭제 통신 로직 (플랫폼 공통)
  const performDelete = async (threadId: string) => {
    try {
      console.log("삭제 요청 보냄:", `${THREADS_ENDPOINT}/${threadId}`);
      const res = await authFetch(`${THREADS_ENDPOINT}/${threadId}`, {
        method: "DELETE",
      });

      // 서버 응답 상태 및 본문 확인
      const responseText = await res.text();
      console.log("삭제 응답 상태 코드:", res.status);
      console.log("삭제 응답 본문:", responseText);

      if (res.ok) {
        await fetchThreads();
        Alert.alert("성공", "타래가 삭제되었습니다.");
      } else {
        Alert.alert("오류", `삭제 실패 (코드: ${res.status})`);
      }
    } catch (error) {
      console.log("삭제 중 에러 발생:", error);
      Alert.alert("오류", "삭제 통신 중 에러가 발생했습니다.");
    }
  };

  const deleteThread = (threadId: string) => {
    if (Platform.OS === "web") {
      // 웹에서는 네이티브 window.confirm 대신 커스텀 모달을 띄움
      setDeleteTargetId(threadId);
    } else {
      Alert.alert("삭제 확인", "이 타래를 삭제하시겠습니까?", [
        { text: "취소" },
        { text: "삭제", onPress: () => performDelete(threadId) },
      ]);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    await performDelete(id);
  };

  const addSummary = async () => {
    try {
      const res = await authFetch(AI_SUMMARY_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ book_id: BOOK_ID }),
      });
      const data = await res.json();
      if (!res.ok) return;

      // 👇 AI 요약을 실제 타래로 저장 (이걸 안 하면 화면에만 잠깐 보이고 새로고침 시 사라짐)
      const saveRes = await authFetch(THREADS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: BOOK_ID,
          group_id: null,
          content: `${AI_SUMMARY_MARKER}\n${data.summary}`,
          current_page: 0,
          is_public: true,
        }),
      });

      if (!saveRes.ok) {
        Alert.alert("오류", "AI 요약 저장에 실패했습니다.");
        return;
      }

      // 저장된 걸 다시 불러오면 markAiSummaryThreads가 자동으로 보라색 뱃지 처리해줌
      await fetchThreads();
    } catch (error) {
      Alert.alert("오류", "AI 요약 실패");
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>“ {BOOK_TITLE} ”</Text>

      <View style={styles.tabContainer}>
        <Pressable style={styles.activeTabButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.activeTabText}>타래 등록</Text>
        </Pressable>
        <Pressable style={styles.tabButton}>
          <Text style={styles.tabText}>문장 수집</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.timelineContainer}>
        {threads.length === 0 ? (
          <Text style={styles.emptyText}>아직 등록된 타래가 없습니다.</Text>
        ) : (
          threads.map((item, index) => {
            const isLast = index === threads.length - 1;
            return (
              <View key={item.thread_id} style={styles.timelineWrapper}>
                <View style={isLast ? styles.lastItemLine : styles.itemLine} />
                <View style={styles.dot} />
                <View style={styles.connectorLine} />
                <View style={[styles.card, item.isAiSummary && { backgroundColor: "#F3EBF6", borderColor: "#D1C4E9" }]}>
                  <View style={styles.cardTop}>
                    {item.isAiSummary ? (
                      <View
                        style={{
                          backgroundColor: "#8E6FC9",
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                          AI 요약
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.page}>{item.current_page} pg</Text>
                    )}
                    <Text style={styles.date}>{item.created_at?.slice(0, 10)}</Text>
                  </View>
                  <Text style={styles.content}>
                    {item.isAiSummary
                      ? item.content?.replace(`${AI_SUMMARY_MARKER}\n`, "")
                      : item.content}
                  </Text>
                  <View style={styles.cardButtons}>
                    {!item.isAiSummary && (
                      <Pressable style={styles.smallButton} onPress={() => startEditThread(item)}>
                        <Text style={styles.smallButtonText}>수정</Text>
                      </Pressable>
                    )}
                    {/* 👇 삭제 버튼 클릭 시 확실하게 반응하도록 이벤트 연결 및 로그 추가 */}
                    <Pressable
                      style={styles.smallButton}
                      onPress={() => {
                        console.log("삭제 버튼 클릭됨, ID:", item.thread_id);
                        deleteThread(item.thread_id);
                      }}
                    >
                      <Text style={styles.smallButtonText}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.aiButtonFixed} onPress={addSummary}>
        <Text style={styles.aiButtonText}>AI 요약하기</Text>
      </Pressable>

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
              <Pressable 
                style={styles.modalButton} 
                onPress={() => editingThreadId ? updateThread() : addThread()}
              >
                <Text>확인</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={resetForm}>
                <Text>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 👇 웹 전용 커스텀 삭제 확인 모달 (기존 modalBox 스타일 재사용) */}
      <Modal transparent visible={!!deleteTargetId} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>삭제 확인</Text>
            <Text style={{ textAlign: "center", color: "#555", marginBottom: 20 }}>
              이 타래를 삭제하시겠습니까?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={confirmDelete}>
                <Text>삭제</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={() => setDeleteTargetId(null)}>
                <Text>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
