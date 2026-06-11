import { groupApi } from "@/lib/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";


export default function GroupScreen() {
    const router = useRouter();

    // 그룹 생성
    const [group_name, setGroupName] = useState('');
    const [people_count, setPeopleCount] = useState<number>(0);
    const [book_id, setBookId] = useState('');
    const [target_date, setTargetDate] = useState<Date | undefined>(undefined);
    const [showPicker, setShowPicker] = useState(false);

    const [loading, setLoading] = useState(false);

    // 그룹 생성
    const handleCreateGroup = async () => {
        try {
            setLoading(true);
            await groupApi.create({ /*group_id,*/ group_name, people_count, book_id, target_date });
        } catch (error) {
            console.error("create group 에러: ", error);
        } finally {
            setLoading(false);
        }
    }

    // 그룹 목록 조회
    const [created_by, setCreatedBy] = useState('');
    const [created_at, setCreatedAt] = useState<Date>();
    const [groups, setGroups] = useState<{
        group_id: string;
        group_name: string;
        people_count?: number;
        invite_code?: string;
        created_by: string;
        created_at: Date;
        group_books: [{ book_id?: string; }]
    }[]>([]);

    const handleGroupList = async () => {
        try {
            setLoading(true);
            const result = await groupApi.getList();
            setGroups(result);
        } catch (error) {
            console.log("group list 에러: ", error)
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        handleGroupList();
    }, []); // 화면이 처음 열릴 때 한 번 실행

    // 그룹 가입
    const [invite_code, setInviteCode] = useState('');
    const [invite_group, setInviteGroup] = useState<{
        group_id: string;
        user_id: string;
        role: number;
        joined_at: Date;
    }>();
    const handleJoinGroup = async () => {
        try {
            console.log("try 진입")
            setLoading(true)
            const result = await groupApi.joinGroup({ invite_code });
            console.log('joinGroup 호출 result: ', result)
            setInviteGroup(result);
        } catch (error) {
            console.log("그룹 입장 에러: ", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>그룹</Text>

            <Text>그룹 목록</Text>
            <View>
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.group_id}
                    renderItem={({ item }) => (
                        <>
                            <TouchableOpacity onPress={() => router.push(`/groupdetail?group_id=${item.group_id}`)}>
                                <Text>그룹명: {item.group_name}</Text>
                                <Text>목표 도서: {item.group_books[0]?.book_id}</Text>
                                <Text>초대 코드: {item.invite_code}</Text>
                                <Text>최대 인원수: {item.people_count}</Text>
                                {/* 여기도 고쳐야됨 */}
                                <Text>방장: {item.created_by}</Text>
                                <Text>생성일: {(item.created_at.toString()).split('T')[0]}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push(`/editgroup?group_id=${item.group_id}`)}>
                                <Text>그룹 편집</Text>
                            </TouchableOpacity>
                        </>
                    )}
                />
            </View>


            <TextInput
                // style={styles.input}
                placeholder="그룹 이름"
                value={group_name}
                onChangeText={setGroupName}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TextInput
                // style={styles.input}
                placeholder="최대 인원수"
                value={String(people_count)}
                onChangeText={(text) => setPeopleCount(Number(text))}
                keyboardType="numeric"
                autoCapitalize="none"
            />

            <TextInput
                // style={styles.input}
                placeholder="목표 도서(ID)"
                value={book_id}
                onChangeText={setBookId}
                keyboardType="default"
                autoCapitalize="none"
            />

            {Platform.OS === 'web' ? (
                // 웹(html input)
                <input
                    type="date"
                    value={target_date ? target_date.toISOString().split('T')[0] : ''}
                    onChange={(e) => setTargetDate(e.target.value ? new Date(e.target.value) : undefined)}
                    style={{ padding: 8, fontSize: 16 }}
                />
            ) : (
                // 모바일(DateTimePicker)
                <>
                    <TouchableOpacity onPress={() => setShowPicker(true)}>
                        <Text>{target_date ? target_date.toISOString().split('T')[0] : '목표 날짜 선택'}</Text>
                    </TouchableOpacity>
                    {showPicker && (
                        <DateTimePicker
                            value={target_date ?? new Date()}
                            mode="date"
                            onChange={(event, selectedDate) => {
                                setShowPicker(false);
                                if (selectedDate) setTargetDate(selectedDate);
                            }}
                        >
                        </DateTimePicker>
                    )}
                </>
            )}


            <TouchableOpacity
                // style={styles.button}
                onPress={handleCreateGroup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>그룹 생성</Text>
                )}
            </TouchableOpacity>

            <Text>새 그룹에 가입하기</Text>

            <TextInput
                // style={styles.input}
                placeholder="초대 코드 입력"
                value={invite_code}
                onChangeText={setInviteCode}
                keyboardType="default"
                autoCapitalize="none"
            />

            <TouchableOpacity
                // style={styles.button}
                // onPress={() => {
                //     handleJoinGroup;
                //     router.push(`/groupdetail?group_id=${group_id}`);
                // }}
                onPress={handleJoinGroup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>그룹 가입</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}