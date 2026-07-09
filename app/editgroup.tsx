import { groupApi } from "@/lib/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function EditgroupScreen() {
    const [loading, setLoading] = useState(false);
    const { group_id } = useLocalSearchParams<{ group_id: string }>();

    const [group_name, setGroupName] = useState('');
    const [people_count, setPeopleCount] = useState<number | undefined>();
    const [invite_code, setInviteCode] = useState('');
    const [created_by, setCreatedBy] = useState('');
    const [created_at, setCreatedAt] = useState<Date>();
    const [book_id, setBookId] = useState<string | undefined>('');
    const [target_date, setTargetDate] = useState<Date | undefined>(undefined);
    const [showPicker, setShowPicker] = useState(false);

    // 기존 그룹 불러오기
    useEffect(() => {
        const loadGroup = async () => {
            try {
                const result = await groupApi.getDetail(group_id);
                setGroupName(result.group_name ?? '');
                setPeopleCount(result.people_count);
                setInviteCode(result.invite_code ?? '');
                setCreatedBy(result.created_by ?? '');
                setCreatedAt(result.created_at);
                setBookId(result.group_books[0]?.book_id ?? '');
                setTargetDate(result.group_books[0]?.target_date ? new Date(result.group_books[0].target_date) : undefined);
            } catch (error) {
                console.error('그룹 불러오기 오류:', error);
            }
        };
        loadGroup();
    }, []);

    const handleUpdateGroup = async () => {
        try {
            setLoading(true);
            await groupApi.updateGroup(group_id, {
                group_name: group_name || undefined,
                people_count: people_count || undefined,
                book_id: book_id || undefined,
                target_date: target_date || undefined
            });
            router.back();
        } catch (error) {
            console.error('그룹 수정 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        try {
            setLoading(true);
            await groupApi.deleteGroup(group_id);
            router.back();
        } catch (error) {
            console.log('그룹 삭제 오류: ', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <View>
            <Text>그룹 수정</Text>

            <TextInput
                placeholder="그룹 이름"
                value={group_name}
                onChangeText={setGroupName}
                autoCapitalize="none"
            />

            <TextInput
                placeholder="최대 인원수"
                value={people_count ? String(people_count) : ''}
                onChangeText={(text) => setPeopleCount(text ? Number(text) : undefined)}
                keyboardType="numeric"
            />

            <Text>초대 코드: {invite_code}</Text>
            <Text>방장: {created_by}</Text>
            <Text>생성일: {created_at?.toString().split('T')[0]}</Text>

            <TextInput
                placeholder="목표 도서 ID"
                value={book_id}
                onChangeText={setBookId}
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

            <TouchableOpacity onPress={handleUpdateGroup} disabled={loading}>
                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <Text>수정 완료</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                // style={styles.button}
                onPress={handleDeleteGroup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text>그룹 삭제</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
                <Text>취소</Text>
            </TouchableOpacity>
        </View>
    );
}