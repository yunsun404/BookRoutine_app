import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from 'expo-av'; // npx expo install expo-av
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
// Camera 권한 요청용으로만 사용하고, 비디오 컴포넌트는 사용하지 않음

interface ActiveUser {
    user_id: string; 
    username: string;
    status: "reading" | "distracted" | "sleeping";
    // isDemoVideo?: boolean;   
    videoUrl?: any;  // 시연용 영상 URL : 로컬 require 구문을 받기 위해 string에서 any로 변경 
}

// 디바이스 전체 너비 가져오기
const { width } = Dimensions.get('window');

export default function ReadingRoomScreen() {
    const { room_name, username } = useLocalSearchParams<{ 
        room_name: string; 
        username: string;
    }>();

    const current_room_name = room_name || "집중방";
    const my_username = username || "최윤서";

    // 👥 시연용 가짜 다중 접속 데이터셋 (3명 배치)
    // 발표 시 직관성을 극대화하기 위해 상태별 3종 세트로 구성 (구글 샘플 비디오 활용)
    const [activeUsers] = useState<ActiveUser[]>([
        { 
            user_id: "demo-user-1", 
            username: `${my_username} (나)`,
            status: "reading", 
            // 프로젝트 내부 assets 폴더의 상대 경로로 매핑합니다.
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
    
    // const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([
    //     { user_id: current_user_id, username: my_username, status: "reading" },
    //     { 
    //         user_id: "demo-user-1", 
    //         username: "hongildong1", 
    //         status: "reading", 
    //         isDemoVideo: true,
    //         videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
    //     }
    // ]);
    

    /* -------------------------------------------------------------
     * 🚫 시연 안정성을 위해 실시간 하드웨어/웹뷰 제어부 주석 처리 
     * -------------------------------------------------------------
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);


    useEffect(() => {
        if (hasCameraPermission !== true) return;
        // 소켓 서버 연결 생략 (기존 구조 유지)
    }, [hasCameraPermission]);

    // 웹뷰 내부 미디어파이프 결과 수신 벼리
    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "FOCUS_RESULT") {
                const { status } = data; 
                // 내 카드 상태 즉시 최신화 (테두리 및 배지 변경 반영)
                setActiveUsers((prev) =>
                    prev.map((user) => user.user_id === current_user_id ? { ...user, status } : user)
                );
            }
        } catch (e) {}
    };

    ------------------------------------------------------------- */

 

    // 📷 [나의 실시간 캠 + MediaPipe 내장 HTML]
    const mediaPipeHtmlSource = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
            <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" crossorigin="anonymous"></script>
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #263238; }
                #webcam { width: 100vw; height: 100vh; object-fit: cover; transform: scaleX(-1); position: absolute; top:0; left:0; }
            </style>
        </head>
        <body>
            <video id="webcam" autoplay playsinline muted></video>
            <script>
                const videoElement = document.getElementById('webcam');
                const faceMesh = new FaceMesh({
                    locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/\${file}\`
                });
                faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
                
                faceMesh.onResults((results) => {
                    let currentStatus = "reading";
                    // 사람이 인식되지 않으면 딴짓 중(distracted)으로 판별 고정
                    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                        currentStatus = "distracted";
                    }
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FOCUS_RESULT', status: currentStatus }));
                });

                // 모바일 브라우저 표준 WebRTC 스트림 호출
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                    .then((stream) => {
                        videoElement.srcObject = stream;
                        const camera = new Camera(videoElement, {
                            onFrame: async () => { await faceMesh.send({ image: videoElement }); },
                            width: 640, height: 480
                        });
                        camera.start();
                    }).catch(err => {
                        alert("Camera stream lock error: " + err.message);
                    });
            </script>
        </body>
        </html>
    `;

    const getDemoVideoHtmlSource = (videoUrl: string) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #263238; }
                video { width: 100vw; height: 100vh; object-fit: cover; position: absolute; top:0; left:0; }
            </style>
        </head>
        <body>
            <video src="${videoUrl}" autoplay loop muted playsinline></node>
        </body>
        </html>
    `;

    // 메타데이터 처리기 (UI 테두리 및 배지 룩앤필 결정)
    const getStatusStyleMeta = (status: string) => {
        switch (status) {
            case "reading": 
                return { text: "읽는 중", color: "#FFFFFF", bg: "#4CAF50", border: "#4CAF50" };
            case "sleeping": 
                return { text: "졸음 감지⚠️", color: "#FFFFFF", bg: "#E53935", border: "#E53935" };
            default: 
                return { text: "읽는 중", color: "#1A1A1A", bg: "#FFB300", border: "#FFB300" }; 
        }
    };

    // if (hasCameraPermission !== true) {
    //     return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
    // }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 상단 룸 타이틀 바 */}
            <View style={styles.titleHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{current_room_name}</Text>
                <View style={{ width: 40 }} /> 
            </View>

            {/* 독서방 참여자 비디오 피드 스크롤 */}
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {activeUsers.map((user) => {
                    const meta = getStatusStyleMeta(user.status);

                    return (
                        <View key={user.user_id} style={styles.cardItem}>
                            {/* 💡 AI 상태 판정 결과에 따른 dynamic border 테두리 선언 */}
                            <View style={[styles.camSurface, { borderColor: meta.border, borderWidth: 4 }]}>
                                
                                {/* 🎥 오버레이 비디오 컨테이너 (웹뷰를 걷어내고 순수 네이티브 Video 처리) */}
                                <View style={StyleSheet.absoluteFillObject}>
                                    <Video
                                        source={ user.videoUrl }
                                        style={styles.nativeVideo}
                                        resizeMode={ResizeMode.COVER} // 가로세로 깨짐 없이 스케일 꽉 차게 조절
                                        shouldPlay={true}
                                        isLooping={true}
                                        isMuted={true}
                                    />
                                    {/* 화면 가독성 확보용 어두운 그라데이션 필터 효과 */}
                                    <View style={styles.videoOverlay} />
                                </View>

                                {/* 탑 네임태그 레이어 */}
                                <View style={styles.camUserHeader}>
                                    <View style={[styles.miniProfile, { backgroundColor: meta.border }]} />
                                    <Text style={styles.camUsername}>{user.username}</Text>
                                </View>

                                {/* 바텀 AI 판정 실시간 상태 알림 배지 */}
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
        alignItems: "center", // 카드를 중앙으로 정렬
        paddingVertical: 16 
    },
    cardItem: { 
        width: width - 24, // 💡 좌우 여백을 최소화하여 디바이스 가로를 거의 꽉 채우는 스케일 구현
        height: 195,       // 가로 폭에 최적화된 컴팩트한 시연용 뷰포트 높이
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
        backgroundColor: 'rgba(0, 0, 0, 0.25)' // 비디오 위의 텍스트 폰트 시인성 확보
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