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

const defaultBook = {
  book_id: '160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a',
  title: '데미안',
  author: '헤르만 헤세',
  total_pages: 212,
  isbn: '',
};

type Book = {
  book_id: string;
  title: string;
  author: string;
  total_pages: number;
  isbn?: string;
};

export default function BookSelectScreen() {
  const router = useRouter();

  const [book, setBook] = useState<Book>(defaultBook);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');
  const [tempTitle, setTempTitle] = useState('');
  const [tempAuthor, setTempAuthor] = useState('');
  const [tempPages, setTempPages] = useState('');

  const openBookModal = () => {
    setTempTitle(book.title);
    setTempAuthor(book.author);
    setTempPages(String(book.total_pages));
    setSearchTitle('');
    setSearchResults([]);
    setTitleOpen(false);
    setBookModalVisible(true);
  };

  const applyTempBook = () => {
    if (!tempTitle.trim() || !tempAuthor.trim() || !tempPages.trim()) {
      Alert.alert('알림', '제목, 저자, 총 페이지 수를 입력해주세요.');
      return;
    }

    const pageNumber = Number(tempPages);
    if (Number.isNaN(pageNumber) || pageNumber <= 0) {
      Alert.alert('알림', '총 페이지 수는 숫자로 입력해주세요.');
      return;
    }

    setBook({
      ...book,
      title: tempTitle,
      author: tempAuthor,
      total_pages: pageNumber,
    });

    setBookModalVisible(false);
  };

  const searchBooks = async (text: string) => {
    setSearchTitle(text);
    setTempTitle(text);

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

  // 💡 계획 화면으로 이동하면서 책 정보를 query params로 전달
  const goToPlanScreen = () => {
    router.push({
      pathname: '/reading-goals/reading-plan',
      params: {
        book_id: book.book_id,
        title: book.title,
        author: book.author,
        total_pages: book.total_pages,
        isbn: book.isbn || '',
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
          <Text style={styles.plusText}>+ 책 추가</Text>
        </Pressable>

        <View style={styles.card}>
          <InfoRow label="제목" value={book.title} />
          <InfoRow label="저자" value={book.author} />
          <InfoRow label="총 페이지" value={`${book.total_pages}쪽`} />
        </View>

        <Pressable style={styles.mainButton} onPress={goToPlanScreen}>
          <Text style={styles.mainButtonText}>계획 생성하기</Text>
        </Pressable>
      </ScrollView>

      {/* 하단 네비게이션 */}
      <View style={styles.bottomNav}>
        <Text style={styles.navItem}>통계</Text>
        <Text style={styles.navItem}>달력</Text>
        <Pressable onPress={() => router.push('/home')}>
          <Text style={styles.navItemActive}>홈</Text>
        </Pressable>
        <Text style={styles.navItem}>그룹</Text>
        <Text style={styles.navItem}>추천</Text>
      </View>

      {/* 책 검색 및 직접 입력 모달 */}
      <Modal transparent visible={bookModalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.bookModalBox}>
            <Text style={styles.bookModalTitle}>책 추가하기</Text>

            <Pressable
              style={styles.searchHeader}
              onPress={() => setTitleOpen((prev) => !prev)}
            >
              <Text style={styles.searchHeaderText}>+ 제목 검색</Text>
            </Pressable>

            {titleOpen && (
              <View style={styles.searchDropdown}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="제목을 입력하세요"
                  value={searchTitle}
                  onChangeText={searchBooks}
                />

                {searchLoading ? (
                  <Text style={styles.loadingText}>검색 중...</Text>
                ) : searchResults.length === 0 && searchTitle.length >= 2 ? (
                  <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
                ) : (
                  searchResults.map((item, index) => (
                    <Pressable
                      key={`${item.book_id || item.title}-${index}`}
                      style={styles.searchResult}
                      onPress={() => {
                        setBook({
                          book_id: '',
                          title: item.title || '',
                          author: item.author || '',
                          total_pages: item.subInfo?.itemPage ?? 0,
                          isbn: item.isbn || '',
                        });

                        setTempTitle(item.title || '');
                        setTempAuthor(item.author || '');
                        setTempPages(String(item.subInfo?.itemPage ?? 0));

                        setTitleOpen(false);
                      }}
                    >
                      <Text style={styles.searchResultTitle}>{item.title}</Text>
                      <Text style={styles.searchResultAuthor}>
                        {item.author}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            <View style={styles.manualInputBox}>
              <TextInput
                style={styles.manualInput}
                placeholder="제목"
                value={tempTitle}
                onChangeText={setTempTitle}
              />
              <TextInput
                style={styles.manualInput}
                placeholder="저자"
                value={tempAuthor}
                onChangeText={setTempAuthor}
              />
              <TextInput
                style={styles.manualInput}
                placeholder="총 페이지 수"
                keyboardType="number-pad"
                value={tempPages}
                onChangeText={setTempPages}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setBookModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>

              <Pressable style={styles.modalConfirmButton} onPress={applyTempBook}>
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