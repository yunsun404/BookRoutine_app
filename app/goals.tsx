// app/reading-goals/index.tsx (또는 해당 화면 컴포넌트 파일)
import { authFetch, BASE_URL } from "@/constants/api";
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { styles } from './styles/goals.styles';

const API_URL = `${BASE_URL}/reading-goals`;

const defaultBook = {
  book_id: '160cdda3-cc2e-4715-b8e4-6d7fcfd3aa6a',
  title: '데미안',
  author: '헤르만 헤세',
  total_pages: 212,
};

const days = [
  { label: '일', value: 0 },
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
];

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type Book = {
  book_id: string;
  title: string;
  author: string;
  total_pages: number;
  isbn?: string;
};

type CalendarCell = {
  date: Date;
  day: number;
  currentMonth: boolean;
  dateString: string;
};

export default function GoalsScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'book' | 'plan'>('book');

  const [book, setBook] = useState<Book>(defaultBook);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');
  const [tempTitle, setTempTitle] = useState('');
  const [tempAuthor, setTempAuthor] = useState('');
  const [tempPages, setTempPages] = useState('');

  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(8);

  const [startDate, setStartDate] = useState('2025-09-09');
  const [endDate, setEndDate] = useState('2025-09-30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  
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

  const readingDates = useMemo(() => {
    const result: Date[] = [];

    if (!startDate || !endDate) return result;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return result;

    const current = new Date(start);

    while (current <= end) {
      if (selectedDays.includes(current.getDay())) {
        result.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [startDate, endDate, selectedDays]);

  const dailyPages =
    readingDates.length > 0
      ? Math.ceil(book.total_pages / readingDates.length)
      : 0;

  const calendarDays = useMemo(() => {
    const firstDate = new Date(currentYear, currentMonth, 1);
    const lastDate = new Date(currentYear, currentMonth + 1, 0);

    const firstDay = firstDate.getDay();
    const lastDay = lastDate.getDate();

    const prevLastDate = new Date(currentYear, currentMonth, 0).getDate();

    const cells: CalendarCell[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevLastDate - i;
      const date = new Date(currentYear, currentMonth - 1, day);

      cells.push({
        date,
        day,
        currentMonth: false,
        dateString: formatDate(date),
      });
    }

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(currentYear, currentMonth, day);

      cells.push({
        date,
        day,
        currentMonth: true,
        dateString: formatDate(date),
      });
    }

    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - firstDay - lastDay + 1;
      const date = new Date(currentYear, currentMonth + 1, nextDay);

      cells.push({
        date,
        day: nextDay,
        currentMonth: false,
        dateString: formatDate(date),
      });
    }

    return cells;
  }, [currentMonth, currentYear]);

  const moveMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((prev) => prev - 1);
      } else {
        setCurrentMonth((prev) => prev - 1);
      }
    }

    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((prev) => prev + 1);
      } else {
        setCurrentMonth((prev) => prev + 1);
      }
    }
  };

  const selectCalendarDate = (dateString: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateString);
      setEndDate('');
      return;
    }

    if (new Date(dateString) < new Date(startDate)) {
      setEndDate(startDate);
      setStartDate(dateString);
      return;
    }

    setEndDate(dateString);
  };

  const isStartDate = (dateString: string) => dateString === startDate;
  const isEndDate = (dateString: string) => dateString === endDate;

  const isInRange = (dateString: string) => {
    if (!startDate || !endDate) return false;
    const target = new Date(dateString);
    return target >= new Date(startDate) && target <= new Date(endDate);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day],
    );
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

  const createGoal = async () => {
    if (!startDate || !endDate) {
      Alert.alert('알림', '시작일과 종료일을 선택해주세요.');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('알림', '독서할 요일을 선택해주세요.');
      return;
    }

    try {
      const res = await authFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          book_id: book.book_id !== '' ? book.book_id : undefined,
          title: book.title,
          author: book.author,
          total_pages: book.total_pages,
          isbn: book.isbn || undefined,
          start_date: startDate,
          end_date: endDate,
          preferred_days: selectedDays,
        }),
      });

      if (!res.ok) {
        Alert.alert('오류', '목표 생성에 실패했습니다.');
        return;
      }

      Alert.alert('성공', '목표가 생성되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>목표 설정</Text>

      {step === 'book' ? (
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

          <Pressable style={styles.mainButton} onPress={() => setStep('plan')}>
            <Text style={styles.mainButtonText}>계획 생성하기</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <InfoRow label="제목" value={book.title} />
            <InfoRow label="저자" value={book.author} />
            <InfoRow label="총 페이지" value={`${book.total_pages}쪽`} />
          </View>

          <View style={styles.calendarBox}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => moveMonth('prev')}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>

              <View style={styles.calendarTitleRow}>
                <View style={styles.calendarSelectBox}>
                  <Text style={styles.calendarSelectText}>
                    {monthNames[currentMonth]}
                  </Text>
                </View>

                <View style={styles.calendarSelectBox}>
                  <Text style={styles.calendarSelectText}>{currentYear}</Text>
                </View>
              </View>

              <Pressable onPress={() => moveMonth('next')}>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {days.map((day) => (
                <Text key={day.value} style={styles.weekText}>
                  {day.label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((item) => {
                const selected =
                  isStartDate(item.dateString) || isEndDate(item.dateString);
                const inRange = isInRange(item.dateString);

                return (
                  <Pressable
                    key={item.dateString}
                    style={[
                      styles.calendarDay,
                      inRange && styles.rangeDay,
                      selected && styles.selectedDate,
                    ]}
                    onPress={() => selectCalendarDate(item.dateString)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !item.currentMonth && styles.otherMonthText,
                        selected && styles.selectedDateText,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.selectedDateBox}>
            <Text style={styles.selectedDateTextSmall}>
              시작일: {startDate || '-'} / 종료일: {endDate || '-'}
            </Text>
          </View>

          <View style={styles.dayRow}>
            {days.map((day) => {
              const active = selectedDays.includes(day.value);

              return (
                <Pressable
                  key={day.value}
                  style={[styles.dayButton, active && styles.activeDay]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text style={[styles.dayText, active && styles.activeDayText]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.resultInputRow}>
            <Text style={styles.resultLabel}>하루 목표량</Text>
            <View style={styles.fakeInput}>
              <Text style={styles.fakeInputText}>{dailyPages}쪽</Text>
            </View>
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.resultNumber}>{readingDates.length}</Text>
            <Text style={styles.resultText}>실제 독서일</Text>
          </View>

          <Pressable style={styles.mainButton} onPress={createGoal}>
            <Text style={styles.mainButtonText}>이대로 목표 적용하기</Text>
          </Pressable>

          <Pressable style={styles.backButton} onPress={() => setStep('book')}>
            <Text style={styles.backButtonText}>책 다시 선택하기</Text>
          </Pressable>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <Text style={styles.navItem}>통계</Text>
        <Text style={styles.navItem}>달력</Text>

        <Pressable onPress={() => router.push('/home')}>
          <Text style={styles.navItemActive}>홈</Text>
        </Pressable>

        <Text style={styles.navItem}>그룹</Text>
        <Text style={styles.navItem}>추천</Text>
      </View>

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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}