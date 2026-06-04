import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";


export default function HomeScreen() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View>
                <Text>홈</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/logout')}>
                <Text>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/readingroomstart')}>
                <Text>독서방 시작 화면</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/deleteaccount')}>
                <Text>탈퇴</Text>
            </TouchableOpacity>
        </View>

    );
}