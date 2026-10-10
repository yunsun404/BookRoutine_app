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

const styleOptions = ['빠름', '보통', '느림'];
const habitOptions = ['매일', '주 2-3회', '주 1회', '가끔'];
const genreOptions = ['판타지', '로맨스', '인문학', '철학', '추리', '요리', '역사', '경제', '과학', '외국도서'];

export default function SignupScreen() {
    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState<number>(0);
    const [profile_image, setProfileImage] = useState('');
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
                reading_style: reading_style ? { reading_style } : null,
                reading_habit: reading_habit ? { reading_habit } : null,
                favorite_genre: favorite_genre.length > 0 ? { favorite_genre } : null,
            };
            // 1. 회원가입 API 호출 (백엔드에 맞게 body 조정)
            // 임시로 as any 처리를 하여 속성 오류를 우회합니다. 추후 lib/api.ts의 타입 정의도 업데이트가 필요합니다.
            const { user_id, access_token, refresh_token } = await authApi.register(payload as any);
            // 2. 로그인 상태 업데이트
            await setAuth({ user_id, nickname }, access_token, refresh_token);
            // 3. 메인 화면으로 이동
            router.replace('/(tabs)/homescreen');
        } catch (error) {
            console.error('회원가입 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGenre = (genre: string) => {
        if (favorite_genre.includes(genre)) {
            setFavoriteGenre(favorite_genre.filter(g => g !== genre));
        } else {
            setFavoriteGenre([...favorite_genre, genre]);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

            <Text style={styles.title}>회원가입</Text>

            <TextInput
                style={styles.input}
                placeholder="아이디"
                value={username}
                onChangeText={setUsername}
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
                value={age ? String(age) : ''}
                onChangeText={(text) => setAge(Number(text))}
                keyboardType="numeric"
            />

            <Text style={styles.sectionLabel}>독서 속도</Text>
            <View style={styles.options}>
                {styleOptions.map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => setReadingStyle(option)}
                        style={[styles.chip, reading_style === option && styles.chipSelected]}
                    >
                        <Text style={reading_style === option ? styles.chipTextSelected : styles.chipText}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>독서 빈도</Text>
            <View style={styles.options}>
                {habitOptions.map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => setReadingHabit(option)}
                        style={[styles.chip, reading_habit === option && styles.chipSelected]}
                    >
                        <Text style={reading_habit === option ? styles.chipTextSelected : styles.chipText}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionLabel}>선호 장르</Text>
            <View style={styles.options}>
                {genreOptions.map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => toggleGenre(option)}
                        style={[styles.chip, favorite_genre.includes(option) && styles.chipSelected]}
                    >
                        <Text style={favorite_genre.includes(option) ? styles.chipTextSelected : styles.chipText}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>회원가입</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#444',
        marginBottom: 8,
        marginTop: 4,
    },
    options: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    chip: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    chipSelected: {
        backgroundColor: '#6B7BFF',
        borderColor: '#6B7BFF',
    },
    chipText: {
        fontSize: 14,
        color: '#444',
    },
    chipTextSelected: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#6B7BFF',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    link: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
    },
});