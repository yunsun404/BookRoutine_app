import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

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
            setAuth({ user_id: user_id, nickname: nickname }, access_token, refresh_token);
            
            // 3. 메인 화면으로 이동
            router.replace('/(tabs)/home');
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>회원가입</Text>

            <TextInput
                placeholder="아이디"
                value={username}
                onChangeText={setUsername}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="닉네임"
                value={nickname}
                onChangeText={setNickname}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                placeholder="나이"
                value={String(age)}
                onChangeText={(text) => setAge(Number(text))}
                keyboardType="numeric"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="프로필 이미지"
                value={profile_image}
                onChangeText={setProfileImage}
                keyboardType="default"
                autoCapitalize="none"
            />

            <Text>독서 습관</Text>

            <Text>속도</Text>
            {styleOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    onPress={() => setReadingStyle(option)}
                    style={{ backgroundColor: reading_style === option ? 'gray' : 'white' }}
                >
                    <Text>{option}</Text>
                </TouchableOpacity>
            ))}

            <Text>빈도</Text>
            {habitOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    onPress={() => setReadingHabit(option)}
                    style={{ backgroundColor: reading_habit === option ? 'gray' : 'white' }}
                >
                    <Text>{option}</Text>
                </TouchableOpacity>
            ))}

            <Text>선호 장르</Text>
            {genreOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    onPress={() => toggleGenre(option)}
                    style={{ backgroundColor: favorite_genre.includes(option) ? 'gray' : 'white' }}
                >
                    <Text>{option}</Text>
                </TouchableOpacity>
            ))}

            <TouchableOpacity
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
    );
}