import { groupApi } from "@/lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

export default function GroupDetailScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const { group_id } = useLocalSearchParams<{ group_id: string }>();
    const [group, setGroup] = useState<{
        group_id: string;
        group_name: string;
        people_count?: number;
        invite_code?: string;
        created_by: string;
        created_at: Date;
        group_books: [{ book_id?: string; }]
    }>();

    const [threads, setThreads] = useState<{
        thread_id: string;
        user_id: string;
        book_id: string;
        group_id?: string;
        content: string;
        current_page?: number;
        is_public: boolean;
        likes: number;
        created_at: Date;
        updated_at: Date;
    }[]>([]);

    // const [readingroom, setReadingRoom] = useState<{ is_active: Boolean }>();

    const handleGroupDetail = async () => {
        try {
            setLoading(true);
            const resultG = await groupApi.getDetail(group_id);
            setGroup(resultG);
            const resultT = await groupApi.getGroupThread(group_id);
            // console.log('threads 타입:', Array.isArray(resultT));
            // console.log('threads 길이:', resultT.length);
            setThreads(resultT);

            // const resultR = await groupApi.getReadingRoomStatus(group_id);
            // setReadingRoom(resultR);
        } catch (error) {
            console.log("group list 에러: ", error)
        } finally {
            setLoading(false);
        }
    }

    const handleLeaveGroup = async () => {
        try {
            console.log('try 진입')
            setLoading(true)
            const result = await groupApi.leaveGroup(group_id);
            console.log('leaveGroup: ', result)
            router.push(`/group`);
        } catch (error) {
            console.log("leave group 에러: ", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        handleGroupDetail();
    }, []); // 화면이 처음 열릴 때 한 번 실행

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>그룹 상세</Text>
            <Text>그룹명: {group?.group_name}</Text>
            <Text>목표 도서: {group?.group_books[0]?.book_id}</Text>
            <Text>초대 코드: {group?.invite_code}</Text>
            <Text>최대 인원 수: {group?.people_count}</Text>
            <Text>방장: {group?.created_by}</Text>
            <Text>생성일: {group?.created_at.toString().split('T')[0]}</Text>

            {/* ── 독서방 입장 버튼 (추가) ── */}
            <TouchableOpacity
                onPress={() =>
                    router.push(
                        `/reading-room?room_name=${group?.group_name}&username=나`
                    )
                }
            >
                <Text>독서방 입장</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLeaveGroup}>
                <Text>그룹 퇴장하기</Text>
            </TouchableOpacity>

            {/* 제거: 독서방 상태 표시 UI 임시 제거 */}
            {/* <Text>독서방 {readingroom?.is_active ? "활성 중" : "비활성됨"}</Text> */}

            <Text>스레드</Text>
            <FlatList
                data={threads}
                keyExtractor={(item) => item.thread_id}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => router.push(`/groupdetail?group_id=${item.group_id}`)}>
                        <Text>{item.content}</Text>
                        <Text>작성자: {item.user_id}</Text>
                        <Text>마지막 업데이트: {(item.updated_at.toString())}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    )
}