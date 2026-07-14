import { authFetch, BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../components/Header";
import styles from "./styles/bookshelf.styles";

interface BookshelfItem {
  bookshelf_id: string;
  progress: number;
  created_at: string;
  status: number;
  book: {
    title: string;
    cover_url: string;
  };
}

interface UserProfile {
  nickname: string;
  age: number;
  profile_image: string;
}

interface FolderItem {
  folder_id: string;
  folder_name: string;
  folder_image?: string;
  created_at: string;
  folder_books: {
    book: {
      book_id: string;
      title: string;
      cover_url: string;
    };
  }[];
}

const formatAge = (age: number) => {
  if (age >= 10 && age < 20) return "10대";
  if (age >= 20 && age < 30) return "20대";
  if (age >= 30 && age < 40) return "30대";
  if (age >= 40 && age < 50) return "40대";
  if (age >= 50 && age < 60) return "50대";
  return `${age}대`;
};

export default function BookshelfScreen() {
  const [books, setBooks] = useState<BookshelfItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"bookshelf" | "garden">(
    "bookshelf",
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuthStore();    // 프로필을 store에서 바로 가져오기

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [folderName, setFolderName] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchBooks();
    fetchFolders();
  }, []);

  // ✅ supabase 직접 호출 제거 — user API로 교체
  const fetchProfile = async () => {
    try {
      const response = await authFetch(`${BASE_URL}/users/me`);
      const data = await response.json();
      if (data) setProfile(data);
    } catch (error) {
      console.error("프로필 에러:", error);
    }
  };

  const fetchBooks = async () => {
    try {
      // ✅ authFetch로 교체
      const response = await authFetch(`${BASE_URL}/bookshelf`);
      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("에러:", error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      // ✅ authFetch로 교체
      const response = await authFetch(`${BASE_URL}/bookshelf/folders`);
      const data = await response.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("폴더 에러:", error);
      setFolders([]);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    try {
      // ✅ authFetch로 교체
      await authFetch(`${BASE_URL}/bookshelf/folders`, {
        method: "POST",
        body: JSON.stringify({ folder_name: folderName }),
      });
      setFolderName("");
      setModalVisible(false);
      fetchFolders();
    } catch (error) {
      console.error("폴더 생성 에러:", error);
    }
  };

  const renderBookItem = ({ item }: { item: BookshelfItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/book/${item.bookshelf_id}` as any)}
    >
      <View style={styles.card}>
        {item.status === 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>완독</Text>
          </View>
        )}
        <Image source={{ uri: item.book.cover_url }} style={styles.bookCover} />
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.book.title}
        </Text>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${item.progress}%` }]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {/* 프로필 */}
      <View style={styles.profileRow}>
        <Image
          source={
            user?.profile_image
              ? { uri: user.profile_image }
              : { uri: "https://via.placeholder.com/64" }
          }
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.nickname}>{user?.nickname ?? "닉네임"}</Text>
          <Text style={styles.ageGroup}>
            {user?.age ? formatAge(user.age) : "-"}
          </Text>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={
            activeTab === "bookshelf" ? styles.tabActive : styles.tabInactive
          }
          onPress={() => setActiveTab("bookshelf")}
        >
          <Text
            style={
              activeTab === "bookshelf"
                ? styles.tabActiveText
                : styles.tabInactiveText
            }
          >
            내 책장 보기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={activeTab === "garden" ? styles.tabActive : styles.tabInactive}
          onPress={() => setActiveTab("garden")}
        >
          <Text
            style={
              activeTab === "garden"
                ? styles.tabActiveText
                : styles.tabInactiveText
            }
          >
            내 잔디 도감
          </Text>
        </TouchableOpacity>
      </View>

      {/* 책장 */}
      {activeTab === "bookshelf" && (
        <FlatList
          data={[
            ...books.map((b) => ({ type: "book" as const, data: b })),
            ...folders.map((f) => ({ type: "folder" as const, data: f })),
            { type: "add" as const, data: null },
          ]}
          keyExtractor={(item) =>
            item.type === "book"
              ? item.data.bookshelf_id
              : item.type === "folder"
                ? item.data.folder_id
                : "add"
          }
          numColumns={3}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => {
            if (item.type === "book") {
              return renderBookItem({ item: item.data });
            }
            if (item.type === "folder") {
              return (
                <TouchableOpacity
                  style={styles.folderCard}
                  onPress={() =>
                    router.push(
                      `/folder/${item.data.folder_id}?folder_name=${encodeURIComponent(item.data.folder_name)}` as any,
                    )
                  }
                >
                  <Text style={styles.folderName}>{item.data.folder_name}</Text>
                  <Text style={styles.folderCount}>
                    {item.data.folder_books.length}권
                  </Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.addFolderCard}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addFolderText}>+</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 폴더 생성 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>폴더 이름</Text>
            <TextInput
              style={styles.modalInput}
              value={folderName}
              onChangeText={setFolderName}
              placeholder="폴더 이름 입력"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={createFolder}
              >
                <Text style={styles.modalConfirmText}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 잔디 도감 */}
      {activeTab === "garden" && (
        <View style={styles.center}>
          <Text style={{ color: "#999" }}>잔디 도감 준비 중</Text>
        </View>
      )}
    </View>
  );
}
