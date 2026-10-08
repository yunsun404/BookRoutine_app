import { Colors } from "@/constants/tokens";
import { groupApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  //router,
  useRouter,
} from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Header from "../../components/Header";



type ViewMode = "LIST" | "FEED";

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

interface Post {
  id: string;
  username: string;
  date: string;
  bookTitle: string;
  quote: string;
  likes: number;
}

// ── 컴포넌트 ───────────────────────────────────────────────────────
export default function GroupScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // 그룹 목록 조회
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"LIST" | "FEED">("LIST");

  // 그룹 피드 (API 연동 전 임시 빈 배열)
  const [posts, setPosts] = useState<Post[]>([]);

  // ── 팝업 상태 ────────────────────────────────────────────────────
  const [modalType, setModalType] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [searchTitle, setSearchTitle] = useState('');
  const [searchResults, setSearchResults] = useState<{
    book_id: string;
    isbn?: string;
    title: string;
    author?: string;
    total_pages?: number;
    cover_url?: string;
  }[]>([]);
  const [selectedBook, setSelectedBook] = useState<typeof searchResults[0] | null>(null);
  const [maxPeople, setMaxPeople] = useState<number | undefined>(undefined);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // ── API ──────────────────────────────────────────────────────────
  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      const result = await groupApi.getList();
      // API 응답 형태를 Group 타입에 맞게 변환
      const formatted = result.map((g: any) => ({
        id: g.group_id,
        name: g.group_name,
        memberCount: g._count.group_members ?? 0,
      }));
      setGroups(formatted);
    } catch (e) {
      console.error("그룹 목록 조회 실패:", e);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // 그룹 생성
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    if (!selectedBook) { Alert.alert('목표 도서를 선택해주세요.'); return; }
    try {
      setModalLoading(true);
      console.log('searchTitle:', searchTitle);
      console.log('selectedBookId:', selectedBook);
      const result = await groupApi.create({
        group_name: groupName.trim(),
        people_count: maxPeople ?? undefined,
        isbn: selectedBook?.isbn ?? undefined,
        title: selectedBook?.title,
        author: selectedBook?.author,
        total_pages: selectedBook?.total_pages,
        cover_url: selectedBook?.cover_url,
        target_date: targetDate ?? undefined
      });
      console.log('bookTitle: ', bookTitle);
      console.log('book_id: ', result.new_group_book?.book_id);
      setModalType(null);
      setGroupName("");
      router.push(`/groupdetail?group_id=${result.new_group_member.group_id}`);
    } catch (e) {
      console.error("그룹 생성 실패:", e);
    } finally {
      setModalLoading(false);
    }
  };

  // 책 검색
  const handleSearch = async (text: string) => {
    setSearchTitle(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await groupApi.searchBooks(text);
      setSearchResults(results);
    } catch (error) {
      console.error('검색 오류:', error);
    }
  }

  // 그룹 가입
  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    try {
      setModalLoading(true);
      const result = await groupApi.joinGroup({ invite_code: inviteCode.trim() });
      setModalType(null);
      setInviteCode("");
      router.push(`/groupdetail?group_id=${result.group_id}`);
    } catch (e) {
      console.error("그룹 가입 실패:", e);
    } finally {
      setModalLoading(false);
    }
  };

  // 팝업 닫기 (입력값 초기화 포함)
  const closeModal = () => {
    setModalType(null);
    setGroupName("");
    setBookTitle("");
    setMaxPeople(undefined);
    setTargetDate(undefined);
    setInviteCode("");
  };


  // 독서방 화면으로 이동하면서 데이터(방 이름) 전달
  const handleEnterRoom = () => {
    if (!selectedGroup) return;
    router.push({
      pathname: "/reading-room",
      params: { roomId: selectedGroup.id, roomName: selectedGroup.name },
    });
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* --- [모드 1] 그룹 목록 화면 --- 
      {viewMode === "LIST" && (
        <ScrollView contentContainerStyle={styles.centerContent}>
          <Text style={styles.sectionTitle}>내 그룹 목록</Text>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => handleGroupPress(group)}
            >
              <View style={styles.groupInfo}>
                <Ionicons name="people" size={24} color="#1a1a1a" />
                <Text style={styles.groupName}>{group.name}</Text>
              </View>
              <Text style={styles.memberCount}>{group.memberCount}명 참여 중</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}*/}

      {/* --- [모드 2] 그룹 피드 화면 --- 
      {viewMode === "FEED" && selectedGroup && (
        <View style={{ flex: 1 }}>
          <View style={styles.titleHeader}>
            <TouchableOpacity onPress={() => setViewMode("LIST")} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedGroup.name}</Text>
*/}
      {/* 🔴 새 페이지로 네비게이션 트리거 
            <TouchableOpacity style={styles.cameraIconButton} onPress={handleEnterRoom}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.feedContent}>
            {posts.map((post) => (
              <View key={post.id} style={styles.feedCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.userInfoRow}>
                    <View style={styles.profilePlaceholder} />
                    <View>
                      <Text style={styles.usernameText}>{post.username}</Text>
                      <Text style={styles.bookTag}>“ {post.bookTitle} ”</Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{(post.date).toString().split('T')[0]}</Text>
                  <Text>❤️{post.likes ?? 0}</Text>
                </View>
                <Text style={styles.quoteText}>{post.quote}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
*/}
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>그룹</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setModalType("create")}
          >
            <Ionicons name="add" size={16} color="#333" />
            <Text style={styles.headerBtnText}>만들기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtnFilled}
            onPress={() => setModalType("join")}
          >
            <Ionicons name="enter-outline" size={16} color="#333" />
            <Text style={styles.headerBtnFilledText}>참여</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {(["LIST", "FEED"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === "LIST" ? "그룹 목록" : "피드"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      {activeTab === "LIST" ? (
        groupsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() =>
                  router.push(`/groupdetail?group_id=${item.id}`)
                }
              >
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>
                    멤버 {item.memberCount}명
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                참여 중인 그룹이 없습니다.{"\n"}그룹을 만들거나 참여해보세요.
              </Text>
            }
          />
        )
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>피드가 없습니다.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <Text style={styles.postUser}>{item.username}</Text>
              <Text style={styles.postBook}>📖 {item.bookTitle}</Text>
              <Text style={styles.postQuote}>{item.quote}</Text>
              <Text style={styles.postDate}>{item.date}</Text>
            </View>
          )}
        />
      )}

      {/* ── 팝업 (생성 / 가입 공통) ──────────────────────────────── */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              {modalType === "create" ? "그룹 만들기" : "코드로 참여"}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={
                modalType === "create" ? "그룹 이름" : "초대 코드"
              }
              value={modalType === "create" ? groupName : inviteCode}
              onChangeText={
                modalType === "create" ? setGroupName : setInviteCode
              }
              autoFocus
            />
            {/* {modalType === "create" && (
              <TextInput
                style={styles.modalInput}
                placeholder="목표 도서 (선택)"
                value={bookTitle}
                onChangeText={setBookTitle}
              />
            )} */}
            {modalType === "create" && (
              <View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="목표 도서 (필수)"
                  value={searchTitle}
                  onChangeText={handleSearch}
                />
                <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled>
                  {searchResults.map((book) => {
                    return (
                      <TouchableOpacity
                        style={[styles.searchResult,
                        selectedBook === book && { backgroundColor: 'gray' }]}
                        key={book.book_id}
                        onPress={() => {
                          console.log('선택한 책:', book);
                          console.log('선택한 book_id:', book.book_id);
                          setSelectedBook(book);
                          setSearchTitle(book.title)
                        }}
                      >
                        <Text style={styles.searchResultTitle}>{book.title}</Text>
                        <Text style={styles.searchResultAuthor}>{book.author}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {modalType === "create" && (
              <TextInput
                style={styles.modalInput}
                placeholder="최대 인원 (선택)"
                keyboardType="number-pad"
                value={maxPeople !== undefined ? String(maxPeople) : ""}
                onChangeText={(v) => setMaxPeople(v ? Number(v) : undefined)}
              />
            )}
            {modalType === "create" && (
              <>
                <TouchableOpacity
                  style={styles.modalInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: targetDate ? "#111" : "#aaa", fontSize: 15 }}>
                    {targetDate ? targetDate.toISOString().split("T")[0] : "목표 날짜 (선택)"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={targetDate ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={(_, selected) => {
                      setShowDatePicker(false);
                      if (selected) setTargetDate(selected);
                    }}
                  />
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeModal}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={
                  modalType === "create"
                    ? handleCreateGroup
                    : handleJoinGroup
                }
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {modalType === "create" ? "만들기" : "참여하기"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F8", paddingBottom: 10 },
  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  headerBtnText: {
    fontSize: 13,
    color: "#333",
  },
  headerBtnFilled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#6C63FF",
  },
  headerBtnFilledText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },

  // 탭
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  activeTab: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },
  tabText: {
    fontSize: 14,
    color: "#aaa",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },

  // 리스트
  listContent: {
    padding: 20,
    gap: 12,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderColor: "#fff",
    gap: 12,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  groupMeta: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  // 피드
  postCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
  },
  postUser: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  postBook: {
    fontSize: 13,
    color: "#666",
  },
  postQuote: {
    fontSize: 14,
    color: "#111",
    lineHeight: 20,
  },
  postDate: {
    fontSize: 12,
    color: "#aaa",
  },

  // 빈 화면
  emptyText: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 60,
  },

  // 팝업
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    outlineColor: "#6C63FF",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    color: "#666",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#6C63FF",
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
  },
  searchResult: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  searchResultAuthor: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  centerContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: "#1a1a1a" },
  // groupCard: {
  //   flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  //   padding: 18, backgroundColor: "#f9f9f9", borderRadius: 12, marginBottom: 12,
  //   borderWidth: 1, borderColor: "#eaeaea",
  // },
  // groupInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  // groupName: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  memberCount: { fontSize: 14, color: "#a0a0a0" },
  titleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  backButton: { padding: 4 },
  //headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a" },
  cameraIconButton: {
    backgroundColor: "#e53935", width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center", elevation: 2,
  },
  feedContent: { padding: 16 },
  feedCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#b0b0b0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  userInfoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  profilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc" },
  usernameText: { fontSize: 15, fontWeight: "bold", color: "#000" },
  bookTag: { fontSize: 13, color: "#555", marginTop: 2 },
  dateText: { fontSize: 12, color: "#777" },
  quoteText: { fontSize: 14, lineHeight: 20, color: "#222" },
});