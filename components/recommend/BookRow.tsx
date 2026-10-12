import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type RowBook = {
  key: string;
  title: string;
  author?: string | null;
  coverUrl: string | null;
  onPress: () => void;
};

type Props = {
  books: RowBook[];
};

const CARD_WIDTH = 114;
const CARD_GAP = 16;

// 추천 화면 가로 책 목록
// 폰에서는 손가락으로 넘기고, 웹은 마우스로 끌어서 넘길 수 없어서 좌우 화살표 버튼을 함께 보여준다.
export default function BookRow({ books }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const showArrows = Platform.OS === "web";
  const canPrev = scrollX > 4;
  const canNext = scrollX + viewWidth < contentWidth - 4;

  const move = (direction: 1 | -1) => {
    // 한 번에 보이는 카드 수만큼(최소 1장) 넘긴다
    const step = Math.max(CARD_WIDTH + CARD_GAP, Math.floor(viewWidth / (CARD_WIDTH + CARD_GAP)) * (CARD_WIDTH + CARD_GAP));
    const next = Math.max(0, Math.min(scrollX + step * direction, contentWidth - viewWidth));
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View onLayout={(e: LayoutChangeEvent) => setViewWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
      >
        {books.map((book) => (
          <Pressable
            key={book.key}
            style={({ pressed }) => [styles.bookCard, pressed && { opacity: 0.8 }]}
            onPress={book.onPress}
          >
            <View style={styles.coverWrapper}>
              {book.coverUrl ? (
                <Image source={{ uri: book.coverUrl }} style={styles.coverImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>BOOK</Text>
                </View>
              )}
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
              {!!book.author && <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {showArrows && canPrev && (
        <Pressable style={[styles.arrow, styles.arrowLeft]} onPress={() => move(-1)} accessibilityLabel="이전 책 보기">
          <Ionicons name="chevron-back" size={20} color="#333" />
        </Pressable>
      )}
      {showArrows && canNext && (
        <Pressable style={[styles.arrow, styles.arrowRight]} onPress={() => move(1)} accessibilityLabel="다음 책 보기">
          <Ionicons name="chevron-forward" size={20} color="#333" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollPadding: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  // 💡 홈화면 BookCarousel 규격을 참고한 디자인 구조
  bookCard: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  coverWrapper: {
    width: CARD_WIDTH,
    height: 165,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
  },
  placeholderText: {
    color: "#BDBDBD",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bookInfo: {
    paddingHorizontal: 2,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 11,
    color: "#777",
  },
  // 웹 전용 좌우 화살표 (표지 높이 가운데)
  arrow: {
    position: "absolute",
    top: 4 + 165 / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  arrowLeft: { left: 6 },
  arrowRight: { right: 6 },
});
