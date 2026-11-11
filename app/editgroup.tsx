import { Colors } from "@/constants/tokens";
import { useInputColors } from "@/hooks/useInputColors";
import { groupApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function EditgroupScreen() {
    const ic = useInputColors(); // placeholder 색 (다크 모드에서도 보이게)
    const [loading, setLoading] = useState(false);
    const { group_id } = useLocalSearchParams<{ group_id: string }>();

    // ── 기존 정보 ────────────────────────────────────────────────────
    const [people_count, setPeopleCount] = useState<string>('');
    const [created_by, setCreatedBy] = useState('');
    const [created_at, setCreatedAt] = useState<Date>();
    const [showPicker, setShowPicker] = useState(false);

    // ── 변경 내용 ────────────────────────────────────────────────────
    const [groupName, setGroupName] = useState("");
    const [bookTitle, setBookTitle] = useState("");
    const [searchTitle, setSearchTitle] = useState('');
    const [searchResults, setSearchResults] = useState<{
        book_id: string;
        isbn?: string;
        title: string;
        author?: string;
        total_pages?: number;
        cover_url?: string;
    }[]>([]);
    const [selectedBook, setSelectedBook] = useState<typeof searchResults[0] | null>(null);
    const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
    const [inviteCode, setInviteCode] = useState("");


    useEffect(() => {
        const loadGroup = async () => {
            try {
                const result = await groupApi.getDetail(group_id);
                setGroupName(result.group_name ?? '');
                setPeopleCount(result.people_count ? String(result.people_count) : '');
                setInviteCode(result.invite_code ?? '');
                setCreatedBy(result.creator.nickname ?? '');
                setCreatedAt(result.created_at);
                setBookTitle(result.group_books[0]?.book.title ?? '');
                setTargetDate(result.group_books[0]?.target_date ? new Date(result.group_books[0].target_date) : undefined);
            } catch (error) {
                console.error('그룹 불러오기 오류:', error);
            }
        };
        loadGroup();
    }, []);

    // 책 검색
    const handleSearch = async (text: string) => {
        setSearchTitle(text);
        if (text.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const results = await groupApi.searchBooks(text);
            const mapped = results.map((book: any) => ({
                ...book,
                isbn: book.isbn13 ?? book.isbn,  // isbn13을 isbn으로 매핑
                cover_url: book.cover_url ?? book.cover,
            }));
            setSearchResults(mapped);
        } catch (error) {
            console.error('검색 오류:', error);
        }
    }

    const handleUpdateGroup = async () => {
        try {
            setLoading(true);
            await groupApi.updateGroup(group_id, {
                group_name: groupName || undefined,
                people_count: people_count ? Number(people_count) : undefined,
                isbn: selectedBook?.isbn,
                title: selectedBook?.title,
                author: selectedBook?.author,
                total_pages: selectedBook?.total_pages,
                cover_url: selectedBook?.cover_url,
                target_date: targetDate || undefined,
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
            console.log('그룹 삭제 오류: ', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>

            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>그룹 수정</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView>
                {/* 정보 카드 */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="key-outline" size={14} color="#aaa" />
                        <Text style={styles.infoLabel}>초대 코드</Text>
                        <Text style={[styles.infoValue, { color: "#6C63FF" }]}>{inviteCode}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={14} color="#aaa" />
                        <Text style={styles.infoLabel}>방장</Text>
                        <Text style={styles.infoValue}>{created_by}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#aaa" />
                        <Text style={styles.infoLabel}>생성일</Text>
                        <Text style={styles.infoValue}>{created_at?.toString().split('T')[0]}</Text>
                    </View>
                </View>

                {/* 입력 폼 카드 */}
                <View style={styles.formCard}>
                    <Text style={styles.fieldLabel}>그룹 이름</Text>
                    <TextInput
                        style={styles.input}
                        placeholderTextColor={ic.placeholder}
                        placeholder="그룹 이름"
                        value={groupName}
                        onChangeText={setGroupName}
                        autoCapitalize="none"
                    />

                    <Text style={styles.fieldLabel}>최대 인원</Text>
                    <TextInput
                        style={styles.input}
                        placeholderTextColor={ic.placeholder}
                        placeholder="최대 인원수"
                        value={people_count}
                        onChangeText={setPeopleCount}
                        keyboardType="numeric"
                    />

                    <View>
                        <Text style={styles.fieldLabel}>목표 도서</Text>
                        <Text style={styles.targetBook}>
                            {bookTitle}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={ic.placeholder}
                            placeholder="목표 도서 (선택)"
                            value={searchTitle}
                            onChangeText={handleSearch}
                        />
                        <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled>
                            {searchResults.map((book) => {
                                return (
                                    <TouchableOpacity
                                        style={[styles.searchResult,
                                        selectedBook === book && { backgroundColor: 'gray' }]}
                                        key={book.book_id}
                                        onPress={() => {
                                            console.log('선택한 책:', book);
                                            console.log('선택한 book_id:', book.book_id);
                                            console.log('선택한 책 isbn: ', book.isbn);
                                            setSelectedBook(book);
                                            setSearchTitle(book.title)
                                        }}
                                    >
                                        <Text style={styles.searchResultTitle}>{book.title}</Text>
                                        <Text style={styles.searchResultAuthor}>{book.author}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    <Text style={styles.fieldLabel}>목표 날짜</Text>
                    {Platform.OS === 'web' ? (
                        <input
                            type="date"
                            value={targetDate ? targetDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => setTargetDate(e.target.value ? new Date(e.target.value) : undefined)}
                            style={{ padding: 12, fontSize: 15, borderRadius: 10, borderColor: '#ddd', borderWidth: 1 }}
                        />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
                                <Text style={{ color: targetDate ? "#111" : "#aaa", fontSize: 15 }}>
                                    {targetDate ? targetDate.toISOString().split('T')[0] : '목표 날짜 선택'}
                                </Text>
                            </TouchableOpacity>
                            {showPicker && (
                                <DateTimePicker
                                    value={targetDate ?? new Date()}
                                    mode="date"
                                    onChange={(event, selectedDate) => {
                                        setShowPicker(false);
                                        if (selectedDate) setTargetDate(selectedDate);
                                    }}
                                />
                            )}
                        </>
                    )}
                </View>

                {/* 액션 버튼 */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteGroup} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FF5252" /> : <Text style={styles.deleteBtnText}>그룹 삭제</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleUpdateGroup} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>수정 완료</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F0F0F8", paddingBottom: 50 },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        gap: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
    },

    infoCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#fff",
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
    },
    infoLabel: {
        fontSize: 13,
        color: "#aaa",
        flex: 1,
        marginLeft: 4,
    },
    infoValue: {
        fontSize: 13,
        color: "#111",
        fontWeight: "500",
    },

    formCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#fff",
        gap: 8,
    },
    fieldLabel: {
        fontSize: 12,
        color: "#aaa",
        marginTop: 4,
    },
    targetBook: {
        color: "#111",
        fontWeight: "500",
        paddingVertical: 10,
        alignSelf: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: "#fafafa",
        color: "#111",
    },

    actionRow: {
        flexDirection: "row",
        marginHorizontal: 20,
        gap: 8,
    },
    deleteBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#FFE0E0",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    deleteBtnText: {
        fontSize: 14,
        color: "#FF5252",
        fontWeight: "600",
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#6C63FF",
        alignItems: "center",
    },
    confirmBtnText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "600",
    },

    searchResult: {
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F9FA',
    },
    searchResultTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    searchResultAuthor: {
        fontSize: 12,
        color: Colors.textTertiary,
        marginTop: 2,
    },
});