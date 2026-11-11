import { useInputColors } from "@/hooks/useInputColors";
import { userApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface UpdateProfilePayload {
    username?: string;
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
const ageOptions = ['10대', '20대', '30대', '40대', '50대 이상'];

export default function EditProfileScreen() {
    const router = useRouter();
    const ic = useInputColors(); // 입력창 글자·placeholder 색 (다크 모드에서도 보이게)
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useAuthStore();
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState<number | undefined | null>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profile_image, setProfileImage] = useState('');
    const [reading_style, setReadingStyle] = useState('');
    const [reading_habit, setReadingHabit] = useState('');
    const [favorite_genre, setFavoriteGenre] = useState<string[]>([]);

    const [showSpeedOptions, setShowSpeedOptions] = useState(false);
    const [showFrequencyOptions, setShowFrequencyOptions] = useState(false);
    const [showGenreOptions, setShowGenreOptions] = useState(false);
    const [showAgeOptions, setShowAgeOptions] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const result = await userApi.getMe() as any;
                setUsername(result.username);
                setNickname(result.nickname ?? '');
                setAge(result.age);
                setEmail(result.email ?? '');
                setPassword(result.password ?? '');
                setProfileImage(result.profile_image ?? '');
                setReadingStyle(result.reading_style?.reading_style ?? '');
                setReadingHabit(result.reading_habit?.reading_habit ?? '');
                setFavoriteGenre(result.favorite_genre?.favorite_genre ?? []);
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
            let imageUrl = profile_image;
            if (profile_image && !profile_image.startsWith('http')) {
                if (!user) return;
                imageUrl = await uploadProfileImage(profile_image, user.user_id)
            }
            const payload: UpdateProfilePayload = {
                username: username || undefined,
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
            updateUser({ nickname, profile_image: imageUrl, age });
            router.back();
        } catch (error) {
            console.error('프로필 수정 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('사진 접근 권한이 필요해요');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            // TODO: Supabase Storage 업로드 후 받은 공개 URL을 넣기
            // 지금은 테스트용으로 로컬 uri를 바로 미리보기에 사용
            setProfileImage(uri);
        }
    };

    const uploadProfileImage = async (uri: string, userId: string): Promise<string> => {
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();

        const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('profile-images')
            .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
        if (error) throw error;

        const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
        return data.publicUrl;
    };

    const ageLabel = age ? `${Math.floor(age / 10) * 10}대` : '선택';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* 상단 헤더 */}
            <View style={styles.header}>
                <Text style={styles.title}>프로필 편집</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>저장</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 프로필 이미지 + 닉네임 카드 */}
            <View style={styles.card}>
                <View style={styles.profileRow}>
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            source={profile_image ? { uri: profile_image } : { uri: "https://via.placeholder.com/64" }}
                            style={styles.avatar}
                        />
                        <View style={styles.cameraBadge}>
                            <Text style={styles.cameraBadgeText}>📷</Text>
                        </View>
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.nicknameInput, { color: ic.text }]}
                        placeholderTextColor={ic.placeholder}
                        placeholder="닉네임"
                        value={nickname}
                        onChangeText={setNickname}
                        autoCapitalize="none"
                    />
                </View>
                <TextInput
                    style={styles.imageUrlInput}
                    placeholderTextColor={ic.placeholder}
                    placeholder="프로필 이미지 URL"
                    value={profile_image}
                    onChangeText={setProfileImage}
                    autoCapitalize="none"
                />
            </View>

            {/* 내 정보 카드 */}
            <View style={styles.card}>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>아이디</Text>
                    <TextInput
                        style={[styles.fieldInput, { color: ic.text }]}
                        placeholderTextColor={ic.placeholder}
                        placeholder="아이디"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>이메일</Text>
                    <TextInput
                        style={[styles.fieldInput, { color: ic.text }]}
                        placeholderTextColor={ic.placeholder}
                        placeholder="이메일"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>비밀번호</Text>
                    <TextInput
                        style={[styles.fieldInput, { color: ic.text }]}
                        placeholderTextColor={ic.placeholder}
                        placeholder="비밀번호"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>
                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>나이대</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowAgeOptions(!showAgeOptions)}
                    >
                        <Text style={styles.dropdownText}>{ageLabel}</Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                    </TouchableOpacity>
                </View>
                {showAgeOptions && (
                    <View style={styles.dropdownList}>
                        {ageOptions.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    const num = parseInt(option);
                                    setAge(num);
                                    setShowAgeOptions(false);
                                }}
                            >
                                <Text>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* 독서 습관 카드 */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>독서 습관</Text>

                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>속도</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowSpeedOptions(!showSpeedOptions)}
                    >
                        <Text style={styles.dropdownText}>{reading_style || '선택'}</Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                    </TouchableOpacity>
                </View>
                {showSpeedOptions && (
                    <View style={styles.dropdownList}>
                        {speedOptions.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.dropdownItem}
                                onPress={() => { setReadingStyle(option); setShowSpeedOptions(false); }}
                            >
                                <Text>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>빈도</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowFrequencyOptions(!showFrequencyOptions)}
                    >
                        <Text style={styles.dropdownText}>{reading_habit || '선택'}</Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                    </TouchableOpacity>
                </View>
                {showFrequencyOptions && (
                    <View style={styles.dropdownList}>
                        {frequencyOptions.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.dropdownItem}
                                onPress={() => { setReadingHabit(option); setShowFrequencyOptions(false); }}
                            >
                                <Text>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>선호 장르</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowGenreOptions(!showGenreOptions)}
                    >
                        <Text style={styles.dropdownText}>
                            {favorite_genre.length > 0 ? favorite_genre.join(', ') : '선택'}
                        </Text>
                        <Text style={styles.dropdownArrow}>⌄</Text>
                    </TouchableOpacity>
                </View>
                {showGenreOptions && (
                    <View style={styles.dropdownList}>
                        {genreOptions.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.dropdownItem, favorite_genre.includes(option) && styles.selectedItem]}
                                onPress={() => toggleGenre(option)}
                            >
                                <Text style={favorite_genre.includes(option) ? styles.selectedItemText : undefined}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    saveButton: {
        backgroundColor: '#7c5cbf',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    cancelButton: {
        backgroundColor: '#9b7fd4',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        gap: 12,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cameraBadgeText: {
        fontSize: 12,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ddd',
    },
    nicknameInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 20,
    },
    imageUrlInput: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#888',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fieldLabel: {
        width: 70,
        fontSize: 15,
        color: '#555',
    },
    fieldInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    dropdown: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    dropdownArrow: {
        fontSize: 16,
        color: '#888',
    },
    dropdownList: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: -8,
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedItem: {
        backgroundColor: '#ede8f7',
    },
    selectedItemText: {
        color: '#7c5cbf',
        fontWeight: 'bold',
    },
});