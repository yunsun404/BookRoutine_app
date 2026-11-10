import { authFetch, BASE_URL } from "@/constants/api";
import { P } from "@/constants/palette";
import { useInputColors } from "@/hooks/useInputColors";
import { isAiSummary, stripAiMarker, validateThreadInput } from "@/lib/threads/aiSummary";
import { createAiSummary, createThread } from "@/lib/threads/threadActions";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";

interface BookDetail {
  bookshelf_id: string;
  progress: number;
  current_page: number;
  status: number;
  book: {
    book_id: string;
    title: string;
    author: string;
    cover_url: string;
    total_pages: number;
  };
  reading_goals: {
    goal_id: string;
    start_date: string;
    end_date: string;
    period: number;
    daily_pages: number;
    preferred_days: number[];
  }[];
}

type Thread = {
  thread_id: string;
  content: string;
  current_page: number;
  created_at: string;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const getDayLabel = (days: number[]) => {
  return days.map((d) => DAY_LABELS[d]).join("/");
};

// 웹(Chrome 에뮬레이션)에서는 Alert.alert의 버튼 콜백이 동작하지 않아 window.confirm으로 분기
const confirmDelete = (): Promise<boolean> => {
  const message = "이 책을 책장에서 삭제할까요?\n타래와 목표 기록은 그대로 남아요.";
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) =>
    Alert.alert("책 삭제", message, [
      { text: "취소", style: "cancel", onPress: () => resolve(false) },
      { text: "삭제", style: "destructive", onPress: () => resolve(true) },
    ]),
  );
};

const showError = (message: string) => {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert(message);
};

export default function BookDetailScreen() {
  const { bookshelf_id } = useLocalSearchParams<{ bookshelf_id: string }>();
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [deleting, setDeleting] = useState(false);

  // 타래 쓰기 · AI 요약 (홈의 타래 버튼으로 들어오면 여기서 함) — lib/threads/*
  const ic = useInputColors();
  const [composeVisible, setComposeVisible] = useState(false);
  const [page, setPage] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, []);

  useEffect(() => {
    if (detail?.book.book_id) {
      fetchThreads();
    }
  }, [detail]);

  const fetchDetail = async () => {
    try {
      const response = await authFetch(`${BASE_URL}/bookshelf/${bookshelf_id}`);
      const data = await response.json();
      setDetail(data);
    } catch (error) {
      console.error("책 상세 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      const url = `${BASE_URL}/threads?book_id=${detail?.book.book_id}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setThreads(data);
      else if (data?.threads) setThreads(data.threads);
      else if (data?.data) setThreads(data.data);
    } catch (error) {
      console.error("타래 에러:", error);
    }
  };

  const openCompose = () => {
    setPage("");
    setContent("");
    setFormError("");
    setComposeVisible(true);
  };

  const closeCompose = () => {
    if (saving) return;
    setComposeVisible(false);
  };

  const submitThread = async () => {
    if (!detail || saving) return;
    const problem = validateThreadInput(page, content);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    const ok = await createThread(detail.book.book_id, parseInt(page.trim(), 10), content.trim());
    setSaving(false);
    if (!ok) {
      setFormError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    setComposeVisible(false);
    await fetchThreads();
  };

  const handleSummary = async () => {
    if (!detail || summarizing) return;
    setSummarizing(true);
    const result = await createAiSummary(detail.book.book_id, threads);
    setSummarizing(false);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    await fetchThreads();
    if (result.aiUnavailable) showError("AI 서버가 꺼져 있어 이전 요약을 보여드려요");
  };

  const handleDelete = async () => {
    if (deleting) return;
    const ok = await confirmDelete();
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await authFetch(`${BASE_URL}/bookshelf/${bookshelf_id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`삭제 실패 (${res.status})`);
      router.back();
    } catch (error) {
      console.error("책 삭제 에러:", error);
      showError("책을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text>책 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const goal = detail.reading_goals?.[0] ?? null;

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={P.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          hitSlop={8}
          accessibilityLabel="책장에서 삭제"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={P.textTertiary} />
          ) : (
            <Ionicons name="trash-outline" size={22} color={P.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 책 정보 */}
        <View style={styles.bookInfoRow}>
          <Image source={{ uri: detail.book.cover_url }} style={styles.cover} />
          <View style={styles.bookInfo}>
            <Text style={styles.title}>{detail.book.title}</Text>
            <Text style={styles.author}>{detail.book.author}</Text>

            {goal && (
              <Text style={styles.goalDays}>
                [{getDayLabel(goal.preferred_days)}] {goal.daily_pages} page
              </Text>
            )}

            {goal && (
              <Text style={styles.goalPeriod}>
                {formatDate(goal.start_date)} ~ {formatDate(goal.end_date)}
              </Text>
            )}

            <View style={styles.progressRow}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${detail.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.pageText}>
                {detail.current_page}/{detail.book.total_pages}
              </Text>
            </View>
          </View>
        </View>

        {/* 타래 목록 */}
        <View style={styles.threadSection}>
          <Text style={styles.threadTitle}>타래</Text>

          {/* 타래 쓰기 · AI 요약 */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed]}
              onPress={openCompose}
              accessibilityLabel="타래 쓰기"
            >
              <Ionicons name="create-outline" size={16} color={P.onPrimary} />
              <Text style={styles.actionPrimaryText}>타래 쓰기</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionSecondary, pressed && styles.pressed]}
              onPress={handleSummary}
              disabled={summarizing}
              accessibilityLabel="AI 요약하기"
            >
              {summarizing ? (
                <ActivityIndicator size="small" color={P.primary} />
              ) : (
                <Ionicons name="sparkles-outline" size={16} color={P.primary} />
              )}
              <Text style={styles.actionSecondaryText}>{summarizing ? "요약하는 중" : "AI 요약하기"}</Text>
            </Pressable>
          </View>

          {threads.length === 0 ? (
            <Text style={styles.threadEmpty}>아직 기록이 없습니다.</Text>
          ) : (
            threads.map((item) => {
              const ai = isAiSummary(item.content);
              return (
                <View key={item.thread_id} style={[styles.threadCard, ai && styles.aiCard]}>
                  <View style={styles.threadCardTop}>
                    {ai ? (
                      <Text style={styles.aiChip}>AI 요약</Text>
                    ) : (
                      <Text style={styles.threadPage}>{item.current_page} pg</Text>
                    )}
                    <Text style={styles.threadDate}>
                      {item.created_at?.slice(0, 10)}
                    </Text>
                  </View>
                  <Text style={styles.threadContent}>{ai ? stripAiMarker(item.content) : item.content}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 타래 쓰기 창 — 키보드가 입력칸을 가리지 않게 KeyboardAvoidingView
          (SDK 54 안드로이드는 화면 끝까지 그리는 방식이라 팝업 창이 저절로 밀려 올라가지 않음 → 양쪽 모두 padding) */}
      <Modal transparent visible={composeVisible} animationType="fade" onRequestClose={closeCompose}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>타래 쓰기</Text>
            <Text style={styles.modalLabel}>쪽수</Text>
            <TextInput
              style={[styles.modalInput, { color: ic.text }]}
              placeholderTextColor={ic.placeholder}
              placeholder="예: 42"
              keyboardType="number-pad"
              value={page}
              onChangeText={setPage}
              maxLength={6}
            />
            <Text style={styles.modalLabel}>내용</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { color: ic.text }]}
              placeholderTextColor={ic.placeholder}
              placeholder="인상 깊었던 문장이나 생각을 남겨보세요"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            {!!formError && <Text style={styles.formError}>{formError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeCompose} disabled={saving}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitThread} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={P.onPrimary} />
                ) : (
                  <Text style={styles.modalConfirmText}>남기기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bookInfoRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cover: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: P.coverPlaceholder,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    color: P.textSecondary,
    marginBottom: 2,
  },
  goalDays: {
    fontSize: 12,
    color: P.textSecondary,
    marginBottom: 2,
  },
  goalPeriod: {
    fontSize: 11,
    color: P.textTertiary,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 5,
    backgroundColor: P.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: P.primary,
    borderRadius: 3,
  },
  pageText: {
    fontSize: 11,
    color: P.textTertiary,
  },
  threadSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 12,
  },
  threadEmpty: {
    fontSize: 14,
    color: P.textTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },
  threadCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  threadCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  threadPage: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
  },
  threadDate: {
    fontSize: 11,
    color: P.textTertiary,
  },
  threadContent: {
    fontSize: 13,
    color: P.ink,
    lineHeight: 20,
  },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  actionPrimary: { backgroundColor: P.primary },
  actionPrimaryText: { color: P.onPrimary, fontSize: 14, fontWeight: "700" },
  actionSecondary: { backgroundColor: P.primaryTint },
  actionSecondaryText: { color: P.primary, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  aiCard: { backgroundColor: P.lavenderTint },
  aiChip: { fontSize: 12, fontWeight: "700", color: P.primaryLight },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31,34,51,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalBox: { backgroundColor: P.surface, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: P.ink, marginBottom: 12 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: P.textSecondary, marginBottom: 6, marginTop: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: P.surface,
  },
  modalTextArea: { minHeight: 110, maxHeight: 200 },
  formError: { color: P.danger, fontSize: 12, marginTop: 8 },
  modalButtons: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.bg,
  },
  modalCancelText: { color: P.textSecondary, fontSize: 15, fontWeight: "600" },
  modalConfirm: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primary,
  },
  modalConfirmText: { color: P.onPrimary, fontSize: 15, fontWeight: "700" },
});