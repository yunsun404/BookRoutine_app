import { Colors, FontSize, Radius, Spacing } from "@/constants/tokens";
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

const API_URL = 'http://localhost:3000/reading-goals';

// Prisma Studio에서 실제 값으로 바꾸기
const USER_ID = '7ff77428-bdab-4724-9a67-ed5587217978';

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
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type Book = {
  book_id: string;
  title: string;
  author: string;
  total_pages: number;
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
  const [currentMonth, setCurrentMonth] = useState(8); // 0부터 시작, 8 = 9월

  const [startDate, setStartDate] = useState('2025-09-09');
  const [endDate, setEndDate] = useState('2025-09-30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);

  const readingDates = useMemo(() => {
    const result: Date[] = [];

    if (!startDate || !endDate) {
      return result;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return result;
    }

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

      const res = await fetch(
        `http://localhost:3000/api/v1/reading-goals/search?title=${encodeURIComponent(text)}`
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.log(error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

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

  const handleSearch = async (query) => {
    try {
      console.log("검색 시도 중:", query); // 1. 검색어 확인

      const response = await fetch(`/api/v1/reading-goals/search?title=${query}`);

      console.log("서버 응답 상태:", response.status); // 2. HTTP 상태 코드 확인 (200, 404, 500 등)

      if (!response.ok) {
        throw new Error(`서버 에러 발생: ${response.status}`);
      }

      const data = await response.json();
      console.log("받아온 검색 결과 데이터:", data); // 3. 실제 데이터 구조 확인

      setSearchResults(data);
    } catch (error) {
      console.error("검색 중 에러 발생:", error); // 4. 어디서 실패했는지 상세 로그
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
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          book_id: book.book_id,
          start_date: startDate,
          end_date: endDate,
          preferred_days: selectedDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(data);
        Alert.alert('오류', '목표 생성에 실패했습니다.');
        return;
      }

      Alert.alert('성공', '목표가 생성되었습니다.');
      console.log(data);
    } catch (error) {
      console.log(error);
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
                          book_id: item.book_id || `temp-${index}`,
                          title: item.title || '',
                          author: item.author || '',
                          total_pages: item.total_pages || 0,
                        });

                        setTempTitle(item.title || '');
                        setTempAuthor(item.author || '');
                        setTempPages(String(item.total_pages || 0));

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
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingTop: Spacing.xl,
  },

  pageTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  screen: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  scrollContent: {
    paddingBottom: Spacing.xl, //?
  },

  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: Radius.md,
    elevation: 3,
  },

  bookAddBox: {
    height: 210,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },

  plusText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
    gap: Spacing.md,
  },

  infoLabel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },

  infoValue: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },

  mainButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },

  mainButtonText: {
    color: Colors.bgPrimary,
    fontSize: FontSize.base,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },

  backButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },

  calendarBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },

  calendarTitleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  arrowText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  calendarSelectBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgSecondary,
  },

  calendarSelectText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },

  weekText: {
    width: 36,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDay: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.sm,
    marginVertical: 2,
  },

  rangeDay: {
    backgroundColor: Colors.bgPrimary,
  },

  selectedDate: {
    backgroundColor: Colors.textPrimary,
  },

  calendarDayText: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  selectedDateText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },

  otherMonthText: {
    color: Colors.textTertiary,
  },

  selectedDateBox: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },

  selectedDateTextSmall: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  dayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
  },

  activeDay: {
    backgroundColor: Colors.textPrimary,
  },

  dayText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },

  activeDayText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },

  resultInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },

  resultLabel: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  fakeInput: {
    width: 135,
    height: 34,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
  },

  fakeInputText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  resultBox: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },

  resultNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  resultText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    color: Colors.textSecondary,
  },

  bottomNav: {
    height: 60,
    borderTopWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgPrimary,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
  },

  navItem: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  navItemActive: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookModalBox: {
    width: 360,
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },

  bookModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.lg,
    color: Colors.textPrimary,
  },

  searchHeader: {
    width: '100%',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  searchHeaderText: {
    fontSize: 20,
    color: Colors.textTertiary,
    fontWeight: '600',
  },

  searchDropdown: {
    width: '100%',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
   minHeight: 150,
    maxHeight: 260,
    marginBottom: Spacing.md,
  },

  searchInput: {
    fontSize: 18,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },

  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
  },

  emptyText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
  },

  searchResult: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  searchResultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  searchResultAuthor: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  manualInputBox: {
    width: '100%',
    gap: Spacing.sm,
  },

  manualInput: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },

  modalCancelButton: {
    width: 110,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },

  modalConfirmButton: {
    width: 110,
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },

  modalCancelText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  modalConfirmText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },
});