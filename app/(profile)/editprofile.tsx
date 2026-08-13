import { userApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

interface UpdateProfilePayload {
    nickname?: string;
    age?: number;
    email?: string;
    password?: string;
    profile_image?: string;
    reading_style?: { reading_style: string };
    reading_habit?: { reading_habit: string };
    favorite_genre?: { favorite_genre: string[] };
}

const speedOptions = ['빠름', '보통', '느림'];
const frequencyOptions = ['매일', '주 2-3회', '주 1회', '가끔'];
const genreOptions = ['판타지', '로맨스', '인문학', '철학', '추리', '요리', '역사', '경제', '과학', '외국도서'];

export default function EditProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState<number | undefined | null>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profile_image, setProfileImage] = useState('');
    const [reading_style, setReadingStyle] = useState('');
    const [reading_habit, setReadingHabit] = useState('');
    const [favorite_genre, setFavoriteGenre] = useState<string[]>([]);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                // [수정됨] API 반환 타입에 없는 속성(email, age) 접근을 위해 as any 단언 추가
                const result = await userApi.getMe() as any;
                setNickname(result.nickname ?? '');
                setAge(result.age);
                setEmail(result.email ?? '');
                setProfileImage(result.profile_image ?? '');
            } catch (error) {
                console.error('프로필 불러오기 오류:', error);
            }
        };
        loadProfile();
    }, []);

    const toggleGenre = (genre: string) => {
        if (favorite_genre.includes(genre)) {
            setFavoriteGenre(favorite_genre.filter(g => g !== genre));
        } else {
            setFavoriteGenre([...favorite_genre, genre]);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setLoading(true);

            const payload: UpdateProfilePayload = {
                nickname: nickname || undefined,
                age: age || undefined,
                email: email || undefined,
                password: password || undefined,
                profile_image: profile_image || undefined,
                reading_style: reading_style ? { reading_style: reading_style } : undefined,
                reading_habit: reading_habit ? { reading_habit: reading_habit } : undefined,
                favorite_genre: favorite_genre.length > 0 ? { favorite_genre: favorite_genre } : undefined,
            };

            await userApi.updateMe(payload as any);
            router.back();
        } catch (error) {
            console.error('프로필 수정 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            <Text>프로필 수정</Text>

            <TextInput
                placeholder="닉네임"
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
            />

            <TextInput
                placeholder="나이"
                value={age ? String(age) : ''}
                onChangeText={(text) => setAge(text ? Number(text) : undefined)}
                keyboardType="numeric"
            />

            <TextInput
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TextInput
                placeholder="프로필 이미지 URL"
                value={profile_image}
                onChangeText={setProfileImage}
                autoCapitalize="none"
            />

            <Text>독서 속도</Text>
            {speedOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    onPress={() => setReadingStyle(option)}
                    style={{ backgroundColor: reading_style === option ? 'gray' : 'white' }}
                >
                    <Text>{option}</Text>
                </TouchableOpacity>
            ))}

            <Text>독서 빈도</Text>
            {frequencyOptions.map((option) => (
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

            <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}>
                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <Text>수정 완료</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <Text>취소</Text>
            </TouchableOpacity>
        </View>
    );
}