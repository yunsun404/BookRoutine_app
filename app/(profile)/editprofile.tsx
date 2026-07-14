import { userApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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
    const { updateUser } = useAuthStore();

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
                setAge(result.age ?? null);
                setEmail(result.email ?? '');
                setPassword(result.password ?? '');
                setProfileImage(result.profile_image ?? '');
                setReadingStyle(result.reading_style?.reading_style ?? '');
                setReadingHabit(result.reading_habit?.reading_habit ?? '');
                setFavoriteGenre(result.favorite_genre?.favorite_genre ?? []);
                console.log("result: ", result)
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
                reading_style: reading_style ? { reading_style } : undefined,
                reading_habit: reading_habit ? { reading_habit } : undefined,
                favorite_genre: favorite_genre.length > 0 ? { favorite_genre } : undefined,
            };

            await userApi.updateMe(payload as any);
            updateUser({ nickname, profile_image, age });
            router.back();
        } catch (error) {
            console.error('프로필 수정 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView>
            <View style={styles.container}>

                <Text style={styles.title}>프로필 수정</Text>

                <Text style={styles.text}>내 정보</Text>
                <Image
                    source={
                        profile_image ? { uri: profile_image } : { uri: "https://via.placeholder.com/48" }
                    }
                    style={styles.menuAvatar}
                />
                <TextInput
                    style={styles.input}
                    placeholder="프로필 이미지 URL"
                    value={profile_image}
                    onChangeText={setProfileImage}
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
                    placeholder="나이"
                    value={age ? String(age) : ''}
                    onChangeText={(text) => setAge(text ? Number(text) : undefined)}
                    keyboardType="numeric"
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
                    placeholder="비밀번호"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <Text style={styles.text}>독서 속도</Text>
                <View style={styles.options}>
                    {speedOptions.map((option) => (
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
                    {frequencyOptions.map((option) => (
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
                    <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}
                        style={[styles.button, loading && styles.disabledButton]}>
                        {loading ? (
                            <ActivityIndicator />
                        ) : (
                            <Text style={styles.buttonText}>수정 완료</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()}
                        style={[styles.button, loading && styles.disabledButton]}>
                        <Text style={styles.buttonText}>취소</Text>
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