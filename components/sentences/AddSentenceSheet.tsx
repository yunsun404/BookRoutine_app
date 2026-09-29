// components/sentences/AddSentenceSheet.tsx
// + 버튼을 누르면 아래에서 올라오는 선택 시트: "촬영해서 수집 / 앨범에서 선택 / 직접 적기"
// 이 컴포넌트는 "무엇을 골랐는지"만 부모에게 알려줍니다. 카메라·OCR 같은 실제 작업은
// 부모(SentenceTab)가 합니다 — 메뉴판은 주문만 받고, 요리는 주방이 하는 구조.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { P } from "@/constants/palette";

export type AddMethod = "camera" | "gallery" | "manual";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: AddMethod) => void;
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const OPTIONS: { method: AddMethod; icon: IoniconsName; title: string; desc: string }[] = [
  { method: "camera", icon: "camera-outline", title: "촬영해서 수집", desc: "책 페이지를 찍으면 문장을 자동으로 읽어와요" },
  { method: "gallery", icon: "image-outline", title: "앨범에서 선택", desc: "이미 찍어둔 사진·캡처에서 문장을 읽어와요" },
  { method: "manual", icon: "create-outline", title: "직접 적기", desc: "마음에 남은 문장을 손으로 옮겨 적어요" },
];

export default function AddSentenceSheet({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* 시트 내부를 눌렀을 때 overlay의 onPress(닫기)로 이벤트가 번지지 않게 막음 */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>문장 수집하기</Text>

          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.method}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: P.primaryTint }]}
              onPress={() => onSelect(opt.method)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={opt.icon} size={22} color={P.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={P.textTertiary} />
            </Pressable>
          ))}

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: P.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: P.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.border,
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "700", color: P.ink, marginBottom: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  optionDesc: { fontSize: 12, color: P.textSecondary, marginTop: 2 },
  cancel: { marginTop: 10, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 15, color: P.textSecondary },
});
