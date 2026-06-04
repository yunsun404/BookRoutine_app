import Header from "@/components/Header";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const API_URL = "http://172.20.6.25:3000/api/v1/threads";

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
};

export default function ThreadScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);

  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  const fetchThreads = async () => {
    try {
      const res = await fetch(`${API_URL}?user_id=${USER_ID}&book_id=${BOOK_ID}`);
      const data = await res.json();

      if (!res.ok) {
        console.log("타래 조회 실패:", data);
        return;
      }

      setThreads(data);
    } catch (error) {
      console.log("타래 조회 에러:", error);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const addThread = async () => {
    if (!content.trim()) {
      Alert.alert("알림", "내용을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: BOOK_ID,
          group_id: null,
          content,
          current_page: Number(page),
          is_public: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("타래 저장 실패:", data);
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

  const startEditThread = (item: Thread) => {
    setEditingThreadId(item.thread_id);
    setPage(String(item.current_page));
    setContent(item.content);
    setModalVisible(true);
  };

  const updateThread = async () => {
    if (!editingThreadId) return;

    try {
      const res = await fetch(`${API_URL}/${editingThreadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

  const deleteThread = async (threadId: string) => {
    Alert.alert("삭제 확인", "이 타래를 삭제하시겠습니까?", [
      { text: "취소" },
      {
        text: "삭제",
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/${threadId}`, {
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

  const addSummary = async () => {
    try {
      const text = threads.map((t) => t.content).join(" ");

      if (!text.trim()) {
        Alert.alert("알림", "요약할 타래가 없습니다.");
        return;
      }

      const res = await fetch("http://localhost:3000/threads-ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thread_id: threads[0].thread_id,
          text,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(data);
        Alert.alert("오류", "AI 요약 실패");
        return;
      }

      setSummaryText(data.summary);
      setShowSummary(true);
    } catch (error) {
      console.log(error);
      Alert.alert("오류", "AI 서버 연결 실패");
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      <Text style={styles.title}>데미안</Text>

      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>타래 등록</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.threadArea}>
        {showSummary && (
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.cardTop}>
              <Text style={styles.summaryLabel}>AI 요약</Text>
              <Text style={styles.date}>{new Date().toISOString().slice(0, 10)}</Text>
            </View>
            <Text style={styles.content}>{summaryText}</Text>
          </View>
        )}

        {threads.length === 0 ? (
          <Text style={styles.emptyText}>아직 등록된 타래가 없습니다.</Text>
        ) : (
          threads.map((item) => (
            <View key={item.thread_id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.page}>{item.current_page} pg</Text>
                <Text style={styles.date}>{item.created_at?.slice(0, 10)}</Text>
              </View>

              <Text style={styles.content}>“{item.content}”</Text>

              <View style={styles.cardButtons}>
                <Pressable style={styles.smallButton} onPress={() => startEditThread(item)}>
                  <Text style={styles.smallButtonText}>수정</Text>
                </Pressable>

                <Pressable style={styles.smallButton} onPress={() => deleteThread(item.thread_id)}>
                  <Text style={styles.smallButtonText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable style={styles.aiButton} onPress={addSummary}>
          <Text style={styles.aiButtonText}>AI 요약하기</Text>
        </Pressable>
      </ScrollView>

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
                onPress={editingThreadId ? updateThread : addThread}
              >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0EFED",
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
    marginBottom: 18,
  },
  addButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  threadArea: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 30,
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryCard: {
    backgroundColor: "#E8F3EC",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  page: {
    fontSize: 12,
    color: "#777",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#4A3B32",
    fontWeight: "700",
  },
  content: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  aiButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 48,
    marginTop: 4,
    backgroundColor: "#4A3B32",
  },
  aiButtonText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "86%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "700",
    fontSize: 18,
    color: "#333",
  },
  pageInput: {
    width: 70,
    backgroundColor: "#F8F7F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pgText: {
    marginLeft: 78,
    marginTop: -28,
    marginBottom: 16,
    color: "#555",
  },
  contentInput: {
    height: 150,
    backgroundColor: "#F8F7F5",
    borderRadius: 12,
    padding: 14,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#F0EFED",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  cardButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  smallButton: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F0EFED",
  },
  smallButtonText: {
    fontSize: 12,
    color: "#333",
  },
});