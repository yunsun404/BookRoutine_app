import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const THREADS_ENDPOINT = `${BASE_URL}/threads`;
const AI_SUMMARY_ENDPOINT = `${BASE_URL}/threads-ai/summary`;

const USER_ID = "7ff77428-bdab-4724-9a67-ed5587217978";

// AI 요약 타래를 구분하는 마커 (addSummary에서 저장할 때도 이 문구로 시작함)
const AI_SUMMARY_MARKER = "[ AI 요약 ✨]";

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

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  lavender: "#A78BFA",
  bg: "#F7F7FA",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  lavenderSoft: "#F3EEFF",
  peach: "#FF8A7C",
  peachSoft: "#FFF1EE",
  danger: "#F2555A",
};

const markAiSummaryThreads = (list: Thread[]): Thread[] =>
  list.map((t) => ({
    ...t,
    isAiSummary: t.isAiSummary || t.content?.startsWith(AI_SUMMARY_MARKER),
  }));

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}.${Number(m)}.${Number(d)}`;
};

export default function ThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawBookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;
  const rawBookTitle = Array.isArray(params.bookTitle) ? params.bookTitle[0] : params.bookTitle;
  const rawGroupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;

  const BOOK_ID = rawBookId || "160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a";
  const BOOK_TITLE = rawBookTitle || "데미안";
  const GROUP_ID = rawGroupId || null;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [notice, setNotice] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [BOOK_ID]);

  // 화면 하단 안내 문구는 잠깐 보여주고 사라지게
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };

  const openAdd = () => {
    setEditingThreadId(null);
    setPage("");
    setContent("");
    setFormError("");
    setModalVisible(true);
  };

  const addThread = async () => {
    if (!page.trim() || !content.trim()) {
      setFormError("쪽수와 내용을 모두 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      const res = await authFetch(THREADS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: BOOK_ID,
          group_id: GROUP_ID,
          content,
          current_page: parseInt(page, 10),
          is_public: true,
        }),
      });

      if (!res.ok) throw new Error();

      await fetchThreads();
      resetForm();
      showNotice("타래를 남겼어요");
    } catch (error) {
      setFormError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const startEditThread = (item: Thread) => {
    setEditingThreadId(item.thread_id);
    setPage(String(item.current_page));
    setContent(item.content);
    setFormError("");
    setModalVisible(true);
  };

  const updateThread = async () => {
    if (!editingThreadId || !page.trim() || !content.trim()) {
      setFormError("쪽수와 내용을 모두 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
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
      showNotice("타래를 수정했어요");
    } catch (error) {
      setFormError("수정하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPage("");
    setContent("");
    setEditingThreadId(null);
    setFormError("");
    setModalVisible(false);
  };

  const performDelete = async (threadId: string) => {
    try {
      const res = await authFetch(`${THREADS_ENDPOINT}/${threadId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchThreads();
        showNotice("타래를 삭제했어요");
      } else {
        showNotice(`삭제하지 못했어요 (코드: ${res.status})`);
      }
    } catch (error) {
      console.log("삭제 중 에러 발생:", error);
      showNotice("삭제 중 연결 오류가 발생했어요");
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
      setSummarizing(true);
      const res = await authFetch(AI_SUMMARY_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ book_id: BOOK_ID }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice("AI 요약을 만들지 못했어요");
        return;
      }

      // AI 요약을 실제 타래로 저장 (새로고침해도 남도록)
      const saveRes = await authFetch(THREADS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: BOOK_ID,
          group_id: GROUP_ID,
          content: `${AI_SUMMARY_MARKER}\n${data.summary}`,
          current_page: 0,
          is_public: true,
        }),
      });

      if (!saveRes.ok) {
        showNotice("AI 요약을 저장하지 못했어요");
        return;
      }

      await fetchThreads();
      showNotice("AI 요약을 추가했어요");
    } catch (error) {
      showNotice("AI 요약 서버에 연결할 수 없어요");
    } finally {
      setSummarizing(false);
    }
  };

  const normalThreads = threads.filter((t) => !t.isAiSummary);

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.push("/homescreen"))}
          hitSlop={8}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{BOOK_TITLE}</Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={C.primary} />
        ) : threads.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="아직 등록된 타래가 없어요"
            sub="읽은 쪽과 생각을 남기면 여기에 쌓여요"
          />
        ) : (
          threads.map((item) => (
            <View key={item.thread_id} style={[s.card, item.isAiSummary && s.cardAi]}>
              <View style={s.cardTop}>
                {item.isAiSummary ? (
                  <View style={s.aiChip}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                    <Text style={s.aiChipText}>AI 요약</Text>
                  </View>
                ) : (
                  <View style={s.pagePill}>
                    <Text style={s.pageText}>{item.current_page} pg</Text>
                  </View>
                )}
                <Text style={s.date}>{formatDate(item.created_at)}</Text>
              </View>

              <Text style={s.content}>
                {item.isAiSummary ? item.content?.replace(`${AI_SUMMARY_MARKER}\n`, "") : item.content}
              </Text>

              <View style={s.actions}>
                {!item.isAiSummary && (
                  <>
                    <Pressable hitSlop={8} onPress={() => startEditThread(item)}>
                      <Text style={s.actEdit}>수정</Text>
                    </Pressable>
                    <View style={s.actDivider} />
                  </>
                )}
                <Pressable hitSlop={8} onPress={() => setDeleteTargetId(item.thread_id)}>
                  <Text style={s.actDel}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {!!notice && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{notice}</Text>
        </View>
      )}

      {/* 타래 추가 버튼 */}
      <Pressable
        style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.95 }] }]}
        onPress={openAdd}
        accessibilityLabel="타래 등록"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {/* AI 요약 버튼 */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [
            s.aiButton,
            (normalThreads.length === 0 || summarizing) && s.aiButtonOff,
            pressed && { opacity: 0.85 },
          ]}
          onPress={addSummary}
          disabled={normalThreads.length === 0 || summarizing}
        >
          {summarizing ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.aiButtonText}>요약하는 중</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.aiButtonText}>AI 요약하기</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* 등록 / 수정 모달 */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={resetForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalBackground}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingThreadId ? "타래 수정" : "타래 등록"}</Text>

            <View style={s.field}>
              <Text style={s.fieldLabel}>쪽 수</Text>
              <View style={[s.inputWrap, { width: 130 }]}>
                <TextInput
                  style={s.input}
                  placeholder="45"
                  placeholderTextColor={C.inkMute}
                  keyboardType="number-pad"
                  value={page}
                  onChangeText={(v) => {
                    setPage(v.replace(/[^0-9]/g, ""));
                    setFormError("");
                  }}
                  autoFocus
                />
                <Text style={s.unit}>쪽</Text>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>내용</Text>
              <View style={[s.inputWrap, s.textareaWrap]}>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="오늘 읽은 부분에서 든 생각을 남겨보세요"
                  placeholderTextColor={C.inkMute}
                  value={content}
                  onChangeText={(v) => {
                    setContent(v);
                    setFormError("");
                  }}
                />
              </View>
            </View>

            {!!formError && <Text style={s.error}>{formError}</Text>}

            <View style={s.modalButtons}>
              <Pressable style={({ pressed }) => [s.cancelBtn, pressed && { backgroundColor: C.bg }]} onPress={resetForm}>
                <Text style={s.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.confirmBtn, (pressed || saving) && { opacity: 0.8 }]}
                onPress={() => (editingThreadId ? updateThread() : addThread())}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmText}>{editingThreadId ? "수정" : "등록"}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 삭제 확인 모달 (웹·앱 공통) */}
      <Modal transparent visible={!!deleteTargetId} animationType="fade" onRequestClose={() => setDeleteTargetId(null)}>
        <View style={s.modalBackground}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>타래를 삭제할까요?</Text>
            <Text style={s.modalDesc}>삭제한 타래는 되돌릴 수 없어요.</Text>
            <View style={s.modalButtons}>
              <Pressable
                style={({ pressed }) => [s.cancelBtn, pressed && { backgroundColor: C.bg }]}
                onPress={() => setDeleteTargetId(null)}
              >
                <Text style={s.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.confirmBtn, { backgroundColor: C.danger }, pressed && { opacity: 0.85 }]}
                onPress={confirmDelete}
              >
                <Text style={s.confirmText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({
  icon,
  title,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  sub: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={28} color={C.peach} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4 },

  list: { padding: 20, gap: 12, paddingBottom: 190, flexGrow: 1 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 60 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: C.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  emptySub: { fontSize: 13, color: C.inkSub, textAlign: "center" },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardAi: { backgroundColor: C.lavenderSoft, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: "#E4DAFB" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pagePill: { backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pageText: { fontSize: 12, fontWeight: "800", color: C.primary },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.lavender,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiChipText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  date: { fontSize: 12, fontWeight: "600", color: C.inkMute },
  content: { fontSize: 15, lineHeight: 23, color: C.ink },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  actDivider: { width: 1, height: 12, backgroundColor: C.line },
  actEdit: { fontSize: 13, fontWeight: "600", color: C.inkSub },
  actDel: { fontSize: 13, fontWeight: "600", color: C.danger },

  toast: {
    position: "absolute",
    alignSelf: "center",
    bottom: 180,
    backgroundColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  footer: { position: "absolute", left: 20, right: 20, bottom: 28 },
  aiButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  aiButtonOff: { backgroundColor: "#C9CCE0", shadowOpacity: 0, elevation: 0 },
  aiButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalBackground: { flex: 1, backgroundColor: "rgba(31,34,51,0.45)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: C.card, borderRadius: 28, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4 },
  modalDesc: { fontSize: 14, color: C.inkSub, marginTop: -6 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: C.inkSub },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, color: C.ink, outlineStyle: "none" as any },
  unit: { fontSize: 14, fontWeight: "700", color: C.primary },
  textareaWrap: { height: 130, alignItems: "flex-start", paddingVertical: 12 },
  textarea: { height: "100%", textAlignVertical: "top" },
  error: { fontSize: 13, fontWeight: "600", color: C.danger },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: C.inkSub },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});