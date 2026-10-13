// components/sentences/SentenceTab.tsx
// 책 상세 화면의 "문장 수집" 탭 본체.
// 흐름: 목록 조회 → (+버튼) 수집 방법 선택 → [촬영/앨범 → OCR] 또는 [직접 입력] → 편집 모달 → 저장
//
// + 버튼(FAB) 자체는 book-detail.tsx가 그립니다. FAB는 스크롤과 상관없이 화면에 떠 있어야 해서
// ScrollView 바깥에 있어야 하는데, 이 탭은 ScrollView 안에 들어가기 때문이에요.
// 그래서 시트 열림 여부는 부모가 들고(controlled), 이 컴포넌트는 props로 받기만 합니다.
import {
  createSentence,
  deleteSentence,
  getSentences,
  scanSentenceImage,
  updateSentence,
  type Sentence,
  type SentenceSource,
} from "@/constants/sentenceApi";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AddSentenceSheet, { type AddMethod } from "./AddSentenceSheet";
import SentenceCard from "./SentenceCard";
import SentenceEditorModal, { EMPTY_FORM, type SentenceFormValue } from "./SentenceEditorModal";
import SentenceImageMaker from "./SentenceImageMaker";
import { P } from "@/constants/palette";

type Props = {
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string | null;
  totalPages?: number | null;
  addSheetVisible: boolean;
  onCloseAddSheet: () => void;
};

type EditorState = {
  visible: boolean;
  mode: "create" | "edit";
  source: SentenceSource;
  targetId: string | null; // 수정 중인 문장 id (create면 null)
  initial: SentenceFormValue;
};

const CLOSED_EDITOR: EditorState = {
  visible: false,
  mode: "create",
  source: "MANUAL",
  targetId: null,
  initial: EMPTY_FORM,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SentenceTab({ bookId, bookTitle, bookAuthor, totalPages, addSheetVisible, onCloseAddSheet }: Props) {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [editor, setEditor] = useState<EditorState>(CLOSED_EDITOR);
  const [imageTarget, setImageTarget] = useState<Sentence | null>(null); // 이미지로 만들 문장

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSentences(await getSentences(bookId));
    } catch (e: any) {
      setError(e?.message ?? "문장을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  // ───────── 수집 방법 선택 ─────────
  const handleSelectMethod = async (method: AddMethod) => {
    onCloseAddSheet();
    if (method === "manual") {
      openCreateEditor("MANUAL", "");
      return;
    }
    // 시트(Modal)가 완전히 닫히기 전에 카메라/앨범을 띄우면 iOS에서 아무 반응이 없는 문제가 있어
    // 슬라이드 애니메이션이 끝날 시간만큼 기다린 뒤 띄웁니다.
    await wait(400);
    await pickAndScan(method);
  };

  const pickAndScan = async (method: "camera" | "gallery") => {
    const permission =
      method === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "권한 필요",
        method === "camera"
          ? "문장을 촬영하려면 카메라 권한이 필요해요."
          : "사진에서 문장을 읽으려면 앨범 접근 권한이 필요해요."
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      // 크롭 화면을 띄워서 "원하는 문장 부분만" 잘라 보내게 합니다.
      // 인식 정확도↑ (배경·다른 문단 제거) + 전송 용량↓ + 편집할 텍스트 양↓ — 일석삼조.
      // aspect를 지정하지 않으면 Android는 자유 비율로 자를 수 있어요.
      allowsEditing: true,
      quality: 0.6, // OCR에는 원본 화질까지 필요 없음. 용량을 줄여 업로드 속도 확보
      base64: true,
    };

    const result =
      method === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    const format = asset.mimeType === "image/png" ? "png" : "jpg";

    setScanning(true);
    try {
      const { text } = await scanSentenceImage(asset.base64, format);
      if (!text.trim()) {
        Alert.alert("글자를 찾지 못했어요", "조금 더 가까이, 밝은 곳에서 다시 찍어보세요.\n직접 입력으로 적을 수도 있어요.");
        return;
      }
      openCreateEditor("OCR", text);
    } catch (e: any) {
      Alert.alert("인식 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setScanning(false);
    }
  };

  // ───────── 편집 모달 ─────────
  const openCreateEditor = (source: SentenceSource, content: string) => {
    setEditor({
      visible: true,
      mode: "create",
      source,
      targetId: null,
      initial: { ...EMPTY_FORM, content },
    });
  };

  const openEditEditor = (s: Sentence) => {
    setEditor({
      visible: true,
      mode: "edit",
      source: s.source,
      targetId: s.sentence_id,
      initial: {
        content: s.content,
        page: s.page != null ? String(s.page) : "",
        memo: s.memo ?? "",
      },
    });
  };

  const closeEditor = () => setEditor((prev) => ({ ...prev, visible: false }));

  const handleSubmit = async (value: SentenceFormValue) => {
    const page = value.page ? Number(value.page) : null;
    const memo = value.memo.trim() || null;

    if (editor.mode === "create") {
      const created = await createSentence({
        book_id: bookId,
        content: value.content,
        page,
        memo,
        source: editor.source,
      });
      // 서버에서 목록을 다시 받지 않고 응답으로 받은 한 건만 맨 앞에 끼워 넣습니다 (최신순 유지)
      setSentences((prev) => [created, ...prev]);
    } else if (editor.targetId) {
      const updated = await updateSentence(editor.targetId, { content: value.content, page, memo });
      setSentences((prev) => prev.map((s) => (s.sentence_id === updated.sentence_id ? updated : s)));
    }
    closeEditor();
  };

  // ───────── 삭제 ─────────
  const confirmDelete = (s: Sentence) => {
    Alert.alert("문장 삭제", "이 문장을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          // 낙관적 삭제: 먼저 화면에서 지우고, 실패하면 원래 목록으로 되돌립니다.
          const backup = sentences;
          setSentences((prev) => prev.filter((x) => x.sentence_id !== s.sentence_id));
          try {
            await deleteSentence(s.sentence_id);
          } catch (e: any) {
            setSentences(backup);
            Alert.alert("삭제 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
          }
        },
      },
    ]);
  };

  // ───────── 렌더링 ─────────
  let body: React.ReactNode;
  if (loading) {
    body = <ActivityIndicator style={{ marginTop: 40 }} color={P.primary} />;
  } else if (error) {
    body = (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>{error}</Text>
        <Pressable onPress={load} style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  } else if (sentences.length === 0) {
    body = (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyEmoji}>🔖</Text>
        <Text style={styles.emptyTitle}>아직 모은 문장이 없어요</Text>
        <Text style={styles.emptyDesc}>+ 버튼을 눌러 마음에 남는 문장을{"\n"}찍거나 적어서 모아보세요</Text>
      </View>
    );
  } else {
    // ScrollView 안에 있으므로 FlatList 대신 map을 씁니다.
    // (같은 방향의 VirtualizedList를 ScrollView에 중첩하면 RN이 경고를 띄움)
    body = sentences.map((s) => (
      <SentenceCard
        key={s.sentence_id}
        sentence={s}
        onPress={openEditEditor}
        onLongPress={confirmDelete}
        onImagePress={setImageTarget}
      />
    ));
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>모은 문장</Text>
        {!loading && !error && <Text style={styles.headerCount}>{sentences.length}</Text>}
        <View style={{ flex: 1 }} />
        {sentences.length > 0 && <Text style={styles.headerHint}>길게 눌러 삭제</Text>}
        {/* 문장 검색: 기본은 "이 책" 범위, 검색 화면에서 "전체 책"으로 넓힐 수 있음 */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/sentence-search",
              params: { book_id: bookId, book_title: bookTitle ?? "" },
            })
          }
          hitSlop={10}
          style={styles.searchButton}
          accessibilityLabel="문장 검색"
        >
          <Ionicons name="search" size={18} color={P.inkSoft} />
        </Pressable>
      </View>

      {body}

      <AddSentenceSheet visible={addSheetVisible} onClose={onCloseAddSheet} onSelect={handleSelectMethod} />

      <SentenceEditorModal
        visible={editor.visible}
        mode={editor.mode}
        source={editor.source}
        initialValue={editor.initial}
        totalPages={totalPages}
        onClose={closeEditor}
        onSubmit={handleSubmit}
      />

      <SentenceImageMaker
        visible={!!imageTarget}
        sentence={imageTarget}
        bookTitle={bookTitle}
        bookAuthor={bookAuthor}
        onClose={() => setImageTarget(null)}
      />

      {/* OCR 진행 중 오버레이 — 사용자가 결과를 기다리는 동안 다른 조작을 막음 */}
      <Modal visible={scanning} transparent animationType="fade">
        <View style={styles.scanOverlay}>
          <View style={styles.scanBox}>
            <ActivityIndicator size="large" color={P.primary} />
            <Text style={styles.scanText}>문장을 읽고 있어요…</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: P.ink },
  headerCount: { fontSize: 16, fontWeight: "700", color: P.accent },
  headerHint: { fontSize: 12, color: P.textTertiary },
  searchButton: {
    marginLeft: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: P.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    borderStyle: "dashed",
  },
  emptyEmoji: { fontSize: 30, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: P.ink, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: P.textSecondary, textAlign: "center", lineHeight: 20 },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: P.primary,
  },
  retryText: { color: P.onPrimary, fontSize: 13, fontWeight: "600" },
  scanOverlay: {
    flex: 1,
    backgroundColor: P.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    backgroundColor: P.surface,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  scanText: { fontSize: 14, color: P.ink },
});
