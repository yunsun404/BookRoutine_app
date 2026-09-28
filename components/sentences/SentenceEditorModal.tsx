// components/sentences/SentenceEditorModal.tsx
// 문장 작성/수정 화면. OCR 결과도 바로 저장하지 않고 반드시 여기를 거칩니다.
// OCR은 "초안 작성자"일 뿐이고, 최종 편집권은 사용자에게 있어야 하기 때문이에요.
// (사진 한 장에는 보통 원하는 문장 + 앞뒤 문장 + 오인식 글자가 섞여 있습니다)
import type { SentenceSource } from "@/constants/sentenceApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { P } from "@/constants/palette";

// 입력칸은 전부 문자열로 다루고, 숫자 변환은 제출 시점에 한 번만 합니다.
// (TextInput은 문자열만 다루므로 중간에 number로 바꾸면 "빈 칸" 상태를 표현하기 어려움)
export type SentenceFormValue = {
  content: string;
  page: string;
  memo: string;
};

export const EMPTY_FORM: SentenceFormValue = { content: "", page: "", memo: "" };

const MAX_CONTENT = 1000;
const MAX_MEMO = 300;

type Props = {
  visible: boolean;
  mode: "create" | "edit";
  source: SentenceSource;
  initialValue: SentenceFormValue;
  totalPages?: number | null;
  onClose: () => void;
  onSubmit: (value: SentenceFormValue) => Promise<void>;
};

export default function SentenceEditorModal({
  visible,
  mode,
  source,
  initialValue,
  totalPages,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<SentenceFormValue>(initialValue);
  const [saving, setSaving] = useState(false);

  // 모달이 열릴 때마다 초기값으로 리셋 (이전에 쓰다 만 내용이 남지 않도록)
  useEffect(() => {
    if (visible) setForm(initialValue);
  }, [visible, initialValue]);

  const set = (key: keyof SentenceFormValue) => (text: string) =>
    setForm((prev) => ({ ...prev, [key]: text }));

  const trimmed = form.content.trim();
  const canSave = trimmed.length > 0 && !saving;

  const handleSave = async () => {
    if (!trimmed) return;

    if (form.page) {
      const page = Number(form.page);
      if (!Number.isInteger(page) || page < 1) {
        Alert.alert("쪽수 확인", "쪽수는 1 이상의 숫자로 적어주세요.");
        return;
      }
      if (totalPages && page > totalPages) {
        Alert.alert("쪽수 확인", `이 책은 총 ${totalPages}쪽이에요.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit({ ...form, content: trimmed });
    } catch (e: any) {
      Alert.alert("저장 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const isOcr = source === "OCR" && mode === "create";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={P.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{mode === "create" ? "문장 수집" : "문장 수정"}</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={10}>
            {saving ? (
              <ActivityIndicator color={P.primary} />
            ) : (
              <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>저장</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {isOcr && (
            <View style={styles.ocrHint}>
              <Ionicons name="sparkles-outline" size={16} color={P.accent} />
              <Text style={styles.ocrHintText}>
                사진에서 읽어온 글이에요. 모으고 싶은 문장만 남기고, 잘못 인식된 글자를 고쳐주세요.
              </Text>
            </View>
          )}

          <Text style={styles.label}>문장</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            value={form.content}
            onChangeText={set("content")}
            placeholder="마음에 남은 문장을 적어주세요"
            placeholderTextColor={P.textTertiary}
            multiline
            maxLength={MAX_CONTENT}
            textAlignVertical="top"
            autoFocus={!isOcr}
          />
          <Text style={styles.counter}>
            {form.content.length} / {MAX_CONTENT}
          </Text>

          <Text style={styles.label}>쪽수 (선택)</Text>
          <TextInput
            style={[styles.input, styles.pageInput]}
            value={form.page}
            onChangeText={(t) => set("page")(t.replace(/[^0-9]/g, ""))}
            placeholder={totalPages ? `1 ~ ${totalPages}` : "예: 123"}
            placeholderTextColor={P.textTertiary}
            keyboardType="number-pad"
            maxLength={5}
          />

          <Text style={styles.label}>나의 생각 (선택)</Text>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={form.memo}
            onChangeText={set("memo")}
            placeholder="이 문장이 왜 마음에 남았나요?"
            placeholderTextColor={P.textTertiary}
            multiline
            maxLength={MAX_MEMO}
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: P.ink },
  saveText: { fontSize: 16, fontWeight: "700", color: P.primary },
  saveTextDisabled: { color: P.textTertiary },
  body: { padding: 20, paddingBottom: 60 },
  ocrHint: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: P.accentTint,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  ocrHintText: { flex: 1, fontSize: 13, lineHeight: 19, color: P.textSecondary },
  label: { fontSize: 14, fontWeight: "700", color: P.ink, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: P.ink,
    backgroundColor: P.bg,
  },
  contentInput: { minHeight: 160, lineHeight: 23 },
  counter: { alignSelf: "flex-end", fontSize: 12, color: P.textTertiary, marginTop: 6, marginBottom: 18 },
  pageInput: { width: 140, marginBottom: 18 },
  memoInput: { minHeight: 90 },
});
