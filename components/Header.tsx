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
import { supabase } from "../lib/supabase";

interface UserProfile {
    nickname: string;
    profile_image: string;
}

export default function Header() {
    const [menuVisible, setMenuVisible] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data, error } = await supabase
            .from("users")
            .select("nickname, profile_image")
            .eq("user_id", "7ff77428-bdab-4724-9a67-ed5587217978")
            .single();

        if (!error && data) setProfile(data);
    };

    return (
        <>
            <View style={styles.topBar}>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Ionicons name="menu-outline" size={28} color="#333" />
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
                                    profile?.profile_image
                                        ? { uri: profile.profile_image }
                                        : { uri: "https://via.placeholder.com/48" }
                                }
                                style={styles.menuAvatar}
                            />
                            <Text style={styles.menuNickname}>
                                {profile?.nickname ?? "닉네임"}
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
                            onPress={() => setMenuVisible(false)}
                        >
                            <Text style={styles.menuItemText}>내 프로필 수정</Text>
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
                            onPress={() => setMenuVisible(false)}
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
        shadowColor: "#000",
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
        backgroundColor: "#E1D9D1",
        marginBottom: 8,
    },
    menuNickname: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333",
    },
    menuDivider: {
        height: 1,
        backgroundColor: "#F0EFED",
        marginVertical: 8,
    },
    menuItem: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    menuItemText: {
        fontSize: 14,
        color: "#333",
    },
});