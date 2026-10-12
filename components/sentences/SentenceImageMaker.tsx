// components/sentences/SentenceImageMaker.tsx
// 모은 문장을 "사진 위에 얹은 이미지"로 만들어 갤러리에 저장하는 전체 화면 모달.
//
// 원리: 화면에 보이는 미리보기 View(캔버스) 자체를 react-native-view-shot으로 "찰칵" 찍어서
// 이미지 파일로 만듭니다. 미리보기 = 결과물이라, 보이는 그대로 저장돼요 (WYSIWYG).
// 서버에서 이미지를 합성할 필요가 없어서 서버 비용·업로드 시간이 0입니다.
import { P } from "@/constants/palette";
import type { Sentence } from "@/constants/sentenceApi";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

type TextColor = "white" | "black";
type SizeKey = "S" | "M" | "L";

const SIZE_OPTIONS: { key: SizeKey; label: string; base: number }[] = [
  { key: "S", label: "작게", base: 15 },
  { key: "M", label: "중간", base: 19 },
  { key: "L", label: "크게", base: 24 },
];

// 저장 해상도: 4:5 세로 비율(인스타 피드 규격) 1080×1350.
// 화면의 캔버스는 폭이 350px 남짓이라 그대로 찍으면 흐릿해지므로,
// captureRef에 width/height를 지정해 고해상도로 다시 그려서 저장합니다.
const EXPORT_W = 1080;
const EXPORT_H = 1350;

type Props = {
  visible: boolean;
  sentence: Sentence | null;
  bookTitle?: string;
  bookAuthor?: string | null;
  onClose: () => void;
};

// 알라딘 저자 표기 "싱숑 (지은이)" → "싱숑" (괄호 속 역할 표기 제거)
function cleanAuthor(author?: string | null) {
  return (author ?? "").replace(/\s*\([^)]*\)/g, "").trim();
}

export default function SentenceImageMaker({
  visible,
  sentence,
  bookTitle,
  bookAuthor,
  onClose,
}: Props) {
  const canvasRef = useRef<View>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [textColor, setTextColor] = useState<TextColor>("white");
  const [size, setSize] = useState<SizeKey>("M");
  const [dim, setDim] = useState(true);
  const [saving, setSaving] = useState(false);

  // 다른 문장으로 열 때마다 사진은 비우고 시작 (색·크기 취향은 유지)
  useEffect(() => {
    if (visible) setPhotoUri(null);
  }, [visible, sentence?.sentence_id]);

  // 글자 크기 = 사용자가 고른 크기 × 문장 길이 보정
  // 긴 문장을 "크게"로 고르면 캔버스를 넘칠 수 있어서, 길수록 조금씩 줄여줍니다.
  const fontSize = useMemo(() => {
    const base = SIZE_OPTIONS.find((o) => o.key === size)!.base;
    const len = sentence?.content.length ?? 0;
    const factor = len > 220 ? 0.72 : len > 140 ? 0.82 : len > 80 ? 0.92 : 1;
    return Math.round(base * factor);
  }, [size, sentence?.content]);

  if (!sentence) return null;

  const author = cleanAuthor(bookAuthor);
  const sourceLine = [
    bookTitle ? `『${bookTitle}』` : null,
    author || null,
    sentence.page != null ? `p.${sentence.page}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const fg = textColor === "white" ? "#FFFFFF" : "#1A1A1A";
  // 어떤 사진이든 글자가 읽히도록, 글자 색의 "반대색"으로 사진 위에 반투명 막을 깝니다.
  const scrim =
    textColor === "white" ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.5)";
  const plainBg = textColor === "white" ? P.ink : "#F3F1EC"; // 사진이 없을 때 배경

  // ───────── 배경 사진 고르기 ─────────
  const pickPhoto = async (method: "camera" | "gallery") => {
    const perm =
      method === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "권한 필요",
        method === "camera"
          ? "카메라 권한이 필요해요."
          : "앨범 접근 권한이 필요해요.",
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5], // 캔버스 비율과 맞춰 자르기 (iOS는 정사각형 자르기만 지원)
      quality: 0.9,
    };
    const result =
      method === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0])
      setPhotoUri(result.assets[0].uri);
  };

  // ───────── 저장 ─────────
  const handleSave = async () => {
    if (!canvasRef.current) return;
    setSaving(true);
    try {
      if (Platform.OS === "web") {
        // 웹: 갤러리가 없으니 브라우저 다운로드로 대체
        const dataUri = await captureRef(canvasRef, {
          format: "png",
          result: "data-uri",
          width: EXPORT_W,
          height: EXPORT_H,
        });
        const doc = (globalThis as any).document;
        const a = doc.createElement("a");
        a.href = dataUri;
        a.download = `bookroutine-sentence-${Date.now()}.png`;
        a.click();
        return;
      }

      // writeOnly=true: "사진 저장"만 필요하므로 앨범 전체 읽기 권한까지 요구하지 않음
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert(
          "권한 필요",
          "이미지를 저장하려면 사진 저장 권한이 필요해요.",
        );
        return;
      }

      // 사진 배경이라 PNG보다 JPG가 용량이 훨씬 작습니다 (1080×1350 기준 수 MB → 수백 KB)
      const uri = await captureRef(canvasRef, {
        format: "jpg",
        quality: 0.92,
        width: EXPORT_W,
        height: EXPORT_H,
        result: "tmpfile",
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("저장 완료", "갤러리에 문장 이미지를 저장했어요.");
    } catch (e: any) {
      console.error("문장 이미지 저장 실패:", e);
      Alert.alert(
        "저장 실패",
        Platform.OS === "web"
          ? "웹에서는 이미지 저장이 제한될 수 있어요. 앱에서 다시 시도해주세요."
          : (e?.message ?? "잠시 후 다시 시도해주세요."),
      );
    } finally {
      setSaving(false);
    }
  };

  const shadow =
    textColor === "white"
      ? {
          textShadowColor: "rgba(0,0,0,0.35)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }
      : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={P.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>문장 이미지</Text>
          <Pressable onPress={handleSave} disabled={saving} hitSlop={10}>
            {saving ? (
              <ActivityIndicator color={P.primary} />
            ) : (
              <Text style={styles.saveText}>저장</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* ───── 캔버스: 이 View가 그대로 이미지가 됩니다 ───── */}
          {/* collapsable={false}: Android가 "보이는 효과 없는 View"를 최적화로 없애버리면
              captureRef가 찍을 대상을 못 찾으므로, 실제 네이티브 View로 남겨두라는 표시 */}
          <View ref={canvasRef} collapsable={false} style={styles.canvas}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: plainBg }]}
              />
            )}
            {photoUri && dim && (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
              />
            )}

            <View style={styles.textArea}>
              <Text
                style={[
                  styles.quoteMark,
                  { color: fg, fontSize: fontSize * 1.8 },
                  shadow,
                ]}
              >
                “
              </Text>
              <Text
                style={[
                  styles.sentence,
                  {
                    color: fg,
                    fontSize,
                    lineHeight: Math.round(fontSize * 1.6),
                  },
                  shadow,
                ]}
              >
                {sentence.content}
              </Text>
              {sourceLine ? (
                <Text
                  style={[
                    styles.source,
                    {
                      color: fg,
                      fontSize: Math.max(11, Math.round(fontSize * 0.62)),
                    },
                    shadow,
                  ]}
                >
                  {sourceLine}
                </Text>
              ) : null}
            </View>

            <Text style={[styles.watermark, { color: fg }]}>BookRoutine</Text>
          </View>

          {/* ───── 배경 사진 ───── */}
          <Text style={styles.label}>배경 사진</Text>
          <View style={styles.row}>
            <OptionButton
              icon="camera-outline"
              label="촬영"
              onPress={() => pickPhoto("camera")}
            />
            <OptionButton
              icon="image-outline"
              label="앨범"
              onPress={() => pickPhoto("gallery")}
            />
            {photoUri && (
              <OptionButton
                icon="trash-outline"
                label="지우기"
                onPress={() => setPhotoUri(null)}
              />
            )}
          </View>

          {/* ───── 글자 색 ───── */}
          <Text style={styles.label}>글자 색</Text>
          <View style={styles.row}>
            {(["black", "white"] as TextColor[]).map((c) => {
              const active = textColor === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setTextColor(c)}
                  style={[
                    styles.colorOption,
                    active && styles.colorOptionActive,
                  ]}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: c === "white" ? "#FFFFFF" : "#1A1A1A",
                      },
                      c === "white" && {
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {c === "white" ? "흰색" : "검정"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ───── 글자 크기 ───── */}
          <Text style={styles.label}>글자 크기</Text>
          <View style={styles.segment}>
            {SIZE_OPTIONS.map((o) => {
              const active = size === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setSize(o.key)}
                  style={[
                    styles.segmentItem,
                    active && styles.segmentItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ───── 가독성 ───── */}
          {photoUri && (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelInline}>배경 흐리게</Text>
                <Text style={styles.hint}>
                  사진이 밝거나 복잡해도 글자가 잘 보이게 해요
                </Text>
              </View>
              <Switch
                value={dim}
                onValueChange={setDim}
                trackColor={{ true: P.primary, false: P.disabled }}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function OptionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={18} color={P.primary} />
      <Text style={styles.optionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: P.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: P.ink },
  saveText: { fontSize: 16, fontWeight: "700", color: P.primary },
  body: { padding: 20, paddingBottom: 60 },

  // 캔버스 (모서리를 둥글게 하지 않음: 둥글게 하면 저장 이미지의 네 귀퉁이가 투명/검정으로 남음)
  canvas: {
    width: "100%",
    aspectRatio: 4 / 5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.ink,
  },
  textArea: { width: "100%", paddingHorizontal: "11%", alignItems: "center" },
  quoteMark: { fontWeight: "700", opacity: 0.8, marginBottom: -6 },
  sentence: { textAlign: "center", fontWeight: "500" },
  source: { marginTop: 18, textAlign: "center", opacity: 0.85 },
  watermark: {
    position: "absolute",
    right: 12,
    bottom: 10,
    fontSize: 9,
    opacity: 0.55,
    letterSpacing: 0.5,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: P.ink,
    marginTop: 22,
    marginBottom: 10,
  },
  labelInline: { fontSize: 14, fontWeight: "700", color: P.ink },
  hint: { fontSize: 12, color: P.textSecondary, marginTop: 2 },
  row: { flexDirection: "row", gap: 10 },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: P.primaryTint,
  },
  optionButtonText: { fontSize: 14, fontWeight: "600", color: P.primary },

  colorOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: P.border,
  },
  colorOptionActive: { borderColor: P.primary, backgroundColor: P.primaryTint },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  optionText: { fontSize: 14, color: P.textSecondary, fontWeight: "600" },
  optionTextActive: { color: P.primary },

  segment: {
    flexDirection: "row",
    backgroundColor: P.bg,
    borderRadius: 12,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: P.surface,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: "600", color: P.textTertiary },
  segmentTextActive: { color: P.primary },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    gap: 12,
  },
});
