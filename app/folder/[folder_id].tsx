import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../components/Header";

interface BookInFolder {
  folder_book_id: string;
  book: {
    book_id: string;
    title: string;
    cover_url: string;
    bookshelves: { bookshelf_id: string; status: number; progress: number }[];
  };
}

interface MyBook {
  bookshelf_id: string;
  book: {
    book_id: string;
    title: string;
    cover_url: string;
  };
}

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const CARD_WIDTH = (width - 56) / COLUMN_COUNT;

export default function FolderDetailScreen() {
  const { folder_id, folder_name } = useLocalSearchParams<{
    folder_id: string;
    folder_name: string;
  }>();

  const [folderBooks, setFolderBooks] = useState<BookInFolder[]>([]);
  const [myBooks, setMyBooks] = useState<MyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchFolderBooks();
  }, []);

  const fetchFolderBooks = async () => {
    try {
      // ✅ authFetch로 교체
      const response = await authFetch(
        `${BASE_URL}/bookshelf/folders/${folder_id}/books`,
      );
      const data = await response.json();
      setFolderBooks(data);
    } catch (error) {
      console.error("폴더 책 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBooks = async () => {
    try {
      // ✅ authFetch로 교체
      const response = await authFetch(`${BASE_URL}/bookshelf`);
      const data = await response.json();
      setMyBooks(data);
    } catch (error) {
      console.error("내 서재 에러:", error);
    }
  };

  const addBookToFolder = async (bookId: string) => {
    // ✅ authFetch로 교체
    await authFetch(`${BASE_URL}/bookshelf/folders/${folder_id}/books`, {
      method: "POST",
      body: JSON.stringify({ book_id: bookId }),
    });
  };

  const closeModal = () => {
    setAddModalVisible(false);
    setSelectedBookIds([]);
  };

  const confirmAddBook = async () => {
    if (selectedBookIds.length === 0) return;
    try {
      await Promise.all(
        selectedBookIds.map((bookId) => addBookToFolder(bookId)),
      );
      setSelectedBookIds([]);
      setAddModalVisible(false);
      fetchFolderBooks();
    } catch (error) {
      console.error("책 추가 에러:", error);
    }
  };

  const toggleBookSelect = (bookId: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId],
    );
  };

  const removeBookFromFolder = async (folderBookId: string) => {
    try {
      await authFetch(
        `${BASE_URL}/bookshelf/folders/${folder_id}/books/${folderBookId}`,
        { method: "DELETE" },
      );
      fetchFolderBooks();
    } catch (error) {
      console.error("책 삭제 에러:", error);
    }
  };

  const deleteFolder = async () => {
    Alert.alert("폴더 삭제", "이 폴더를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await authFetch(`${BASE_URL}/bookshelf/folders/${folder_id}`, {
              method: "DELETE",
            });
            router.back();
          } catch (error) {
            console.error("폴더 삭제 에러:", error);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{folder_name}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {editMode ? (
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Text
                style={{ color: "#4A3B32", fontWeight: "700", fontSize: 14 }}
              >
                완료
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={deleteFolder}>
                <Ionicons name="trash-outline" size={24} color="#E53935" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  fetchMyBooks();
                  setAddModalVisible(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={28} color="#333" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {folderBooks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 책이 없습니다.</Text>
          <Text style={styles.emptySubText}>+ 버튼으로 책을 추가해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={folderBooks}
          keyExtractor={(item) => item.folder_book_id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (editMode) return;
                router.push(
                  `/book/${item.book.bookshelves?.[0]?.bookshelf_id}` as any,
                );
              }}
              onLongPress={() => setEditMode(true)}
            >
              <View style={styles.card}>
                {item.book.bookshelves?.[0]?.status === 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>완독</Text>
                  </View>
                )}
                {editMode && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeBookFromFolder(item.folder_book_id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                  </TouchableOpacity>
                )}
                <Image
                  source={{ uri: item.book.cover_url }}
                  style={styles.bookCover}
                />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {item.book.title}
                </Text>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${item.book.bookshelves?.[0]?.progress ?? 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>책 선택</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={myBooks.filter(
                (myBook) =>
                  !folderBooks.some(
                    (fb) => fb.book.book_id === myBook.book.book_id,
                  ),
              )}
              keyExtractor={(item) => item.bookshelf_id}
              renderItem={({ item }) => {
                const isSelected = selectedBookIds.includes(item.book.book_id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.bookSelectItem,
                      isSelected && styles.bookSelectItemActive,
                    ]}
                    onPress={() => toggleBookSelect(item.book.book_id)}
                  >
                    <Image
                      source={{ uri: item.book.cover_url }}
                      style={styles.selectCover}
                    />
                    <Text style={styles.selectTitle}>{item.book.title}</Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#4A3B32"
                        style={{ marginLeft: "auto" }}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedBookIds.length === 0 && styles.confirmButtonDisabled,
              ]}
              onPress={confirmAddBook}
              disabled={selectedBookIds.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                추가하기
                {selectedBookIds.length > 0
                  ? ` (${selectedBookIds.length})`
                  : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0EFED" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
  emptySubText: { fontSize: 13, color: "#bbb", marginTop: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  columnWrapper: { justifyContent: "flex-start", gap: 12, marginBottom: 16 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bookCover: {
    width: CARD_WIDTH - 24,
    height: (CARD_WIDTH - 24) * 1.45,
    borderRadius: 8,
    backgroundColor: "#E1D9D1",
  },
  bookTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
    width: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#4A3B32",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  deleteBtn: { position: "absolute", top: 6, right: 6, zIndex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  bookSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFED",
  },
  bookSelectItemActive: { backgroundColor: "#F5F0EB" },
  selectCover: {
    width: 44,
    height: 64,
    borderRadius: 4,
    backgroundColor: "#E1D9D1",
    marginRight: 12,
  },
  selectTitle: { fontSize: 14, color: "#333", fontWeight: "600" },
  confirmButton: {
    backgroundColor: "#4A3B32",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  confirmButtonDisabled: { backgroundColor: "#CCC" },
  confirmButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  progressBarBackground: {
    width: "100%",
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C8B84A",
    borderRadius: 3,
  },
});
