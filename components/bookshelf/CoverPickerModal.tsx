// components/bookshelf/CoverPickerModal.tsx
//
// 책장 폴더의 표지를 고르는 모달.
// "갤러리에서 선택" / "책 표지 검색" 두 탭으로 나뉘어 있고,
// 둘 중 어느 쪽에서 골랐든 최종적으로는 "이미지 URL 문자열" 하나로 통일해서
// onSelect로 넘깁니다. 부모(app/bookshelf.tsx)는 그 URL을
// folder_image로 저장하기만 하면 되고, 그게 갤러리 사진인지 책 표지인지는
// 몰라도 됩니다 — 이게 이 모달의 핵심 설계 의도입니다.
//
// 왜 갤러리 사진도 "로컬 경로"가 아니라 "URL"로 통일하는가:
// FolderItem.folder_image는 서버가 돌려주는 값이라 다른 기기/다른 세션에서도
// 그대로 렌더링돼야 합니다. 이 기기 안에서만 유효한 file:// 경로를 그대로
// 저장하면 다른 기기(또는 앱 재설치 후)에서는 깨진 이미지가 됩니다.
// 그래서 갤러리에서 고른 순간 Supabase Storage에 업로드하고,
// 공개 URL을 받아서 그걸 넘깁니다.
import { authFetch, BASE_URL, getUserId } from "@/constants/api";
import { useInputColors } from "@/hooks/useInputColors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface BookResult {
  book_id?: string;
  title: string;
  author?: string;
  cover?: string;
  isbn?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** 최종 선택된 표지 이미지의 공개 URL */
  onSelect: (imageUrl: string) => void;
}

type Tab = "gallery" | "book";

// 카카오/알라딘 도서 검색은 book-select.tsx가 이미
// `${BASE_URL}/reading-goals/search?title=` 를 통해 백엔드에서 대행하고 있어서,
// 여기서도 그 엔드포인트를 그대로 재사용합니다. 클라이언트에 별도 도서 API 키를
// 심을 필요가 없고, 백엔드가 이미 검증한 응답 포맷(title/author/cover/isbn)을
// 그대로 믿을 수 있기 때문입니다.
const BOOK_SEARCH_ENDPOINT = `${BASE_URL}/reading-goals/search`;
const SEARCH_DEBOUNCE_MS = 400;
// Supabase Storage 버킷 이름. 대시보드에서 이 이름으로 Public 버킷을 만들어야 합니다.
const COVER_BUCKET = "folder-covers";

export default function CoverPickerModal({ visible, onClose, onSelect }: Props) {
  const ic = useInputColors(); // 입력창 글자·placeholder 색 (다크 모드에서도 보이게)
  const [tab, setTab] = useState<Tab>("gallery");
  const [uploading, setUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);

  // 타이핑마다 검색 API를 호출하면 쿼터 낭비 + 응답 역전(race condition) 문제가 생깁니다.
  // 디바운스로 타이핑이 멈춘 뒤에만 요청을 보내고, 요청 토큰으로 "가장 최근 검색어의
  // 결과만" 화면에 반영되도록 막습니다.
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (!visible) {
      // 다음에 다시 열었을 때 이전 검색 결과/탭이 남아있지 않도록 초기화
      setQuery("");
      setResults([]);
      setTab("gallery");
    }
  }, [visible]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const requestId = ++latestRequestId.current;
      setSearching(true);
      try {
        const res = await authFetch(
          `${BOOK_SEARCH_ENDPOINT}?title=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        if (requestId === latestRequestId.current) {
          const list: BookResult[] = Array.isArray(data) ? data : [];
          setResults(list.filter((book) => !!book.cover));
        }
      } catch (error) {
        console.error("표지 검색 에러:", error);
        if (requestId === latestRequestId.current) setResults([]);
      } finally {
        if (requestId === latestRequestId.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "표지로 쓸 사진을 선택하려면 갤러리 접근 권한이 필요해요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      // 책 표지 비율(2:3)에 맞춰 크롭 UI를 띄우면, 갤러리 사진으로 만든 폴더와
      // 책 표지로 만든 폴더가 책장 그리드에서 같은 비율로 나란히 놓입니다.
      aspect: [2, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabase(asset.uri, asset.mimeType);
      onSelect(publicUrl);
      onClose();
    } catch (error) {
      console.error("표지 업로드 에러:", error);
      Alert.alert("업로드 실패", "표지 이미지를 업로드하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const uploadToSupabase = async (uri: string, mimeType?: string | null) => {
    const ext = mimeType?.split("/")[1] ?? uri.split(".").pop() ?? "jpg";
    const userId = await getUserId();
    const path = `${userId || "anon"}/${Date.now()}.${ext}`;

    // expo-file-system 없이도 fetch(uri).arrayBuffer()로 로컬 파일을 바이너리로
    // 읽을 수 있습니다(RN 0.71+ / Hermes 지원). Supabase Storage는 base64 인코딩보다
    // arrayBuffer 업로드를 공식적으로 권장합니다.
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: mimeType ?? `image/${ext}`,
        upsert: false,
      });
    if (error) throw error;

    const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSelectBook = (book: BookResult) => {
    if (!book.cover) return;
    onSelect(book.cover);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>표지 선택</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TabButton
            label="갤러리에서 선택"
            active={tab === "gallery"}
            onPress={() => setTab("gallery")}
          />
          <TabButton
            label="책 표지 검색"
            active={tab === "book"}
            onPress={() => setTab("book")}
          />
        </View>

        {tab === "gallery" ? (
          <View style={styles.galleryTab}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={handlePickFromGallery}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#8B4513" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color="#999" />
                  <Text style={styles.galleryButtonText}>사진 앨범에서 선택</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookTab}>
            <TextInput
              style={[styles.searchInput, { color: ic.text }]}
              placeholderTextColor={ic.placeholder}
              placeholder="책 제목으로 검색 (예: 이기적 유전자)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />

            {searching && <ActivityIndicator style={{ marginTop: 12 }} color="#8B4513" />}

            <FlatList
              data={results}
              keyExtractor={(item, idx) => item.isbn ?? item.book_id ?? `${item.title}-${idx}`}
              numColumns={3}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bookResultItem}
                  onPress={() => handleSelectBook(item)}
                >
                  <Image source={{ uri: item.cover }} style={styles.bookResultCover} />
                  <Text numberOfLines={2} style={styles.bookResultTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !searching && query.trim() ? (
                  <Text style={styles.emptyText}>검색 결과가 없어요. 다른 제목으로 시도해보세요.</Text>
                ) : null
              }
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F0EFED",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  tabButtonActive: { backgroundColor: "#fff" },
  tabButtonText: { color: "#999", fontWeight: "600", fontSize: 13 },
  tabButtonTextActive: { color: "#4A3B32" },
  galleryTab: { flex: 1, paddingHorizontal: 20, paddingTop: 32, alignItems: "center" },
  galleryButton: {
    width: 160,
    height: 240,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderStyle: "dashed",
    backgroundColor: "#FAFAF9",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  galleryButtonText: { color: "#999", fontSize: 13 },
  bookTab: { flex: 1, paddingHorizontal: 20 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  bookResultItem: { flex: 1 / 3, alignItems: "center", padding: 6 },
  bookResultCover: {
    width: 72,
    height: 104,
    borderRadius: 4,
    backgroundColor: "#E1D9D1",
  },
  bookResultTitle: { fontSize: 11, textAlign: "center", marginTop: 4, color: "#333" },
  emptyText: { textAlign: "center", marginTop: 24, color: "#999", fontSize: 13 },
});
