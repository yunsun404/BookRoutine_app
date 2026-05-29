import { readingroomApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";



export default function ReadingRoomStart() {

    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [group_id, setGroupId] = useState('');
    // const [user_id, setUserId] = useState('');
    const [book_id, setBookId] = useState('');

    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const handleReadingRoomStart = async () => {
        try {
            setLoading(true);
            // 1. 독서실 시작 API 호출 (백엔드에 맞게 body 조정)
            const { create, enter } = await readingroomApi.start({
                user_id: user?.user_id ?? '',
                group_id: group_id,
                book_id: book_id,
                started_by: user?.user_id ?? '',
                is_active: true,
                started_at: new Date(),
            });
            // const room_id = create.room_id;
            console.log('독서방 생성 응답', create);
            console.log('독서방 입장 응답', enter);
        } catch (error) {
            console.error('독서방 생성 오류 : ', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        // <View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>방 생성</Text>

            {/* <TextInput
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
 */}
            <TextInput
                // style={styles.input}
                placeholder="group_id"
                value={group_id}
                onChangeText={setGroupId}
                secureTextEntry
            />

            <TextInput
                // style={styles.input}
                placeholder="book_id"
                value={book_id}
                onChangeText={setBookId}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TouchableOpacity
                // style={styles.button}
                onPress={handleReadingRoomStart}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>방 생성</Text>
                )}
            </TouchableOpacity>
        </View>
        // </View>
    );
}