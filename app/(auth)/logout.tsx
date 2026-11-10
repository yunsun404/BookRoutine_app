import { getRefreshToken } from "@/constants/api";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";


export default function LogoutScreen() {


    const router = useRouter();
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>로그아웃</Text>
            <TouchableOpacity
                // style={styles.button}
                onPress={handleLogout}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>로그아웃</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}