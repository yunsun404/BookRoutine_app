import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router"; // ← 에포 라우터 이동 도구 추가
import React, { useState } from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
}

export default function GroupScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const mockGroups: Group[] = [
    { id: "group_1", name: "홍길동과 친구들", memberCount: 5 },
    { id: "group_2", name: "알고리즘 스터디방", memberCount: 3 },
    { id: "group_3", name: "매일 독서 30분", memberCount: 8 },
  ];

  const mockPosts: Post[] = [
    {
      id: "p1",
      username: "hongildong1",
      date: "2026-04-30",
      bookTitle: "데미안",
      quote: "“내 속에서 솟아 나오려는 것, 바로 그것을 나는 살아보려 했다. 왜 그것이 그토록 어려웠을까.”",
    },
    {
      id: "p2",
      username: "hongildong2",
      date: "2026-04-30",
      bookTitle: "데미안",
      quote: "“가장 중요한 것은 눈에 보이지 않아” 이 문장이 책의 전체 내용을 얘기하고 있는 것 같아 읽자마자 집중할 수 있었다.",
    },
  ];

  const handleGroupPress = (group: Group) => {
    setSelectedGroup(group);
    setViewMode("FEED");
  };

  // 🔴 독서방 화면으로 이동하면서 데이터(방 이름) 전달
  const handleEnterRoom = () => {
    if (!selectedGroup) return;
    router.push({
      pathname: "/reading-room",
      params: { roomId: selectedGroup.id, roomName: selectedGroup.name },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {/* --- [모드 1] 그룹 목록 화면 --- */}
      {viewMode === "LIST" && (
        <ScrollView contentContainerStyle={styles.centerContent}>
          <Text style={styles.sectionTitle}>내 그룹 목록</Text>
          {mockGroups.map((group) => (
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
      )}

      {/* --- [모드 2] 그룹 피드 화면 --- */}
      {viewMode === "FEED" && selectedGroup && (
        <View style={{ flex: 1 }}>
          <View style={styles.titleHeader}>
            <TouchableOpacity onPress={() => setViewMode("LIST")} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedGroup.name}</Text>
            
            {/* 🔴 새 페이지로 네비게이션 트리거 */}
            <TouchableOpacity style={styles.cameraIconButton} onPress={handleEnterRoom}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.feedContent}>
            {mockPosts.map((post) => (
              <View key={post.id} style={styles.feedCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.userInfoRow}>
                    <View style={styles.profilePlaceholder} />
                    <View>
                      <Text style={styles.usernameText}>{post.username}</Text>
                      <Text style={styles.bookTag}>“ {post.bookTitle} ”</Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>{post.date}</Text>
                </View>
                <Text style={styles.quoteText}>{post.quote}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: "#1a1a1a" },
  groupCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 18, backgroundColor: "#f9f9f9", borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#eaeaea",
  },
  groupInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupName: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  memberCount: { fontSize: 14, color: "#a0a0a0" },
  titleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a" },
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