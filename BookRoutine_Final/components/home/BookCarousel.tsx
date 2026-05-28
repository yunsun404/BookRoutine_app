import ProgressBar from "@/components/common/ProgressBar";
import { Colors, FontSize, Spacing } from "@/components/constants/tokens";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
};

export default function BookCarousel({ books }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (books.length === 0) return null;

  const book = books[currentIndex];

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) => Math.min(books.length - 1, i + 1));

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {books.length > 1 && (
          <TouchableOpacity
            onPress={goPrev}
            disabled={currentIndex === 0}
            accessibilityLabel="이전 책"
            style={styles.arrow}
          >
            <Text
              style={[
                styles.arrowText,
                currentIndex === 0 && styles.arrowDisabled,
              ]}
            >
              ‹
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bookCard}>
          {book.coverUrl ? (
            <Image
              source={{ uri: book.coverUrl }}
              style={styles.bookImage}
              resizeMode="cover"
              accessibilityLabel={`${book.title} 표지`}
            />
          ) : (
            <BookPlaceholder book={book} />
          )}
        </View>

        {books.length > 1 && (
          <TouchableOpacity
            onPress={goNext}
            disabled={currentIndex === books.length - 1}
            accessibilityLabel="다음 책"
            style={styles.arrow}
          >
            <Text
              style={[
                styles.arrowText,
                currentIndex === books.length - 1 && styles.arrowDisabled,
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ProgressBar
        value={book.currentPage}
        max={book.totalPages}
        style={styles.progressBar}
      />
      <Text style={styles.pageCount}>
        {book.currentPage} / {book.totalPages}쪽
      </Text>
    </View>
  );
}

function BookPlaceholder({ book }: { book: Book }) {
  return (
    <View style={styles.placeholder}>
      {book.author && (
        <Text style={styles.placeholderAuthor}>{book.author}</Text>
      )}
      <Text style={styles.placeholderTitle}>{book.title}</Text>
      <View style={styles.placeholderDeco} />
      {book.subtitle && (
        <Text style={styles.placeholderSubtitle}>{book.subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  arrow: {
    padding: Spacing.xs,
    width: 32,
    alignItems: "center",
  },
  arrowText: {
    fontSize: 28,
    color: Colors.textSecondary,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  bookCard: {
    width: 148,
    height: 210,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  bookImage: {
    width: "100%",
    height: "100%",
  },
  progressBar: {
    width: 148,
    marginTop: 10,
  },
  pageCount: {
    textAlign: "center",
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    gap: 6,
  },
  placeholderAuthor: {
    fontSize: 9,
    color: "#8a7a5a",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  placeholderTitle: {
    fontSize: 20,
    color: "#f0e6cc",
    textAlign: "center",
    lineHeight: 26,
  },
  placeholderDeco: {
    width: 40,
    height: 2,
    backgroundColor: "#c8a84b",
    marginVertical: 4,
  },
  placeholderSubtitle: {
    fontSize: 11,
    color: "#a09070",
    textAlign: "center",
  },
});
