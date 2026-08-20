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

import { styles } from "./styles/thread.styles";

const THREADS_ENDPOINT = `${BASE_URL}/threads`;
const AI_SUMMARY_ENDPOINT = `${BASE_URL}/threads-ai/summary`;

const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";
const BOOK_ID = "160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a";

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

export default function ThreadScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      const url = `${THREADS_ENDPOINT}?book_id=${BOOK_ID}`;
      const res = await authFetch(url);
      const data = await res.json();
      
      if (!res.ok) return;

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

  useEffect(() => {
    fetchThreads();
  }, []);

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
            if (res.ok) await fetchThreads();
          } catch (error) {
            Alert.alert("오류", "삭제 실패");
          }
        },
      },
    ]);
  };

  const addSummary = async () => {
    try {
      const res = await authFetch(AI_SUMMARY_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ book_id: BOOK_ID }),
      });
      const data = await res.json();
      if (!res.ok) return;

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
        isAiSummary: true,
      };
      setThreads((prev) => [aiSummaryThread, ...prev]);
    } catch (error) {
      Alert.alert("오류", "AI 요약 실패");
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.title}>“ 데미안 ”</Text>

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
              {/* 버튼 터치 영역 보장 및 로직 연결 */}
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
    </View>
  );
}