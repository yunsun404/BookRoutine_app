import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from 'expo-av';
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ActiveUser {
    user_id: string;
    username: string;
    status: "reading" | "distracted" | "sleeping";
    videoUrl?: any;
}

const { width } = Dimensions.get('window');

export default function ReadingRoomScreen() {
    const { room_id, room_name, username } = useLocalSearchParams<{
        room_id: string;
        room_name: string;
        username: string;
    }>();

    const current_room_name = room_name || "집중방";
    const my_username = username || "최윤서";

    // ↓ current_room_name/my_username이 정의된 "다음"에 와야 해서 여기로 옮김
    const [myStatus, setMyStatus] = useState<'reading' | 'distracted'>('reading');
    const mySessionId = `${room_id ?? current_room_name}_${my_username}`;

    const [activeUsers] = useState<ActiveUser[]>([
        {
            user_id: "demo-user-1",
            username: `${my_username} (나)`,
            status: "reading",
            videoUrl: require("../assets/videos/user1.mp4")
        },
        {
            user_id: "demo-user-2",
            username: "이솔희",
            status: "sleeping",
            videoUrl: require("../assets/videos/user2.mp4")
        },
        {
            user_id: "demo-user-3",
            username: "정윤선",
            status: "reading",
            videoUrl: require("../assets/videos/user3.mp4")
        }
    ]);

    const getStatusStyleMeta = (status: string) => {
        switch (status) {
            case "reading":
                return { text: "읽는 중", color: "#FFFFFF", bg: "#4CAF50", border: "#4CAF50" };
            case "sleeping":
                return { text: "졸음 감지⚠️", color: "#FFFFFF", bg: "#E53935", border: "#E53935" };
            case "distracted":
                return { text: "집중 이탈", color: "#1A1A1A", bg: "#FFB300", border: "#FFB300" };
            default:
                return { text: "읽는 중", color: "#FFFFFF", bg: "#4CAF50", border: "#4CAF50" };
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.titleHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{current_room_name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {activeUsers.map((user) => {
                    const isMe = user.user_id === "demo-user-1";
                    const displayStatus = isMe ? myStatus : user.status;
                    const meta = getStatusStyleMeta(displayStatus);

                    return (
                        <View key={user.user_id} style={styles.cardItem}>
                            <View style={[styles.camSurface, { borderColor: meta.border, borderWidth: 4 }]}>
                                <View style={StyleSheet.absoluteFillObject}>
                                    <Video
                                        source={user.videoUrl}
                                        style={styles.nativeVideo}
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay={true}
                                        isLooping={true}
                                        isMuted={true}
                                    />
                                    <View style={styles.videoOverlay} />
                                </View>

                                <View style={styles.camUserHeader}>
                                    <View style={[styles.miniProfile, { backgroundColor: meta.border }]} />
                                    <Text style={styles.camUsername}>{user.username}</Text>
                                </View>

                                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.text}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },
    titleHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        backgroundColor: "#fff"
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1a1a1a" },
    listContent: {
        alignItems: "center",
        paddingVertical: 16
    },
    cardItem: {
        width: width - 24,
        height: 195,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3
    },
    camSurface: {
        flex: 1,
        backgroundColor: "#1C252C",
        borderRadius: 20,
        padding: 16,
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden"
    },
    nativeVideo: {
        width: '100%',
        height: '100%'
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.25)'
    },
    camUserHeader: { flexDirection: "row", alignItems: "center", gap: 10, zIndex: 10 },
    miniProfile: { width: 28, height: 28, borderRadius: 14 },
    camUsername: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4
    },
    statusBadge: {
        alignSelf: "flex-end",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3
    },
    statusText: { fontSize: 13, fontWeight: "700" }
});