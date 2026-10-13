// components/sentences/SentenceCard.tsx
// 모아둔 문장 하나를 보여주는 카드. 탭 → 수정, 길게 누르기 → 삭제, 🖼 버튼 → 문장 이미지 만들기.
import type { Sentence } from "@/constants/sentenceApi";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { P } from "@/constants/palette";

type Props = {
  sentence: Sentence;
  onPress: (sentence: Sentence) => void;
  onLongPress: (sentence: Sentence) => void;
  onImagePress?: (sentence: Sentence) => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd}`;
}

export default function SentenceCard({ sentence, onPress, onLongPress, onImagePress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(sentence)}
      onLongPress={() => onLongPress(sentence)}
      delayLongPress={350}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.quoteMark}>“</Text>
      <Text style={styles.content}>{sentence.content}</Text>

      {sentence.memo ? (
        <View style={styles.memoBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={P.textSecondary} />
          <Text style={styles.memoText}>{sentence.memo}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {sentence.page != null && <Text style={styles.page}>p.{sentence.page}</Text>}
        <Text style={styles.date}>{formatDate(sentence.created_at)}</Text>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={sentence.source === "OCR" ? "camera-outline" : "create-outline"}
          size={14}
          color={P.textTertiary}
        />
        {onImagePress && (
          // 카드(Pressable) 안의 Pressable: 안쪽 버튼이 터치를 먼저 가져가서
          // 이미지 버튼을 눌러도 카드의 "수정" 동작은 실행되지 않습니다.
          <Pressable
            onPress={() => onImagePress(sentence)}
            hitSlop={8}
            style={styles.imageButton}
            accessibilityLabel="문장 이미지 만들기"
          >
            <Ionicons name="image-outline" size={15} color={P.primary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: P.bg,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: P.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.7 },
  quoteMark: {
    fontSize: 28,
    lineHeight: 28,
    color: P.accent,
    fontWeight: "700",
    marginBottom: -4,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    color: P.ink,
  },
  memoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    backgroundColor: P.lavenderTint,
    borderRadius: 8,
    padding: 8,
  },
  memoText: { flex: 1, fontSize: 13, lineHeight: 19, color: P.textSecondary },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  page: { fontSize: 12, fontWeight: "700", color: P.primary },
  date: { fontSize: 12, color: P.textTertiary },
  imageButton: {
    marginLeft: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
});
