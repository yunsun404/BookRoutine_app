import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

const API_URL = 'http://localhost:3000/threads';

const USER_ID = '7ff77428-bdab-4724-9a67-ed5587217978';
const BOOK_ID = '160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a';

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
  const [page, setPage] = useState('');
  const [content, setContent] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null); //수정,삭제

  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(''); // AI 요약 결과 저장

  const fetchThreads = async () => {
    try {
      const res = await fetch(
        `${API_URL}?user_id=${USER_ID}&book_id=${BOOK_ID}`,
      );

      const data = await res.json();

      if (!res.ok) {
        console.log('타래 조회 실패:', data);
        return;
      }

      setThreads(data);
    } catch (error) {
      console.log('타래 조회 에러:', error);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const addThread = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.log('타래 저장 실패:', data);
        Alert.alert('오류', '타래 저장 실패');
        return;
      }

      await fetchThreads();

      setPage('');
      setContent('');
      setModalVisible(false);

      Alert.alert('성공', '타래가 저장되었습니다.');
    } catch (error) {
      console.log('타래 저장 에러:', error);
      Alert.alert('오류', '서버 연결 실패');
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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          current_page: Number(page),
        }),
      });

      if (!res.ok) {
        Alert.alert('오류', '타래 수정 실패');
        return;
      }

      await fetchThreads();

      setEditingThreadId(null);
      setPage('');
      setContent('');
      setModalVisible(false);

      Alert.alert('성공', '타래가 수정되었습니다.');
    } catch (error) {
      console.log(error);
      Alert.alert('오류', '서버 연결 실패');
    }
  };

  const deleteThread = async (threadId: string) => {
    Alert.alert('삭제 확인', '이 타래를 삭제하시겠습니까?', [
      { text: '취소' },
      {
        text: '삭제',
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/${threadId}`, {
              method: 'DELETE',
            });

            if (!res.ok) {
              Alert.alert('오류', '타래 삭제 실패');
              return;
            }

            await fetchThreads();
            Alert.alert('성공', '타래가 삭제되었습니다.');
          } catch (error) {
            console.log(error);
            Alert.alert('오류', '서버 연결 실패');
          }
        },
      },
    ]);
  };

  const addSummary = async () => {
    try {
      const text = threads.map((t) => t.content).join(' ');
      console.log('요약에 보내는 text:', text);

      if (!text.trim()) {
        Alert.alert('알림', '요약할 타래가 없습니다.');
        return;
      }

      const res = await fetch('http://localhost:3000/threads-ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threads[0].thread_id,
          text,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(data);
        Alert.alert('오류', 'AI 요약 실패');
        return;
      }

      console.log('AI 결과:', data.summary);

      setSummaryText(data.summary);
      setShowSummary(true);

    } catch (error) {
      console.log(error);
      Alert.alert('오류', 'AI 서버 연결 실패');
    }


  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>♟</Text>
        <Text style={styles.menu}>☰</Text>
      </View>

      <Text style={styles.title}>“ 데미안 “</Text>

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
            <View key={item.thread_id} style={styles.timelineRow}>
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.page}>{item.current_page} pg</Text>
                  <Text style={styles.date}>
                    {item.created_at?.slice(0, 10)}
                  </Text>
                </View>
                <Text style={styles.content}>“{item.content}”</Text>

                <View style={styles.cardButtons}>
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => startEditThread(item)}
                  >
                    <Text style={styles.smallButtonText}>수정</Text>
                  </Pressable>

                  <Pressable
                    style={styles.smallButton}
                    onPress={() => deleteThread(item.thread_id)}
                  >
                    <Text style={styles.smallButtonText}>삭제</Text>
                  </Pressable>
                </View>


              </View>
              <View style={styles.line} />
            </View>
          ))
        )}

        <Pressable style={styles.aiButton} onPress={addSummary}>
          <Text style={styles.aiButtonText}>AI 요약하기</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Text>통계</Text>
        <Text>달력</Text>
        <Text>홈</Text>
        <Text>그룹</Text>
        <Text>추천</Text>
      </View>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>타래 등록</Text>

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
              <Pressable style={styles.modalButton} onPress={addThread}>
                <Text>확인</Text>
              </Pressable>
              <Pressable
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
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
    width: 390,
    minHeight: '100%',
    backgroundColor: '#fff',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 24,
  },
  menu: {
    fontSize: 26,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 25,
    marginBottom: 18,
  },
  addButton: {
    backgroundColor: '#e4f3e8',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  threadArea: {
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 30,
    marginBottom: 30,
  },
  timelineRow: {
    position: 'relative',
  },
  card: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 9,
    padding: 18,
    marginBottom: 22,
    backgroundColor: '#fff',
  },
  summaryCard: {
    backgroundColor: '#e4f3e8',
    borderColor: '#7aa887',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  page: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
  summaryLabel: {
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  content: {
    fontSize: 13,
    lineHeight: 20,
  },
  line: {
    position: 'absolute',
    right: 14,
    top: 80,
    width: 2,
    height: 36,
    backgroundColor: '#333',
  },
  aiButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 15,
    paddingVertical: 9,
    alignItems: 'center',
    marginHorizontal: 35,
    marginTop: 4,
  },
  aiButtonText: {
    fontSize: 13,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 55,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: 300,
    backgroundColor: '#e4f3e8',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 18,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  pageInput: {
    width: 55,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pgText: {
    marginLeft: 65,
    marginTop: -26,
    marginBottom: 15,
  },
  contentInput: {
    height: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#777',
    borderRadius: 8,
    padding: 14,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 12,
    paddingVertical: 8,
    width: 120,
    alignItems: 'center',
  },
  cardButtons: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 14,
},
smallButton: {
  borderWidth: 1,
  borderColor: '#999',
  borderRadius: 10,
  paddingVertical: 5,
  paddingHorizontal: 12,
  backgroundColor: '#f7f7f7',
},
smallButtonText: {
  fontSize: 12,
},
});