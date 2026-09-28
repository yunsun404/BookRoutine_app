import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type Book = {
  id: string;
  title: string;
  author?: string;
  subtitle?: string;
  coverUrl?: string | null;
  currentPage: number;
  totalPages: number;
};

type Props = {
  books: Book[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onPress?: () => void;
};

/* 리디자인 색상 (이 파일 안에서만 사용) */
const C = {
  primary: "#6B7BFF",
  ink: "#1F2233",
  inkSub: "#6E7191",
  inkMute: "#A0A3BD",
  card: "#FFFFFF",
  line: "#ECECF3",
  peach: "#FF8A7C",
  peachSoft: "#FFF1EE",
  primarySoft: "#EEF0FF",
};

/*
 * 온도 게이지 색
 * - 50% 미만: 차가운 파란 계열 (회청 → 파랑)
 * - 50% 이상: 뜨거운 계열로 전환 (주황 → 다홍 → 빨강)
 */
const WARM_THRESHOLD = 0.5;

// 0% ~ 50% 미만 구간 (0~1로 정규화된 위치)
const COLD_STOPS: [number, string][] = [
  [0, "#9AA8C7"], // 회청
  [0.5, "#7F9BE0"], // 하늘빛 파랑
  [1, "#4F6BFF"], // 진한 파랑
];

// 50% ~ 100% 구간 (0~1로 정규화된 위치)
const WARM_STOPS: [number, string][] = [
  [0, "#FFB35C"], // 주황
  [0.5, "#FF7A4D"], // 다홍
  [1, "#F2453D"], // 빨강
];

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixStops(stops: [number, string][], t: number) {
  const r = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i - 1];
    const [p2, c2] = stops[i];
    if (r <= p2) {
      const k = (r - p1) / (p2 - p1);
      const a = hexToRgb(c1);
      const b = hexToRgb(c2);
      const mix = a.map((v, j) => Math.round(v + (b[j] - v) * k));
      return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
    }
  }
  return stops[stops.length - 1][1];
}

export function gaugeColor(ratio: number) {
  const r = Math.max(0, Math.min(1, ratio));
  if (r < WARM_THRESHOLD) {
    return mixStops(COLD_STOPS, r / WARM_THRESHOLD);
  }
  return mixStops(WARM_STOPS, (r - WARM_THRESHOLD) / (1 - WARM_THRESHOLD));
}

const EMPTY_SLOT_ID = "empty-slot"; // homescreen.tsx의 "책 등록하기" 슬롯

export default function BookCarousel({ books, currentIndex, onIndexChange, onPress }: Props) {
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef(currentIndex);
  const programmatic = useRef(false);
  const fromSwipe = useRef(false);

  // 점을 누르거나 목록이 줄어서 인덱스가 바뀌면 해당 페이지로 이동
  useEffect(() => {
    if (!width) return;
    if (fromSwipe.current) {
      // 손으로 넘긴 경우는 이미 그 위치에 있으므로 다시 스크롤하지 않음
      fromSwipe.current = false;
      return;
    }
    lastIndex.current = currentIndex;
    programmatic.current = true;
    scrollRef.current?.scrollTo({ x: currentIndex * width, animated: true });
    const t = setTimeout(() => (programmatic.current = false), 450);
    return () => clearTimeout(t);
  }, [currentIndex, width]);

  if (books.length === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width || programmatic.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== lastIndex.current && idx >= 0 && idx < books.length) {
      lastIndex.current = idx;
      fromSwipe.current = true;
      onIndexChange(idx);
    }
  };

  return (
    <View style={styles.section} onLayout={onLayout}>
      {width > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={64}
        >
          {books.map((book) => (
            <View key={book.id} style={{ width }}>
              {book.id === EMPTY_SLOT_ID ? (
                <AddBookCard onPress={onPress} />
              ) : (
                <BookCard book={book} onPress={onPress} />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {books.length > 1 && (
        <View style={styles.dots}>
          {books.map((b, i) => (
            <Pressable
              key={b.id}
              onPress={() => onIndexChange(i)}
              hitSlop={6}
              accessibilityLabel={`${i + 1}번째 책`}
            >
              <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* ───────── 책 카드 ───────── */
function BookCard({ book, onPress }: { book: Book; onPress?: () => void }) {
  const ratio = book.totalPages > 0 ? book.currentPage / book.totalPages : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.bookRow}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={styles.coverEmptyText} numberOfLines={3}>{book.title}</Text>
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>독서 중</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
          {!!book.author && <Text style={styles.author} numberOfLines={1}>{book.author}</Text>}
        </View>
      </View>

      <TemperatureGauge ratio={ratio} current={book.currentPage} total={book.totalPages} />
    </Pressable>
  );
}

/* ───────── 온도 게이지 ───────── */
function TemperatureGauge({ ratio, current, total }: { ratio: number; current: number; total: number }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const pct = Math.round(clamped * 100);
  const color = gaugeColor(clamped);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 700, useNativeDriver: false }).start();
  }, [clamped]);

  const fillWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeRow}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: color }]} />
        </View>
        <Text style={[styles.temp, { color }]}>
          {pct}
          <Text style={styles.tempUnit}>°C</Text>
        </Text>
      </View>
      <Text style={styles.pageCount}>{current} / {total}쪽</Text>
    </View>
  );
}

/* ───────── 책 추가 카드 (마지막 슬롯) ───────── */
function AddBookCard({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.addCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.addIcon}>
        <Ionicons name="add" size={26} color={C.primary} />
      </View>
      <Text style={styles.addTitle}>새 책 추가하기</Text>
      <Text style={styles.addSub}>읽고 싶은 책을 등록하고 목표를 세워요</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 부모(carouselContainer)가 alignItems:center여도 폭을 꽉 채우도록
  section: { alignSelf: "stretch", width: "100%" },

  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 20,
    shadowColor: "#4B55C8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginVertical: 6,
    marginHorizontal: 2,
  },
  bookRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  cover: { width: 78, height: 113, borderRadius: 8, backgroundColor: C.line },
  coverEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: C.primarySoft, padding: 6 },
  coverEmptyText: { fontSize: 12, fontWeight: "700", color: C.primary, textAlign: "center" },
  info: { flex: 1, gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: C.peachSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.peach },
  badgeText: { fontSize: 12, fontWeight: "700", color: C.peach },
  title: { fontSize: 20, fontWeight: "700", color: C.ink, letterSpacing: -0.4 },
  author: { fontSize: 13, fontWeight: "500", color: C.inkSub },

  gaugeWrap: { marginTop: 18, gap: 6 },
  gaugeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { flex: 1, height: 10, borderRadius: 10, backgroundColor: C.line, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 10 },
  temp: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, minWidth: 64, textAlign: "right" },
  tempUnit: { fontSize: 13, fontWeight: "700" },
  pageCount: { fontSize: 12, fontWeight: "600", color: C.inkMute },

  addCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderWidth: 1.5,
    borderColor: C.line,
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
    gap: 6,
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  addTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  addSub: { fontSize: 13, color: C.inkSub },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotActive: { width: 18, backgroundColor: C.primary },
});