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

export default function GoalsScreen() {
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
    readingDates.length > 0 ? Math.ceil(book.total_pages / readingDates.length) : 0;

  const calendarDays = useMemo(() => {
    const firstDate = new Date(currentYear, currentMonth, 1);
    const lastDate = new Date(currentYear, currentMonth + 1, 0);
    const firstDay = firstDate.getDay();
    const lastDay = lastDate.getDate();

    const prevLastDate = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      date: Date;
      day: number;
      currentMonth: boolean;
      dateString: string;
    }[] = [];

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
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
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
        `http://localhost:3000/books/search?query=${encodeURIComponent(text)}`,
      );

      const data = await res.json();

      setSearchResults(data);
    } catch (error) {
      console.log(error);
    } finally {
      setSearchLoading(false);
    }
  };



  const openBookModal = () => {
    setTempTitle(book.title);
    setTempAuthor(book.author);
    setTempPages(String(book.total_pages));
    setSearchTitle('');
    setTitleOpen(false);
    setBookModalVisible(true);
  };

  const applyTempBook = () => {
    if (!tempTitle.trim() || !tempAuthor.trim() || !tempPages.trim()) {
      Alert.alert('알림', '제목, 저자, 총 페이지 수를 입력해주세요.');
      return;
    }

    setBook({
      ...book,
      title: tempTitle,
      author: tempAuthor,
      total_pages: Number(tempPages),
    });

    setBookModalVisible(false);
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
      <Text style={styles.pageTitle}>목표설정</Text>

      {step === 'book' ? (
        <View style={styles.screen}>
          <Pressable style={styles.bookAddBox} onPress={openBookModal}>
            <Text style={styles.plusText}>+ 책 추가</Text>
          </Pressable>

          <View style={styles.bookInfoBox}>
            <InfoRow label="제목 :" value={book.title} />
            <InfoRow label="저자 :" value={book.author} />
            <InfoRow label="총 페이지 수 :" value={`${book.total_pages}`} />
          </View>

          <Pressable style={styles.mainButton} onPress={() => setStep('plan')}>
            <Text style={styles.mainButtonText}>계획 생성하기</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
          <View style={styles.bookTopInfo}>
            <InfoRow label="제목 :" value={book.title} />
            <InfoRow label="저자 :" value={book.author} />
          </View>

          <View style={styles.calendarBox}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => moveMonth('prev')}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>

              <View style={styles.calendarSelectBox}>
                <Text style={styles.calendarSelectText}>{monthNames[currentMonth]}</Text>
              </View>

              <View style={styles.calendarSelectBox}>
                <Text style={styles.calendarSelectText}>{currentYear}</Text>
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
                const selected = isStartDate(item.dateString) || isEndDate(item.dateString);
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
            <Text style={styles.resultLabel}>하루 목표량 :</Text>
            <View style={styles.fakeInput}>
              <Text>{dailyPages}</Text>
            </View>
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.resultNumber}>{readingDates.length}</Text>
            <Text style={styles.resultText}>실제 독서일 / 총 일</Text>
          </View>

          <Pressable style={styles.mainButton} onPress={createGoal}>
            <Text style={styles.mainButtonText}>이대로 목표 적용하기</Text>
          </Pressable>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <Text>통계</Text>
        <Text>달력</Text>
        <Text>홈</Text>
        <Text>그룹</Text>
        <Text>추천</Text>
      </View>

      <Modal transparent visible={bookModalVisible} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.bookModalBox}>
            <Text style={styles.bookModalTitle}>책 추가하기</Text>

            <Pressable
              style={styles.searchHeader}
              onPress={() => setTitleOpen((prev) => !prev)}
            >
              <Text style={styles.searchHeaderText}>+ 제목</Text>
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
                  <Text style={{ marginTop: 10 }}>검색 중...</Text>
                ) : (
                  searchResults.map((item, index) => (
                    <Pressable
                      key={index}
                      style={styles.searchResult}
                      onPress={() => {
                        setBook({
                          book_id: item.book_id || `temp-${index}`,
                          title: item.title,
                          author: item.author,
                          total_pages: item.total_pages || 0,
                        });

                        setTempTitle(item.title);
                        setTempAuthor(item.author);
                        setTempPages(String(item.total_pages || 0));

                        setTitleOpen(false);
                      }}
                    >
                      <Text style={styles.searchResultTitle}>
                        {item.title}
                      </Text>

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
                style={styles.modalSmallButton}
                onPress={() => setBookModalVisible(false)}
              >
                <Text>취소</Text>
              </Pressable>

              <Pressable style={styles.modalSmallButton} onPress={applyTempBook}>
                <Text>확인</Text>
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
    width: 390,
    minHeight: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingTop: 30,
  },
  pageTitle: {
    color: '#1e90ff',
    fontSize: 16,
    marginLeft: 18,
    marginBottom: 10,
    fontWeight: '600',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  bookAddBox: {
    width: 210,
    height: 300,
    backgroundColor: '#eee',
    borderRadius: 10,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 45,
  },
  plusText: {
    fontSize: 20,
  },
  bookInfoBox: {
    backgroundColor: '#e4f3e8',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 50,
    marginTop: 85,
  },
  bookTopInfo: {
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 55,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 9,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  mainButton: {
    width: 210,
    backgroundColor: '#6f51b5',
    borderRadius: 12,
    paddingVertical: 12,
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  calendarBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 18,
    marginTop: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrowText: {
    fontSize: 32,
    fontWeight: '700',
  },
  calendarSelectBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  calendarSelectText: {
    fontSize: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekText: {
    width: 36,
    textAlign: 'center',
    color: '#777',
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: 46,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  rangeDay: {
    backgroundColor: '#f1f1f1',
  },
  selectedDate: {
    backgroundColor: '#333',
  },
  calendarDayText: {
    fontSize: 15,
  },
  selectedDateText: {
    color: '#fff',
    fontWeight: '700',
  },
  otherMonthText: {
    color: '#bbb',
  },
  selectedDateBox: {
    marginTop: 10,
    alignItems: 'center',
  },
  selectedDateTextSmall: {
    fontSize: 12,
    color: '#555',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 30,
  },
  dayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDay: {
    backgroundColor: '#2f751c',
  },
  dayText: {
    fontSize: 13,
  },
  activeDayText: {
    color: '#fff',
    fontWeight: '700',
  },
  resultInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 6,
  },
  resultLabel: {
    fontSize: 16,
  },
  fakeInput: {
    width: 135,
    height: 28,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 18,
  },
  resultNumber: {
    fontSize: 56,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 13,
    textAlign: 'center',
  },
  bottomNav: {
    height: 55,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookModalBox: {
    width: 360,
    backgroundColor: '#d9d9d9',
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  bookModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 28,
  },
  searchHeader: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 28,
    marginBottom: 14,
  },
  searchHeaderText: {
    fontSize: 28,
    color: '#aaa',
    fontWeight: '600',
  },
  searchDropdown: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 22,
    minHeight: 170,
    marginBottom: 14,
  },
  searchInput: {
    fontSize: 20,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#aaa',
    paddingBottom: 8,
    marginBottom: 18,
  },
  searchResult: {
    marginTop: 6,
  },
  searchResultText: {
    fontSize: 22,
    color: '#aaa',
  },
  manualInputBox: {
    width: '100%',
    gap: 10,
  },
  manualInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalSmallButton: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  searchResultTitle: {
  fontSize: 17,
  fontWeight: '700',
},

searchResultAuthor: {
  fontSize: 13,
  color: '#666',
  marginTop: 2,
},
});