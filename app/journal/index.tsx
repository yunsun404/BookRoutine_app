import { GowunBatang_400Regular, GowunBatang_700Bold, useFonts } from '@expo-google-fonts/gowun-batang';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { createJournal, fetchJournal, HttpError } from '@/lib/api/journal';
import type { Journal, JournalChecklistItem, JournalHighlight } from '@/lib/types/journal';
import { C, styles } from '../styles/journal.styles';

/* ---------- date utils (로컬 기준 — toISOString은 UTC라 KST에서 하루 밀림) ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const shiftKey = (k: string, days: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + days);
  return toKey(d);
};
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const labelOf = (k: string) => {
  const d = fromKey(k);
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())} (${DOW[d.getDay()]})`;
};

/* ---------- screen ---------- */
export default function JournalScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const todayKey = toKey(new Date());
  const [date, setDate] = useState(params.date ?? todayKey);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold });
  const serif = fontsLoaded ? 'GowunBatang_400Regular' : undefined;
  const serifBold = fontsLoaded ? 'GowunBatang_700Bold' : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setCreateError(null);
    try {
      setJournal(await fetchJournal(date));
    } catch (e) {
      console.warn('[journal] load failed', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const onCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      setJournal(await createJournal(date));
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) load();
      else if (e instanceof HttpError && e.status === 422) setCreateError('이 날은 독서 기록이 없어서 일지를 만들 수 없어요.');
      else setCreateError('일지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCreating(false);
    }
  };

  const isToday = date >= todayKey;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>AI 일지</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <View style={styles.dateRow}>
          <View style={styles.datePill}>
            <Pressable style={styles.dateArrow} onPress={() => setDate(shiftKey(date, -1))} accessibilityLabel="이전 날짜">
              <Ionicons name="chevron-back" size={16} color={C.inkSub} />
            </Pressable>
            <Text style={styles.dateText}>{labelOf(date)}</Text>
            <Pressable
              style={[styles.dateArrow, isToday && { opacity: 0.35 }]}
              onPress={() => !isToday && setDate(shiftKey(date, 1))}
              disabled={isToday}
              accessibilityLabel="다음 날짜"
            >
              <Ionicons name="chevron-forward" size={16} color={C.inkSub} />
            </Pressable>
          </View>
          <Text style={styles.dateCaption}>오늘의 독서 기록</Text>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>일지를 불러오지 못했어요.{'\n'}네트워크 연결을 확인하고 다시 시도해 주세요.</Text>
            <Pressable style={styles.primaryBtn} onPress={load}>
              <Text style={styles.primaryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : !journal ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>아직 이 날의 일지가 없어요.{'\n'}그날의 타래와 집중 기록으로 AI가 일지를 써 드려요.</Text>
            <Pressable style={[styles.primaryBtn, creating && { opacity: 0.7 }]} onPress={onCreate} disabled={creating}>
              {creating
                ? <ActivityIndicator color={C.white} />
                : <Text style={styles.primaryBtnText}>일지 만들기</Text>}
            </Pressable>
            {createError && <Text style={[styles.stateText, { color: C.peachText, fontSize: 12 }]}>{createError}</Text>}
          </View>
        ) : (
          <>
            <Hero journal={journal} serifBold={serifBold} />

            <View style={styles.contentCard}>
              <Text style={[styles.contentText, serif ? { fontFamily: serif } : null]}>{journal.content}</Text>
            </View>

            {journal.highlights.length > 0 && <Highlights items={journal.highlights} serif={serif} />}

            <View style={styles.row}>
              <ChecklistCard items={journal.checklist} />
              <View style={styles.col}>
                <FocusCard score={journal.focus.score} />
                <GoldenCard hour={journal.focus.golden_hour} />
              </View>
            </View>

            {!!journal.next_suggestion && <SuggestionCard text={journal.next_suggestion} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- 표지 + 일지 제목 ---------- */
function Hero({ journal, serifBold }: { journal: Journal; serifBold?: string }) {
  const { book } = journal;
  return (
    <View style={styles.hero}>
      <View style={styles.coverWrap}>
        <View style={styles.cover}>
          {book?.cover_url
            ? <Image source={{ uri: book.cover_url }} style={styles.coverImg} resizeMode="cover" />
            : <Ionicons name="book-outline" size={26} color={C.primaryText} />}
        </View>
      </View>
      <View style={styles.heroBody}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color={C.purpleText} />
          <Text style={styles.aiBadgeText}>AI 독서 일지</Text>
        </View>
        <Text style={[styles.journalTitle, serifBold ? { fontFamily: serifBold, fontWeight: undefined } : null]}>
          {journal.title}
        </Text>
        {book && <Text style={styles.bookMeta} numberOfLines={1}>{book.title} · {book.author}</Text>}
      </View>
    </View>
  );
}

/* ---------- 오늘의 문장 ---------- */
function Highlights({ items, serif }: { items: JournalHighlight[]; serif?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>오늘의 문장</Text>
        <Text style={styles.sectionCount}>{items.length}개</Text>
      </View>
      {items.map((h) => (
        <View key={h.sentence_id} style={styles.quoteCard}>
          <View style={styles.quoteBar} />
          <View style={styles.quoteBody}>
            <Text style={[styles.quoteText, serif ? { fontFamily: serif } : null]}>{h.text}</Text>
            {h.page != null && <Text style={styles.quotePage}>p.{h.page}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ---------- 체크리스트 (기록용, 읽기 전용) ---------- */
function ChecklistCard({ items }: { items: JournalChecklistItem[] }) {
  const done = items.filter((i) => i.check_box).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>체크리스트</Text>
        <Text style={styles.countText}>{done}/{items.length}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      {items.length === 0 ? (
        <Text style={styles.emptySmall}>이 날은 체크리스트가 없어요.</Text>
      ) : (
        items.map((item) => (
          <View key={item.checklist_id} style={styles.checkItem}>
            <View style={[styles.checkBox, item.check_box && styles.checkBoxOn]}>
              {item.check_box && <Ionicons name="checkmark" size={13} color={C.white} />}
            </View>
            <Text style={[styles.checkLabel, item.check_box && styles.checkLabelOn]}>{item.goal_content}</Text>
          </View>
        ))
      )}
    </View>
  );
}

/* ---------- 집중도 링 ---------- */
const R = 46;
const CIRC = 2 * Math.PI * R;

function FocusCard({ score }: { score: number | null }) {
  const s = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <View style={styles.focusCard}>
      <Text style={styles.focusTitle}>집중도</Text>
      <View style={styles.ringBox} accessible accessibilityLabel={`오늘의 집중도 ${score ?? '없음'}점`}>
        <Svg width={104} height={104} viewBox="0 0 112 112">
          <Circle cx={56} cy={56} r={R} stroke={C.darkTrack} strokeWidth={10} fill="none" />
          <Circle
            cx={56} cy={56} r={R}
            stroke={s >= 50 ? C.purple : C.primary} strokeWidth={10} fill="none" strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - s / 100)}
            transform="rotate(-90 56 56)"
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.scoreNum}>{score ?? '-'}</Text>
          <Text style={styles.scoreUnit}>점</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- 골든타임 ---------- */
function GoldenCard({ hour }: { hour: number | null }) {
  return (
    <View style={styles.goldenCard}>
      <View style={styles.goldenHead}>
        <Ionicons name="time-outline" size={14} color={C.peachText} />
        <Text style={styles.goldenLabel}>골든타임</Text>
      </View>
      {hour == null
        ? <Text style={styles.goldenEmpty}>측정 기록 없음</Text>
        : <Text style={styles.goldenHour}>{hour}시</Text>}
    </View>
  );
}

/* ---------- 다음 독서 제안 ---------- */
function SuggestionCard({ text }: { text: string }) {
  return (
    <View style={styles.suggestCard}>
      <View style={styles.suggestIcon}>
        <Ionicons name="bulb-outline" size={18} color={C.white} />
      </View>
      <View style={styles.suggestBody}>
        <Text style={styles.suggestLabel}>다음 독서 제안</Text>
        <Text style={styles.suggestText}>{text}</Text>
      </View>
    </View>
  );
}