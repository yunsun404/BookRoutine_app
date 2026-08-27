import Header from "@/components/Header";
import { groupApi } from "@/lib/api";
import { startReadingRoom } from "@/lib/api/reading-room";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";

interface Thread {
    thread_id: string;
    content: string;
    current_page?: number;
    is_public: boolean;
    likes: number;
    created_at: Date;
    updated_at: Date;
    user: { nickname: string };
    book?: { title: string };
}

interface GroupDetail {
    group_id: string;
    group_name: string;
    people_count?: number;
    invite_code?: string;
    created_by: string;
    created_at: Date;
    group_books: [{
        book_id?: string;
        book: { title: string; }
    }];
}

export default function GroupDetailScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { group_id } = useLocalSearchParams<{ group_id: string }>();

    const [group, setGroup] = useState<GroupDetail>();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(false);

    const handleGroupDetail = async () => {
        try {
            setLoading(true);
            const resultG = await groupApi.getDetail(group_id);
            setGroup(resultG);
            const resultT = await groupApi.getGroupThread(group_id);
            setThreads(resultT);
        } catch (error) {
            console.log("group detail 에러: ", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        try {
            await groupApi.leaveGroup(group_id);
            router.push(`/group`);
        } catch (error) {
            console.log("leave group 에러: ", error);
        }
    };

    // 문장 수집 만들기 전 토스트 메세지
    const showToast = () => {
        ToastAndroid.show('준비 중입니다.', ToastAndroid.SHORT);
    };

    useEffect(() => {
        handleGroupDetail();
    }, []);

    return (
        <View style={styles.container}>
            <Header />

            {/* 상단 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {group?.group_name ?? ""}
                </Text>
                <TouchableOpacity
                    style={styles.enterBtn}
                    onPress={async () => {
                        if (!group) return;
                        try {
                            const result = await startReadingRoom(group.group_id, group.group_name);
                            const myNickname = user?.nickname ?? "익명";
                            router.push(
                                `/reading-room?room_id=${result.create.room_id}&room_name=${group.group_name}&username=${myNickname}`
                            );
                        } catch (error) {
                            console.log("독서방 시작 에러:", error);
                        }
                    }}
                >
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={styles.enterBtnText}>독서방</Text>
                </TouchableOpacity>
            </View>

            {/* 그룹 정보 카드 */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="book-outline" size={14} color="#888" />
                    <Text style={styles.infoLabel}>목표 도서</Text>
                    <Text style={styles.infoValue}>
                        {group?.group_books[0]?.book?.title ?? "미설정"}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="key-outline" size={14} color="#888" />
                    <Text style={styles.infoLabel}>초대 코드</Text>
                    <Text style={styles.infoValue}>
                        {group?.invite_code ?? "없음"}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={14} color="#888" />
                    <Text style={styles.infoLabel}>최대 인원</Text>
                    <Text style={styles.infoValue}>
                        {group?.people_count ? `${group.people_count}명` : "제한 없음"}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#888" />
                    <Text style={styles.infoLabel}>개설일</Text>
                    <Text style={styles.infoValue}>
                        {group?.created_at
                            ? group.created_at.toString().split("T")[0]
                            : ""}
                    </Text>
                </View>

                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                    <Text style={styles.leaveBtnText}>그룹 나가기</Text>
                </TouchableOpacity>
            </View>

            {/* 타래 섹션 */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>그룹원 타래</Text>
                <View style={styles.threadBtnSection}>
                    <TouchableOpacity
                        style={styles.threadBtn}
                        onPress={() =>
                            router.push({
                                pathname: "/thread",
                                params: {
                                    book_id: group?.group_books[0]?.book_id,
                                    book_title: group?.group_books[0]?.book?.title,
                                    group_id: group_id,
                                },
                            })
                        }
                    >
                        <Text style={styles.threadBtnText}>타래 등록</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.threadBtn}
                        onPress={showToast}
                    >
                        <Text style={styles.threadBtnText}>문장 수집</Text>
                    </TouchableOpacity>
                </View>

            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={threads}
                    keyExtractor={(item) => item.thread_id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            아직 작성된 타래가 없습니다.{"\n"}첫 번째 타래를 남겨보세요.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.threadCard}>
                            {/* 카드 상단: 아바타 + 닉네임 + 날짜 */}
                            <View style={styles.threadTop}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>
                                        {item.user?.nickname?.charAt(0) ?? "?"}
                                    </Text>
                                </View>
                                <View style={styles.threadMeta}>
                                    <Text style={styles.threadUser}>
                                        {item.user?.nickname ?? "알 수 없음"}
                                    </Text>
                                    <Text style={styles.threadBook}>
                                        " {item.book?.title ?? ""} "
                                    </Text>
                                </View>
                                <View style={styles.threadRight}>
                                    <Text style={styles.threadDate}>
                                        {item.updated_at?.toString().split("T")[0]}
                                    </Text>
                                    <View style={styles.likeRow}>
                                        <Ionicons name="heart-outline" size={14} color="#aaa" />
                                        <Text style={styles.likeCount}>{item.likes ?? 0}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* 본문 */}
                            <Text style={styles.threadContent}>{item.content}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },

    // 헤더
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 8,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
    },
    enterBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#111",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    enterBtnText: {
        fontSize: 13,
        color: "#fff",
        fontWeight: "600",
    },

    // 그룹 정보 카드
    infoCard: {
        marginHorizontal: 20,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        gap: 10,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    infoLabel: {
        fontSize: 13,
        color: "#888",
        width: 60,
    },
    infoValue: {
        fontSize: 13,
        color: "#111",
        fontWeight: "500",
        flex: 1,
    },
    leaveBtn: {
        marginTop: 4,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#eee",
        alignItems: "center",
    },
    leaveBtnText: {
        fontSize: 13,
        color: "#aaa",
    },

    // 타래 섹션
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111",
    },
    threadBtnSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end"
    },
    threadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#111",
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginLeft: 5,
        borderRadius: 10,
    },
    threadBtnText: {
        fontSize: 13,
        color: "#fff",
        fontWeight: "600",
    },

    listContent: {
        padding: 20,
        gap: 12,
    },

    // 타래 카드
    threadCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        gap: 10,
    },
    threadTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
    },
    threadMeta: {
        flex: 1,
        gap: 2,
    },
    threadUser: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111",
    },
    threadBook: {
        fontSize: 12,
        color: "#666",
    },
    threadRight: {
        alignItems: "flex-end",
        gap: 4,
    },
    threadDate: {
        fontSize: 12,
        color: "#aaa",
    },
    likeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    likeCount: {
        fontSize: 12,
        color: "#aaa",
    },
    threadContent: {
        fontSize: 14,
        color: "#222",
        lineHeight: 20,
    },

    emptyText: {
        textAlign: "center",
        color: "#aaa",
        fontSize: 14,
        lineHeight: 22,
        marginTop: 60,
    },
});
