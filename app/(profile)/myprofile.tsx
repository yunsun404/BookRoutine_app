import { authApi, userApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Header from "../../components/Header";

export default function MyProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<{
        user_id: string;
        nickname: string;
        age?: number | null;
        email: string;
        password: string;
        profile_image?: string | null;
        reading_style?: any | null;
        reading_habit?: any | null;
        favorite_genre?: any | null;
        created_at: Date;
    }>();
    const [modalVisible, setModalVisible] = useState(false);
    const { clearAuth } = useAuthStore();

    const handleGetProfile = async () => {
        try {
            setLoading(true);
            const result = await userApi.getMe();
            setProfile(result);
        } catch (error) {
            console.error('프로필 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDeleteAccount = async () => {
        try {
            setLoading(true);

            // 1. 탈퇴 API 호출
            const { success } = await authApi.deleteAccount({});
            // 2. 로그인 상태 업데이트
            clearAuth();
            // 3. 로그인 화면으로 이동
            router.replace('/');
        } catch (error) {
            console.error('탈퇴 오류: ', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        handleGetProfile();
    }, []);

    if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 100 }} />;

    const ageGroup = profile?.age ? `${Math.floor(profile.age / 10) * 10} 대` : null;
    const speed = profile?.reading_style?.reading_style ?? null;
    const frequency = profile?.reading_habit?.reading_habit ?? null;
    const genres: string[] = profile?.favorite_genre?.favorite_genre ?? [];

    return (

        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Header />
                {/* 프로필 이미지 + 닉네임 */}
                <View style={styles.profileHeader}>
                    {profile?.profile_image ? (
                        <Image source={{ uri: profile.profile_image }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder} />
                    )}
                    <Text style={styles.nickname}>{profile?.nickname}</Text>
                </View>

                {/* 프로필 편집 버튼 */}
                <TouchableOpacity style={styles.editButton} onPress={() => router.push('/editprofile')}>
                    <Text style={styles.editButtonText}>프로필 편집</Text>
                </TouchableOpacity>

                {/* 나이 + 레벨 카드 */}
                <View style={styles.card}>
                    {ageGroup && <Text style={styles.cardText}>{ageGroup}</Text>}
                    <Text style={styles.cardText}>Level. 1 독서가</Text>
                </View>

                {/* 독서 습관 카드 */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>독서 습관</Text>
                    {speed && (
                        <View style={styles.habitRow}>
                            <Text style={styles.habitLabel}>속도</Text>
                            <Text style={styles.habitValue}>{speed}</Text>
                        </View>
                    )}
                    {frequency && (
                        <View style={styles.habitRow}>
                            <Text style={styles.habitLabel}>빈도</Text>
                            <Text style={styles.habitValue}>{frequency}</Text>
                        </View>
                    )}
                    {genres.length > 0 && (
                        <View style={styles.habitRow}>
                            <Text style={styles.habitLabel}>선호 장르</Text>
                            <Text style={styles.habitValue}>{genres.join(', ')}</Text>
                        </View>
                    )}
                </View>

                {/* 계정 삭제 모달 */}
                <TouchableOpacity style={styles.deleteButton} onPress={() => setModalVisible(true)}>
                    <Text style={styles.deleteButtonText}>계정 삭제</Text>
                    <Modal visible={modalVisible} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>계정 삭제</Text>
                                <Text>정말 삭제하시겠습니까?</Text>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalCancel}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.modalCancelText}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalConfirm}
                                        onPress={handleDeleteAccount}
                                    >
                                        <Text style={styles.modalConfirmText}>삭제</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingBottom: 20
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ddd',
    },
    nickname: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    editButton: {
        backgroundColor: '#e8e0f0',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    editButtonText: {
        fontSize: 16,
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        gap: 12,
    },
    cardText: {
        fontSize: 18,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    habitRow: {
        gap: 4,
    },
    habitLabel: {
        fontSize: 13,
        color: '#888',
    },
    habitValue: {
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        width: width * 0.8,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    modalCancel: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    modalCancelText: {
        fontSize: 14,
        color: "#999",
    },
    modalConfirm: {
        backgroundColor: "#ff6b6b",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    modalConfirmText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "700",
    },
    deleteButton: {
        backgroundColor: '#ff6b6b',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    deleteButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});