import { authFetch, BASE_URL, getRefreshToken } from "@/constants/api";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { P } from "@/constants/palette";

interface UserProfile {
    nickname: string;
    profile_image: string;
}

export default function Header() {
    const [menuVisible, setMenuVisible] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const { user } = useAuthStore();    // 프로필을 store에서 바로 가져오기

    useEffect(() => {
        fetchProfile();
    }, []);

    // ✅ supabase 직접 호출 제거 — user API로 교체(bookshelf.tsx에서 복붙)
    const fetchProfile = async () => {
        try {
            const response = await authFetch(`${BASE_URL}/users/me`);
            const data = await response.json();
            if (data) setProfile(data);
        } catch (error) {
            console.error("프로필 에러:", error);
        }
    };

    // 로그아웃
    const { clearAuth } = useAuthStore();

    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try {
            setLoading(true);
            // 1. 로그아웃 API 호출 — 저장된 refresh 토큰을 서버에서 지움 (실패해도 이 기기에서는 로그아웃)
            await authApi.logout(await getRefreshToken());
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
            // 2. 로그인 상태·토큰 지우기  3. 로그인 화면으로 이동
            await clearAuth();
            router.replace('/');
            setLoading(false);
        }
    }

    return (
        <>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.push("/(tabs)/notifications")}>
                    <Ionicons name="notifications-outline" size={24} color={P.ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Ionicons name="menu-outline" size={28} color={P.ink} />
                </TouchableOpacity>
            </View>

            <Modal visible={menuVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.menuOverlay}
                    onPress={() => setMenuVisible(false)}
                    activeOpacity={1}
                >
                    <View style={styles.menuBox}>
                        <View style={styles.menuProfile}>
                            <Image
                                source={
                                    user?.profile_image
                                        ? { uri: user.profile_image }
                                        : { uri: "https://via.placeholder.com/48" }
                                }
                                style={styles.menuAvatar}
                            />
                            <Text style={styles.menuNickname}>
                                {user?.nickname ?? "닉네임"}
                            </Text>
                        </View>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/bookshelf");
                            }}
                        >
                            <Text style={styles.menuItemText}>내 책장</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/(profile)/myprofile");
                            }}
                        >
                            <Text style={styles.menuItemText}>내 프로필</Text>
                        </TouchableOpacity>

                        {/* 🛠️ [랭킹 보기] 버튼을 눌렀을 때 메뉴를 닫고 랭킹 페이지로 이동하도록 수정 */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                router.push("/ranking");
                            }}
                        >
                            <Text style={styles.menuItemText}>랭킹 보기</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                handleLogout();
                            }}
                        >
                            <Text style={[styles.menuItemText, { color: "#E53935" }]}>
                                로그아웃
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
        backgroundColor: "transparent",
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "flex-end",
    },
    menuBox: {
        width: 200,
        backgroundColor: "#fff",
        borderBottomLeftRadius: 16,
        paddingVertical: 16,
        marginTop: 56,
        shadowColor: P.shadow,
        shadowOffset: { width: -2, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    menuProfile: {
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: P.coverPlaceholder,
        marginBottom: 8,
    },
    menuNickname: {
        fontSize: 15,
        fontWeight: "700",
        color: P.ink,
    },
    menuDivider: {
        height: 1,
        backgroundColor: P.bg,
        marginVertical: 8,
    },
    menuItem: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    menuItemText: {
        fontSize: 14,
        color: P.ink,
    },
});