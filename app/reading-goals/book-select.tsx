// app/reading-goals/book-select.tsx
import { authFetch, BASE_URL } from "@/constants/api";
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { styles } from '../styles/goals.styles';

type Book = {
  book_id: string;
  title: string;
  author: string;
  total_pages: number;
  isbn?: string;
  cover?: string;
};

export default function BookSelectScreen() {
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');

  const [tempTitle, setTempTitle] = useState('');
  const [tempAuthor, setTempAuthor] = useState('');
  const [tempPages, setTempPages] = useState('');
  const [tempIsbn, setTempIsbn] = useState('');
  const [tempBookId, setTempBookId] = useState('');
  const [tempCover, setTempCover] = useState('');

  const openBookModal = () => {
    setTempTitle('');
    setTempAuthor('');
    setTempPages('');
    setTempIsbn('');
    setTempBookId('');
    setTempCover('');
    setSearchTitle('');
    setSearchResults([]);
    setTitleOpen(false);
    setBookModalVisible(true);
  };

  const applyTempBook = () => {
    if (!tempTitle.trim() || !tempAuthor.trim() || !tempPages.trim()) {
      Alert.alert('알림', '제목, 지은이, 쪽수를 모두 입력해주세요.');
      return;
    }

    const pageNumber = Number(tempPages);
    if (Number.isNaN(pageNumber) || pageNumber <= 0) {
      Alert.alert('알림', '쪽수는 숫자로 입력해주세요.');
      return;
    }

    setBook({
      book_id: tempBookId,
      title: tempTitle,
      author: tempAuthor,
      total_pages: pageNumber,
      isbn: tempIsbn,
      cover: tempCover,
    });

    setBookModalVisible(false);
  };

  // 💡 이전 단일 파일 시절의 정상 작동하던 백엔드 API 경로로 복구 완료
  const searchBooks = async (text: string) => {
    setSearchTitle(text);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const res = await authFetch(
        `${BASE_URL}/reading-goals/search?title=${encodeURIComponent(text)}`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("검색 중 에러 발생:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const goToPlanScreen = () => {
    if (!book) {
      Alert.alert('알림', '먼저 책을 추가해주세요!');
      return;
    }
    router.push({
      pathname: '/reading-goals/reading-plan',
      params: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        total_pages: book.total_pages,
        isbn: book.isbn || '',
        cover: book.cover || '',
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>책 선택</Text>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.bookAddBox} onPress={openBookModal}>
          <Text style={styles.plusText}>
            {book ? '+ 다른 책으로 변경하기' : '+ 책 추가'}
          </Text>
        </Pressable>

        {book ? (
          <View style={styles.card}>
            <InfoRow label="제목" value={book.title} />
            <InfoRow label="지은이" value={book.author} />
            <InfoRow label="쪽수" value={`${book.total_pages}쪽`} />
          </View>
        ) : (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
            <Text style={{ color: '#9ca3af', fontSize: 14 }}>등록된 책이 없습니다. 책을 추가해 주세요!</Text>
          </View>
        )}

        <Pressable
          style={[styles.mainButton, !book && { backgroundColor: '#d1d5db' }]}
          onPress={goToPlanScreen}
        >
          <Text style={styles.mainButtonText}>계획 생성하기</Text>
        </Pressable>
      </ScrollView>

      {/* 책 추가 팝업 모달 */}
      <Modal transparent visible={bookModalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.bookModalBox}>
            <Text style={styles.bookModalTitle}>책 추가하기</Text>

            {/* 1. 제목 입력 박스 (클릭 시 검색 드롭다운 토글) */}
            <View style={styles.manualInputBox}>
              <Pressable
                style={styles.inputRowContainer}
                onPress={() => setTitleOpen((prev) => !prev)}
              >
                <Text style={styles.inputRowLabel}>제목</Text>
                <TextInput
                  style={[styles.manualInput, { pointerEvents: 'none' }]}
                  placeholder="+ 눌러서 제목을 추가해보세요"
                  placeholderTextColor="#9ca3af"
                  value={tempTitle}
                  editable={false}
                />
              </Pressable>

              {/* 검색 드롭다운 영역 */}
              {titleOpen && (
                <View style={styles.searchDropdown}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="검색할 책 제목 입력..."
                    placeholderTextColor="#9ca3af"
                    value={searchTitle}
                    onChangeText={searchBooks}
                    autoFocus
                  />
                  {searchLoading ? (
                    <Text style={styles.loadingText}>검색 중...</Text>
                  ) : searchResults.length > 0 ? (
                    <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled>
                      {searchResults.map((item, index) => {
                        const pages = item.total_pages ?? item.subInfo?.itemPage ?? 0;
                        return (
                          <Pressable
                            key={`${item.book_id || item.id || item.isbn || item.title}-${index}`}
                            style={styles.searchResult}
                            onPress={() => {
                              setTempBookId(item.book_id || item.id || item.bookId || '');
                              setTempTitle(item.title || '');
                              setTempAuthor(item.author || '');
                              setTempPages(String(pages));
                              setTempIsbn(item.isbn13 || item.isbn || '');
                              setTempCover(item.cover || '');
                              setTitleOpen(false);
                            }}
                          >
                            <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.searchResultAuthor} numberOfLines={1}>{item.author}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : searchTitle.trim().length >= 2 ? (
                    <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* 2. 지은이 입력 박스 */}
            <View style={styles.manualInputBox}>
              <View style={styles.inputRowContainer}>
                <Text style={styles.inputRowLabel}>지은이</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="지은이"
                  placeholderTextColor="#9ca3af"
                  value={tempAuthor}
                  onChangeText={setTempAuthor}
                />
              </View>
            </View>

            {/* 3. 쪽수 입력 박스 */}
            <View style={styles.manualInputBox}>
              <View style={styles.inputRowContainer}>
                <Text style={styles.inputRowLabel}>쪽수</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="쪽수"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={tempPages}
                  onChangeText={setTempPages}
                />
              </View>
            </View>

            {/* 하단 버튼 영역 */}
            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setBookModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>

              <Pressable
                style={styles.modalConfirmButton}
                onPress={applyTempBook}
              >
                <Text style={styles.modalConfirmText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}