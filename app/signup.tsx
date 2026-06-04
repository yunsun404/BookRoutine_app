import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";


export default function SignupScreen() {

    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        // if (!username || !password) {
        //     Alert.alert('오류', '아이디와 비밀번호를 입력해주세요.');
        // return;

        try {
            setLoading(true);
            // 1. 회원가입 API 호출 (백엔드에 맞게 body 조정)
            const { user_id, access_token, refresh_token } = await authApi.register({
                username,
                email,
                password,
                nickname,
                // age: null,
                // profile_image: null,
                // reading_style: null,
                // reading_habit: null,
                // favorite_genre: null,
            });
            // 2. 로그인 상태 업데이트
            setAuth({ user_id: user_id, nickname: nickname }, access_token, refresh_token);  // [Error: Uncaught (in promise, id: 0) Error: [AsyncStorage] Passing null/undefined as value is not supported. If you want to remove value, Use .removeItem method instead.
            // Passed value: undefined
            // Passed key: access_token

            // const me = await userApi.getMe();
            // await setAuth(me, access_token, refresh_token); // ?? Internal server error
            // 3. 메인 화면으로 이동
            router.replace('/(tabs)/home');
        } catch (error) {
            console.error('회원가입 오류:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        // <View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>회원가입</Text>

            <TextInput
                // style={styles.input}
                placeholder="아이디"
                value={username}
                onChangeText={setUsername}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TextInput
                // style={styles.input}
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                // style={styles.input}
                placeholder="닉네임"
                value={nickname}
                onChangeText={setNickname}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TextInput
                // style={styles.input}
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                // style={styles.button}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>회원가입</Text>
                )}
            </TouchableOpacity>
        </View>
        // </View>
    );
}