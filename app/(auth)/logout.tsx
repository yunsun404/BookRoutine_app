import { performLogout } from "@/lib/auth/logout";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";


export default function LogoutScreen() {

    const [loading, setLoading] = useState(false);

    // 로그아웃 — lib/auth/logout.ts (Header 메뉴·설정 화면과 같은 코드)
    const handleLogout = async () => {
        setLoading(true);
        await performLogout();
        setLoading(false);
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
