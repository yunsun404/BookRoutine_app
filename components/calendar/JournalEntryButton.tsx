// components/calendar/JournalEntryButton.tsx
// 캘린더에서 날짜를 눌렀을 때 체크리스트 아래에 붙이는 버튼
import { createJournal, HttpError } from '@/lib/api/journal';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  date: string;            // 'YYYY-MM-DD' (로컬 기준)
  hasJournal: boolean;     // fetchJournalDates 결과에 포함되는지
  isFuture: boolean;       // 미래 날짜면 버튼 숨김
  onCreated?: (date: string) => void; // 생성 성공 시 캘린더 점 갱신용
};

export default function JournalEntryButton({ date, hasJournal, isFuture, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isFuture) return null;

  const goView = () => router.push(`/journal?date=${date}` as Href);

  const goCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await createJournal(date);
      onCreated?.(date);
      goView();
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) {
        onCreated?.(date); // 이미 있으면 그냥 보러 감
        goView();
      } else if (e instanceof HttpError && e.status === 422) {
        setError('이 날은 독서 기록이 없어서 일지를 만들 수 없어요.');
      } else {
        setError('일지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.wrap}>
      {hasJournal ? (
        <Pressable style={[s.btn, s.view]} onPress={goView} accessibilityRole="button">
          <Ionicons name="book-outline" size={18} color="#FFFFFF" />
          <Text style={s.viewText}>일지 보러가기</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[s.btn, s.create, creating && { opacity: 0.7 }]}
          onPress={goCreate}
          disabled={creating}
          accessibilityRole="button"
        >
          {creating ? (
            <>
              <ActivityIndicator size="small" color="#6D4FD6" />
              <Text style={s.createText}>AI가 일지를 쓰는 중…</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#6D4FD6" />
              <Text style={s.createText}>일지 생성하러 가기</Text>
            </>
          )}
        </Pressable>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12 },
  btn: {
    height: 52, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  view: { backgroundColor: '#6B7BFF' },
  viewText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  create: { backgroundColor: '#F0EBFF', borderWidth: 1, borderColor: '#DCD0FF' },
  createText: { color: '#6D4FD6', fontSize: 15, fontWeight: '700' },
  error: { fontSize: 12, color: '#C2402E', textAlign: 'center' },
});