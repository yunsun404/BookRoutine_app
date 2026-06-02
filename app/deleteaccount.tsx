import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function DeleteAccountScreen() {

    const router = useRouter();
    const { clearAuth } = useAuthStore();
    const [refresh_token, setRefreshToken] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>계정 탈퇴</Text>
            <TouchableOpacity
                // style={styles.button}
                onPress={handleDeleteAccount}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>계정 탈퇴</Text>
                )}
            </TouchableOpacity>
        </View>
    )
}