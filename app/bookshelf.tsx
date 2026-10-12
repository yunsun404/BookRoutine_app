import { authFetch, BASE_URL } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import CoverPickerModal from "../components/bookshelf/CoverPickerModal";
import Header from "../components/Header";
import ProfileCard from "../components/ProfileCard";
import styles from "./styles/bookshelf.styles";
import { P } from "@/constants/palette";

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

interface BadgeItem {
  badge_id: string;
  badge_name: string;
  description: string | null;
  acquired_at: string | null;
}

interface FolderItem {
  folder_id: string;
  folder_name: string;
  folder_image?: string | null;
  created_at: string;
  folder_books: {
    book: {
      book_id: string;
      title: string;
      cover_url: string;
    };
  }[];
}

export default function BookshelfScreen() {
  const [books, setBooks] = useState<BookshelfItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"bookshelf" | "badge">(
    "bookshelf",
  );
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderImage, setFolderImage] = useState<string>("");
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [badgesLoading, setBadgesLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  // 폴더 상세 화면에서 표지를 바꾸고 뒤로 돌아왔을 때, 여기 그리드에도 바로
  // 반영되도록 "화면이 다시 보일 때마다" 폴더 목록을 새로 불러옵니다.
  // 마운트 시 한 번만 도는 useEffect였다면, 뒤로가기 했을 때 여전히 예전 표지가
  // 보이다가 앱을 완전히 재시작해야만 바뀐 게 보였을 거예요.
  useFocusEffect(
    useCallback(() => {
      fetchFolders();
    }, []),
  );

  const fetchBooks = async () => {
    try {
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
      const response = await authFetch(`${BASE_URL}/bookshelf/folders`);
      const data = await response.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("폴더 에러:", error);
      setFolders([]);
    }
  };

  const fetchBadges = async () => {
    setBadgesLoading(true);
    try {
      const response = await authFetch(`${BASE_URL}/badges`);
      const data = await response.json();
      setBadges(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("뱃지 에러:", error);
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "badge") fetchBadges();
  }, [activeTab]);

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
      await authFetch(`${BASE_URL}/bookshelf/folders`, {
        method: "POST",
        // folder_image는 GET /bookshelf/folders 응답에 이미 존재하는 필드라
        // 같은 이름으로 보냅니다. 백엔드 생성 API가 아직 이 필드를 안 받고 있다면
        // 이 부분만큼은 서버 쪽도 같이 확인해주세요.
        body: JSON.stringify({
          folder_name: folderName,
          folder_image: folderImage || undefined,
        }),
      });
      setFolderName("");
      setFolderImage("");
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
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ProfileCard />

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
          style={activeTab === "badge" ? styles.tabActive : styles.tabInactive}
          onPress={() => setActiveTab("badge")}
        >
          <Text
            style={
              activeTab === "badge"
                ? styles.tabActiveText
                : styles.tabInactiveText
            }
          >
            내 뱃지 보기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 책장 */}
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
                    `/folder/${item.data.folder_id}?folder_name=${encodeURIComponent(item.data.folder_name)}&folder_image=${encodeURIComponent(item.data.folder_image ?? "")}` as any,
                  )
                }
              >
                {item.data.folder_image ? (
                  <>
                    <Image
                      source={{ uri: item.data.folder_image }}
                      style={styles.folderCoverImage}
                    />
                    {/* 표지 사진 위에 이름/권수를 바로 얹으면 텍스트가 사진에 묻히니,
                          어두운 그라데이션 대신 하단에 반투명 바를 깔아 항상 읽히게 합니다. */}
                    <View style={styles.folderCoverOverlay}>
                      <Text style={styles.folderNameOnCover} numberOfLines={1}>
                        {item.data.folder_name}
                      </Text>
                      <Text style={styles.folderCountOnCover}>
                        {item.data.folder_books.length}권
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.folderName}>
                      {item.data.folder_name}
                    </Text>
                    <Text style={styles.folderCount}>
                      {item.data.folder_books.length}권
                    </Text>
                  </>
                )}
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

      {/* 폴더 생성 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>폴더 표지</Text>
            {/* 표지 미리보기를 누르면 CoverPickerModal이 열립니다. 표지 값 자체는
                여기(folderImage)가 아니라 그 모달이 소유하지 않고, 선택 결과(URL)만
                onSelect로 받아서 이 컴포넌트 state에 반영합니다. */}
            <TouchableOpacity
              style={styles.coverPickerButton}
              onPress={() => setCoverPickerVisible(true)}
            >
              {folderImage ? (
                <Image
                  source={{ uri: folderImage }}
                  style={styles.coverPickerPreview}
                />
              ) : (
                <Text style={styles.coverPickerPlaceholder}>
                  + 표지{"\n"}선택
                </Text>
              )}
            </TouchableOpacity>

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

      <CoverPickerModal
        visible={coverPickerVisible}
        onClose={() => setCoverPickerVisible(false)}
        onSelect={setFolderImage}
      />

      {/* 뱃지 */}
      {activeTab === "badge" &&
        (badgesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#8B4513" />
          </View>
        ) : (
          <FlatList
            data={[...badges].sort(
              (a, b) => Number(!!b.acquired_at) - Number(!!a.acquired_at),
            )}
            keyExtractor={(item) => item.badge_id}
            contentContainerStyle={styles.badgeListContent}
            renderItem={({ item }) => {
              const acquired = !!item.acquired_at;
              return (
                <View
                  style={[styles.badgeCard, !acquired && styles.badgeCardLocked]}
                >
                  <View
                    style={[
                      styles.badgeIconCircle,
                      !acquired && styles.badgeIconCircleLocked,
                    ]}
                  >
                    <Ionicons
                      name="ribbon"
                      size={28}
                      color={acquired ? "#C8B84A" : "#B5B5B5"}
                    />
                  </View>
                  <View style={styles.badgeInfo}>
                    <Text
                      style={[styles.badgeName, !acquired && styles.badgeNameLocked]}
                    >
                      {item.badge_name}
                    </Text>
                    <Text
                      style={[
                        styles.badgeDescription,
                        !acquired && styles.badgeDescriptionLocked,
                      ]}
                    >
                      {item.description ?? ""}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              <View style={[styles.badgeCard, styles.badgeCardLocked]}>
                <View style={[styles.badgeIconCircle, styles.badgeIconCircleLocked]}>
                  <Ionicons name="help" size={28} color="#B5B5B5" />
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeName}>???</Text>
                  <Text style={styles.badgeDescription}>
                    (계속 찾아보세요)
                  </Text>
                </View>
              </View>
            }
          />
        ))}
    </View>
  );
}
