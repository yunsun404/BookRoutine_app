// app/reading-goals/book-select.tsx
import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

type Book = {
  book_id: string;
  title: string;
  author: string;
  total_pages: number;
  isbn?: string;
  cover?: string;
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
  danger: "#F2555A",
};

export default function BookSelectScreen() {
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0); // 가장 마지막 검색 결과만 반영하기 위한 번호

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [formError, setFormError] = useState("");

  const [tempTitle, setTempTitle] = useState("");
  const [tempAuthor, setTempAuthor] = useState("");
  const [tempPages, setTempPages] = useState("");
  const [tempIsbn, setTempIsbn] = useState("");
  const [tempBookId, setTempBookId] = useState("");
  const [tempCover, setTempCover] = useState("");

  const openBookModal = () => {
    setTempTitle("");
    setTempAuthor("");
    setTempPages("");
    setTempIsbn("");
    setTempBookId("");
    setTempCover("");
    setSearchResults([]);
    setShowResults(false);
    setSearchError(false);
    setFormError("");
    setBookModalVisible(true);
  };

  // 화면에 처음 들어오면 바로 책 추가 팝업을 띄움
  useEffect(() => {
    openBookModal();
  }, []);

  const applyTempBook = () => {
    if (!tempTitle.trim() || !tempAuthor.trim() || !tempPages.trim()) {
      setFormError("제목, 저자, 쪽수를 모두 입력해주세요.");
      return;
    }

    const pageNumber = Number(tempPages);
    if (Number.isNaN(pageNumber) || pageNumber <= 0) {
      setFormError("쪽수는 숫자로 입력해주세요.");
      return;
    }

    setBook({
      book_id: tempBookId,
      title: tempTitle,
      author: tempAuthor,
      total_pages: pageNumber,
      isbn: tempIsbn,
      cover: tempCover,
    });

    setBookModalVisible(false);
  };

  // 제목을 입력하면 잠깐(0.35초) 기다렸다가 검색 (직접 입력도 가능)
  const onTitleChange = (text: string) => {
    setTempTitle(text);
    setFormError("");
    // 직접 수정하면 검색으로 골랐던 책 정보는 초기화
    setTempBookId("");
    setTempCover("");
    setTempIsbn("");

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (text.trim().length < 2) {
      searchSeq.current++; // 진행 중인 검색 결과는 무시
      setSearchResults([]);
      setShowResults(false);
      setSearchLoading(false);
      setSearchError(false);
      return;
    }

    setShowResults(true);
    setSearchLoading(true);
    setSearchError(false);
    searchTimer.current = setTimeout(() => runSearch(text), 350);
  };

  const runSearch = async (text: string) => {
    const seq = ++searchSeq.current;
    try {
      const res = await authFetch(
        `${BASE_URL}/reading-goals/search?title=${encodeURIComponent(text)}`
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (seq !== searchSeq.current) return; // 더 최신 검색이 있으면 버림
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      if (seq !== searchSeq.current) return;
      console.error("검색 중 에러 발생:", error);
      setSearchResults([]);
      setSearchError(true);
    } finally {
      if (seq === searchSeq.current) setSearchLoading(false);
    }
  };

  // 화면을 떠나면 대기 중인 검색 취소
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const pickResult = (item: any) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchSeq.current++;
    const pages = item.total_pages ?? item.subInfo?.itemPage ?? 0;
    setTempBookId(item.book_id || item.id || item.bookId || "");
    setTempTitle(item.title || "");
    setTempAuthor(item.author || "");
    setTempPages(pages ? String(pages) : "");
    setTempIsbn(item.isbn13 || item.isbn || "");
    setTempCover(item.cover || "");
    setShowResults(false);
    setFormError("");
  };

  const goToPlanScreen = () => {
    if (!book) return;
    router.push({
      pathname: "/reading-goals/reading-plan",
      params: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        total_pages: book.total_pages,
        isbn: book.isbn || "",
        cover: book.cover || "",
      },
    });
  };

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => router.canGoBack() && router.back()}
          hitSlop={8}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={s.headerTitle}>책 등록</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {book ? (
          <>
            <Pressable style={s.changeLink} onPress={openBookModal} hitSlop={6}>
              <Ionicons name="swap-horizontal" size={14} color={C.primary} />
              <Text style={s.changeLinkText}>다른 책으로 변경하기</Text>
            </Pressable>

            <View style={s.card}>
              <View style={s.bookTop}>
                {book.cover ? (
                  <Image source={{ uri: book.cover }} style={s.cover} resizeMode="cover" />
                ) : (
                  <View style={[s.cover, s.coverEmpty]}>
                    <Ionicons name="book-outline" size={26} color={C.primary} />
                  </View>
                )}
                <Text style={s.bookTitle} numberOfLines={3}>{book.title}</Text>
              </View>

              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>저자</Text>
                <Text style={s.infoValue}>{book.author}</Text>
              </View>
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>쪽수</Text>
                <Text style={s.infoValue}>{book.total_pages} P</Text>
              </View>
            </View>
          </>
        ) : (
          <Pressable style={s.emptyCard} onPress={openBookModal}>
            <View style={s.emptyIcon}>
              <Ionicons name="add" size={26} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>읽을 책을 추가해주세요</Text>
            <Text style={s.emptySub}>제목으로 검색하거나 직접 입력할 수 있어요</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.mainButton, !book && s.mainButtonOff, pressed && book && { opacity: 0.85 }]}
          onPress={goToPlanScreen}
          disabled={!book}
        >
          <Text style={s.mainButtonText}>계획 생성하기</Text>
        </Pressable>
      </View>

      {/* 책 추가 팝업 */}
      <Modal transparent visible={bookModalVisible} animationType="fade" onRequestClose={() => setBookModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalBackground}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>책 추가하기</Text>

            {/* 제목 (입력하면 검색) */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>제목</Text>
              <View style={s.inputWrap}>
                <Ionicons name="search" size={16} color={C.inkMute} />
                <TextInput
                  style={s.input}
                  placeholder="제목을 입력하세요."
                  placeholderTextColor={C.inkMute}
                  value={tempTitle}
                  onChangeText={onTitleChange}
                  onFocus={() => tempTitle.trim().length >= 2 && setShowResults(true)}
                  autoFocus
                />
              </View>

              {showResults && (
                <View style={s.dropdown}>
                  {searchLoading ? (
                    <View style={s.dropdownState}>
                      <ActivityIndicator size="small" color={C.primary} />
                      <Text style={s.dropdownStateText}>검색 중</Text>
                    </View>
                  ) : searchError ? (
                    <View style={s.dropdownState}>
                      <Ionicons name="cloud-offline-outline" size={16} color={C.danger} />
                      <Text style={s.dropdownStateText}>
                        서버에 연결할 수 없어요. 백엔드가 켜져 있는지 확인해주세요. 저자와 쪽수를 직접 입력해도 돼요.
                      </Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {searchResults.map((item, index) => (
                        <Pressable
                          key={`${item.book_id || item.id || item.isbn || item.title}-${index}`}
                          style={({ pressed }) => [s.result, pressed && { backgroundColor: C.primarySoft }]}
                          onPress={() => pickResult(item)}
                        >
                          {item.cover ? (
                            <Image source={{ uri: item.cover }} style={s.resultCover} />
                          ) : (
                            <View style={[s.resultCover, { backgroundColor: C.primarySoft }]} />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={s.resultAuthor} numberOfLines={1}>{item.author}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={s.dropdownState}>
                      <Text style={s.dropdownStateText}>검색 결과가 없어요. 저자와 쪽수를 직접 입력해도 돼요.</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 저자 */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>저자</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="저자를 입력하세요."
                  placeholderTextColor={C.inkMute}
                  value={tempAuthor}
                  onChangeText={(v) => {
                    setTempAuthor(v);
                    setFormError("");
                  }}
                  onFocus={() => setShowResults(false)}
                />
              </View>
            </View>

            {/* 쪽수 */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>쪽수</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={C.inkMute}
                  keyboardType="number-pad"
                  value={tempPages}
                  onChangeText={(v) => {
                    setTempPages(v.replace(/[^0-9]/g, ""));
                    setFormError("");
                  }}
                  onFocus={() => setShowResults(false)}
                />
                <Text style={s.unit}>P</Text>
              </View>
            </View>

            {!!formError && <Text style={s.error}>{formError}</Text>}

            <View style={s.modalButtonRow}>
              <Pressable
                style={({ pressed }) => [s.cancelBtn, pressed && { backgroundColor: C.bg }]}
                onPress={() => setBookModalVisible(false)}
              >
                <Text style={s.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.confirmBtn, pressed && { opacity: 0.85 }]}
                onPress={applyTempBook}
              >
                <Text style={s.confirmText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 20, paddingBottom: 120 },

  changeLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: 12 },
  changeLinkText: { fontSize: 13, fontWeight: "700", color: C.primary },

  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 22,
    gap: 18,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bookTop: { flexDirection: "row", gap: 18, alignItems: "flex-start" },
  cover: { width: 96, height: 140, borderRadius: 8, backgroundColor: C.line },
  coverEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: C.primarySoft },
  bookTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4, marginTop: 4 },
  infoBlock: { gap: 4 },
  infoLabel: { fontSize: 12, fontWeight: "600", color: C.inkMute },
  infoValue: { fontSize: 17, fontWeight: "600", color: C.ink },

  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.line,
    borderStyle: "dashed",
    paddingVertical: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub: { fontSize: 13, color: C.inkSub },

  footer: { position: "absolute", left: 20, right: 20, bottom: 28 },
  mainButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  mainButtonOff: { backgroundColor: "#C9CCE0", shadowOpacity: 0, elevation: 0 },
  mainButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  /* 모달 */
  modalBackground: { flex: 1, backgroundColor: "rgba(31,34,51,0.45)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: C.card, borderRadius: 28, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4, marginBottom: 4 },
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

  dropdown: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    overflow: "hidden",
  },
  dropdownState: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  dropdownStateText: { flex: 1, fontSize: 13, color: C.inkSub },
  result: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  resultCover: { width: 30, height: 43, borderRadius: 4, backgroundColor: C.line },
  resultTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  resultAuthor: { fontSize: 12, color: C.inkSub, marginTop: 1 },

  error: { fontSize: 13, fontWeight: "600", color: C.danger },

  modalButtonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
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