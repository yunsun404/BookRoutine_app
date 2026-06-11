import { Colors, FontSize, Spacing } from "@/constants/tokens";
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

// 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingTop: Spacing.xl,
  },

  pageTitle: {
    fontSize: 19, 
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl * 1.2, 
    letterSpacing: -0.5, // 자간을 살짝 좁혀 단단하고 정갈한 인상 제공
  },

  screen: {
    flex: 1,
    paddingHorizontal: Spacing.xl, 
  },

  scrollContent: {
    paddingBottom: Spacing.xl * 2.5,
  },

  // ✨ 1. 투박한 선 대신 트렌디한 블러 섀도우 매핑
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 24, // 조금 더 부드러운 곡선
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    // 💡 Expo 경고 해결 및 최신 섀도우 스타일 적용
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.02)', 
    elevation: 2,
  },

  // ✨ 2. 대시 라인을 부드러운 단색 톤온톤 박스로 변경하여 모던함 강조
  bookAddBox: {
    height: 110, // 더 컴팩트하게 줄여서 다른 요소들과의 밸런스 유지
    backgroundColor: '#F8F9FA', // 미세하게 밝은 그레이 톤으로 시선 유도
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderStyle: 'dashed',
  },

  plusText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary, // 가독성을 위해 한 단계 또렷하게 조정
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md, 
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA', // 구분선을 거의 투명에 가깝게 변경
  },

  infoLabel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  infoValue: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },

  // ✨ 3. 메인 버튼에 볼륨감을 빼고 플랫하지만 세련된 인상으로 변경
  mainButton: {
    backgroundColor: Colors.textPrimary, 
    borderRadius: 16,
    paddingVertical: 18, // 묵직하고 안정감 있는 터치 영역 확보
    alignItems: 'center',
    marginTop: Spacing.lg,
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.08)',
  },

  mainButtonText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  backButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },

  backButtonText: {
    color: Colors.textTertiary,
    fontSize: FontSize.sm,
    textDecorationLine: 'none', // 지저분한 밑줄 대신 폰트 컬러로 담백하게 표현
    opacity: 0.8,
  },

  // ✨ 4. 달력 레이아웃의 공기감(Spacing)과 비주얼 밸런싱 수정
  calendarBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 28,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.03)',
    elevation: 2,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },

  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  arrowText: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
  },

  calendarSelectBox: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6', 
  },

  calendarSelectText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },

  weekText: {
    width: `${100 / 7}%`, // 고정폭 대신 정비율 분할로 중앙 정렬 오류 방지
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDay: {
    width: `${100 / 7}%`,
    height: 44, // 터치하기 편하도록 조금 더 시원하게 확장
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14, 
    marginVertical: 2,
  },

  rangeDay: {
    backgroundColor: '#F4F5F7', // 부드러운 스킨 톤의 배경 처리
    borderRadius: 0, // 범위 선택 시 중간 일자들은 자연스럽게 이어지도록 처리
  },

  selectedDate: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 14, // 선택된 날짜는 확실하게 스쿼클 형태 유지
  },

  calendarDayText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  selectedDateText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },

  otherMonthText: {
    color: '#E5E7EB', // 투명도를 낮추는 대신 명도를 조절해 깔끔하게 처리
  },

  selectedDateBox: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },

  selectedDateTextSmall: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  // ✨ 5. 요즘 가장 힙한 조약돌(Squircle) 스타일의 요일 선택 버튼
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 14, // 원형보다 미니멀 디자인에 훨씬 잘 어울리는 라운딩 수치
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  activeDay: {
    backgroundColor: Colors.textPrimary,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  },

  dayText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  activeDayText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
  },

  resultInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    paddingHorizontal: 4,
    marginTop: Spacing.md,
  },

  resultLabel: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  fakeInput: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#EFF2FF', // 은은하게 들어가는 포인트 인풋 컬러
  },

  fakeInputText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#4F46E5', // 텍스트 컬러도 톤온톤으로 세련되게 매칭
  },

  // ✨ 6. 타이포그래피의 대비(Contrast)를 극대화한 메인 스코어보드
  resultBox: {
    alignItems: 'center',
    marginVertical: Spacing.xl * 1.5,
  },

  resultNumber: {
    fontSize: 72, // 과감하게 키워서 시선을 압도하도록 수정
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -2,
  },

  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: 6,
    letterSpacing: -0.1,
  },

  bottomNav: {
    height: 64,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: Colors.bgPrimary,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },

  navItem: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  navItemActive: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // ✨ 7. 고급 호텔 가이드 컴포넌트 느낌의 세련된 모달 레이아웃
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)', // 검은 장막 느낌을 빼고 투명하고 화사하게 가림 처리
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookModalBox: {
    width: '90%', 
    backgroundColor: Colors.bgPrimary,
    borderRadius: 28,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    boxShadow: '0px 20px 48px rgba(0, 0, 0, 0.12)',
    elevation: 5,
  },

  bookModalTitle: {
    fontSize: 19, 
    fontWeight: '700',
    marginBottom: Spacing.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  searchHeader: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: Spacing.md,
  },

  searchHeaderText: {
    fontSize: 14, 
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  searchDropdown: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: Spacing.md,
    maxHeight: 220,
    marginBottom: Spacing.md,
  },

  searchInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFEF',
    paddingBottom: 10,
    marginBottom: Spacing.sm,
  },

  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  searchResult: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },

  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },

  searchResultAuthor: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
  },

  manualInputBox: {
    width: '100%',
    gap: Spacing.md,
  },

  manualInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },

  modalCancelButton: {
    flex: 1, 
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },

  modalConfirmText: {
    color: Colors.bgPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
});