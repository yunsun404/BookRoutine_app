import { userApi } from "@/lib/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function MyProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<{
        user_id: string;
        nickname: string;
        age?: number | null;
        email: string;
        password: string;
        profile_image?: string | null;
        reading_style?: object | null;
        reading_habit?: object | null;
        favorite_genre?: object | null;
        created_at: Date;
    }>();

    const handleGetProfile = async () => {
        try {
            setLoading(true);
            const result = await userApi.getMe();
            setProfile(result);
        } catch (error) {
            console.error('프로필 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        handleGetProfile();
    }, []);

    if (loading) return <ActivityIndicator />;

    return (
        <View>
            <Text>내 프로필</Text>

            <Text>닉네임: {profile?.nickname}</Text>
            <Text>이메일: {profile?.email}</Text>
            <Text>나이: {profile?.age}</Text>
            <Text>프로필 이미지: {profile?.profile_image}</Text>
            <Text>독서 스타일: {JSON.stringify(profile?.reading_style)}</Text>
            <Text>독서 습관: {JSON.stringify(profile?.reading_habit)}</Text>
            <Text>선호 장르: {JSON.stringify(profile?.favorite_genre)}</Text>
            <Text>가입일: {profile?.created_at?.toString().split('T')[0]}</Text>

            <TouchableOpacity onPress={() => router.push('/editprofile')}>
                <Text>프로필 수정</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/logout')}>
                <Text>로그아웃</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/deleteaccount')}>
                <Text>탈퇴</Text>
            </TouchableOpacity>
        </View>
    );
}