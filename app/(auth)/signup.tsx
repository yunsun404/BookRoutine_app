import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// API Payload 속성 정의 추가
interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    nickname: string;
    age?: number | null;
    profile_image?: string | null;
    reading_style?: { reading_style: string } | null;
    reading_habit?: { reading_habit: string } | null;
    favorite_genre?: { favorite_genre: string[] } | null;
}

export default function SignupScreen() {
    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState<number>(0);
    const [profile_image, setProfileImage] = useState('');

    const styleOptions = ['빠름', '보통', '느림'];
    const habitOptions = ['매일', '주 2-3회', '주 1회', '가끔'];
    const genreOptions = ['판타지', '로맨스', '인문학', '철학', '추리', '요리', '역사', '경제', '과학', '외국도서'];

    const [reading_style, setReadingStyle] = useState<string>('');
    const [reading_habit, setReadingHabit] = useState<string>('');
    const [favorite_genre, setFavoriteGenre] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        try {
            setLoading(true);

            const payload: RegisterPayload = {
                username,
                email,
                password,
                nickname,
                age: age || null,
                profile_image: profile_image || null,
                reading_style: reading_style ? { reading_style: reading_style } : null,
                reading_habit: reading_habit ? { reading_habit: reading_habit } : null,
                favorite_genre: favorite_genre.length > 0 ? { favorite_genre: favorite_genre } : null,
            };

            // 1. 회원가입 API 호출 (백엔드에 맞게 body 조정)
            // 임시로 as any 처리를 하여 속성 오류를 우회합니다. 추후 lib/api.ts의 타입 정의도 업데이트가 필요합니다.
            const { user_id, access_token, refresh_token } = await authApi.register(payload as any);

            // 2. 로그인 상태 업데이트
            await setAuth({ user_id: user_id, nickname: nickname }, access_token, refresh_token);

            // 3. 메인 화면으로 이동
            router.replace('/(tabs)/homescreen');
        } catch (error) {
            console.error('회원가입 오류:', error);
        } finally {
            setLoading(false);
        }
    }

    const toggleGenre = (genre: string) => {
        if (favorite_genre.includes(genre)) {
            setFavoriteGenre(favorite_genre.filter(g => g !== genre));
        } else {
            setFavoriteGenre([...favorite_genre, genre]);
        }
    }

    return (
        <ScrollView>
            <View style={styles.container}>
                <Text style={styles.title}>회원가입</Text>

                <TextInput
                    style={styles.input}
                    placeholder="아이디"
                    value={username}
                    onChangeText={setUsername}
                    keyboardType="default"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="이메일"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="닉네임"
                    value={nickname}
                    onChangeText={setNickname}
                    keyboardType="default"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="비밀번호"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TextInput
                    style={styles.input}
                    placeholder="나이"
                    value={String(age)}
                    onChangeText={(text) => setAge(Number(text))}
                    keyboardType="numeric"
                    autoCapitalize="none"
                />

                <Text style={styles.text}>독서 속도</Text>
                <View style={styles.options}>
                    {styleOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => setReadingStyle(option)}
                            style={[{ backgroundColor: reading_style === option ? 'gray' : 'white' }, styles.option]}
                        >
                            <Text>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.text}>독서 빈도</Text>
                <View style={styles.options}>
                    {habitOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => setReadingHabit(option)}
                            style={[{ backgroundColor: reading_habit === option ? 'gray' : 'white' }, styles.option]}
                        >
                            <Text>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.text}>선호 장르</Text>
                <View style={styles.options}>
                    {genreOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            onPress={() => toggleGenre(option)}
                            style={[{ backgroundColor: favorite_genre.includes(option) ? 'gray' : 'white' }, styles.option]}
                        >
                            <Text>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.buttons}>
                    <TouchableOpacity
                        onPress={handleSignup}
                        disabled={loading}
                        style={[styles.button, loading && styles.disabledButton]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>회원가입</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    menuAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#E1D9D1",
        marginBottom: 8,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 10,
    },
    option: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        alignItems: "center",
        margin: 10,
        width: `${10}%`
    },
    options: {
        // flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: "center"
    },
    button: {
        backgroundColor: '#333',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 16,
        marginHorizontal: 16,
        width: `${40}%`
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttons: {
        // flex: 1,
        flexDirection: 'row',
        justifyContent: "center"
    }
})