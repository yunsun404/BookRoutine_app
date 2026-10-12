import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  primarySoft: "#EEF0FF",
  danger: "#F2555A",
};

type Props = {
  visible: boolean;
  // 체크리스트 문구 (예: "책제목 1 ~ 30쪽 읽기")
  taskText: string;
  onClose: () => void;
  // 성공하면 null, 실패하면 보여줄 에러 문구를 돌려준다
  onSubmit: (readUntil: number) => Promise<string | null>;
};

// 홈 체크리스트 "수정" → 오늘 실제로 읽은 쪽수 입력 팝업
export default function ReadPagesModal({ visible, taskText, onClose, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const range = taskText.match(/([\d,]+)\s*~\s*([\d,]+)/);
  const fromPage = range ? Number(range[1].replace(/,/g, "")) : null;
  const toPage = range ? Number(range[2].replace(/,/g, "")) : null;

  useEffect(() => {
    if (visible) {
      setValue(toPage ? String(toPage) : "");
      setError("");
    }
  }, [visible]);

  const submit = async () => {
    const page = Number(value);
    if (!value || !Number.isInteger(page)) {
      setError("쪽수를 숫자로 입력해주세요.");
      return;
    }
    if (fromPage && page < fromPage) {
      setError(`${fromPage}쪽 이상으로 입력해주세요.`);
      return;
    }

    setSubmitting(true);
    const message = await onSubmit(page);
    setSubmitting(false);
    if (message) setError(message);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.card}>
          <Text style={s.title}>오늘 어디까지 읽었나요?</Text>
          {fromPage !== null && toPage !== null && (
            <Text style={s.sub}>
              오늘 목표: {fromPage} ~ {toPage}쪽
            </Text>
          )}

          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={value}
              onChangeText={(t) => {
                setValue(t.replace(/[^0-9]/g, ""));
                setError("");
              }}
              keyboardType="number-pad"
              autoFocus
              maxLength={5}
            />
            <Text style={s.unit}>쪽까지</Text>
          </View>

          <Text style={s.hint}>남은 쪽수는 남은 날짜에 자동으로 다시 나눠져요.</Text>
          {!!error && <Text style={s.error}>{error}</Text>}

          <View style={s.buttons}>
            <Pressable style={[s.button, s.cancel]} onPress={onClose} disabled={submitting}>
              <Text style={s.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.button, s.save, pressed && { opacity: 0.85 }]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.saveText}>저장</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31,34,51,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 22 },
  title: { fontSize: 18, fontWeight: "700", color: C.ink, letterSpacing: -0.3 },
  sub: { marginTop: 6, fontSize: 14, color: C.inkSub },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 18, gap: 10 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "700",
    color: C.ink,
  },
  unit: { fontSize: 16, color: C.inkSub },
  hint: { marginTop: 10, fontSize: 12, color: C.inkMute },
  error: { marginTop: 8, fontSize: 13, color: C.danger },
  buttons: { flexDirection: "row", gap: 10, marginTop: 20 },
  button: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: C.primarySoft },
  cancelText: { fontSize: 15, fontWeight: "600", color: C.primary },
  save: { backgroundColor: C.primary },
  saveText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
