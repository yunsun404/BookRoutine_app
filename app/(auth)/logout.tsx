import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";


export default function LogoutScreen() {


    const router = useRouter();
    const { clearAuth } = useAuthStore();

    const [refresh_token, setRefreshToken] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        // if (!username || !password) {
        //     Alert.alert('오류', '아이디와 비밀번호를 입력해주세요.');
        // return;

        try {
            console.log('try 진입');
            setLoading(true);
            console.log('setLoading true');
            // 1. 로그아웃 API 호출 (백엔드에 맞게 body 조정)
            const { success } = await authApi.logout({ refresh_token });
            console.log('넘어가는지 보자');
            console.log('로그아웃: ', success);
            // 2. 로그인 상태 업데이트
            clearAuth();
            // 3. 로그인 화면으로 이동
            router.replace('/');
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
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