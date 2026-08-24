// app/reading-goals/reading-plan.tsx
import { authFetch, BASE_URL } from "@/constants/api";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { styles } from '../styles/goals.styles';

const API_URL = `${BASE_URL}/reading-goals`;

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

type CalendarCell = {
  date: Date;
  day: number;
  currentMonth: boolean;
  dateString: string;
};

export default function ReadingPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 이전 화면에서 전달받은 책 정보
  const book = {
    book_id: (params.book_id as string) || '',
    title: (params.title as string) || '',
    author: (params.author as string) || '',
    total_pages: Number(params.total_pages) || 0,
    isbn: (params.isbn as string) || '',
  };

  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(8);

  const [startDate, setStartDate] = useState('2025-09-09');
  const [endDate, setEndDate] = useState('2025-09-30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);

  // 시작일과 종료일이 모두 선택되었을 때, 그 기간에 포함되는 요일 자동 추출
  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    if (start > end) return;

    const daySet = new Set<number>();
    const current = new Date(start);

    while (current <= end) {
      daySet.add(current.getDay());
      current.setDate(current.getDate() + 1);
    }

    setSelectedDays(Array.from(daySet));
  }, [startDate, endDate]);

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
        : [...prev, day].sort((a, b) => a - b),
    );
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
      <Text style={styles.pageTitle}>계획 설정</Text>

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

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>책 다시 선택하기</Text>
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