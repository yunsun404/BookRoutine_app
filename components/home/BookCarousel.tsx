import ProgressBar from "@/components/common/ProgressBar";
import { Colors, FontSize, Spacing } from "@/constants/tokens";
import React from "react";
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
  currentIndex: number;          // 👈 외부에서 받는 현재 인덱스
  onIndexChange: (index: number) => void; // 👈 인덱스가 바뀔 때 실행할 함수
  onPress?: () => void; 
};

export default function BookCarousel({ books, currentIndex, onIndexChange, onPress }: Props) {
  if (books.length === 0) return null;

  const book = books[currentIndex];

  const goPrev = () => onIndexChange(Math.max(0, currentIndex - 1));
  const goNext = () => onIndexChange(Math.min(books.length - 1, currentIndex + 1));

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {books.length > 1 && (
          <TouchableOpacity onPress={goPrev} disabled={currentIndex === 0} style={styles.arrow}>
            <Text style={[styles.arrowText, currentIndex === 0 && styles.arrowDisabled]}>‹</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.bookCard} onPress={onPress} activeOpacity={0.9}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.bookImage} resizeMode="cover" />
          ) : (
            <BookPlaceholder book={book} />
          )}
        </TouchableOpacity>

        {books.length > 1 && (
          <TouchableOpacity onPress={goNext} disabled={currentIndex === books.length - 1} style={styles.arrow}>
            <Text style={[styles.arrowText, currentIndex === books.length - 1 && styles.arrowDisabled]}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      <ProgressBar value={book.currentPage} max={book.totalPages} style={styles.progressBar} />
      <Text style={styles.pageCount}>{book.currentPage} / {book.totalPages}쪽</Text>
    </View>
  );
}

function BookPlaceholder({ book }: { book: Book }) {
  return (
    <View style={styles.placeholder}>
      {book.author && <Text style={styles.placeholderAuthor}>{book.author}</Text>}
      <Text style={styles.placeholderTitle}>{book.title}</Text>
      <View style={styles.placeholderDeco} />
      {book.subtitle && <Text style={styles.placeholderSubtitle}>{book.subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: Spacing.md, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  arrow: { padding: Spacing.xs, width: 32, alignItems: "center", zIndex: 1 },
  arrowText: { fontSize: 28, color: Colors.textSecondary },
  arrowDisabled: { opacity: 0.3 },
  bookCard: { width: 148, height: 210, borderRadius: 4, overflow: "hidden", backgroundColor: "#1a1a1a" },
  bookImage: { width: "100%", height: "100%" },
  progressBar: { width: 148, marginTop: 10 },
  pageCount: { textAlign: "center", fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 6 },
  placeholder: { flex: 1, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", padding: Spacing.lg, gap: 6 },
  placeholderAuthor: { fontSize: 9, color: "#8a7a5a", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center" },
  placeholderTitle: { fontSize: 20, color: "#f0e6cc", textAlign: "center", lineHeight: 26 },
  placeholderDeco: { width: 40, height: 2, backgroundColor: "#c8a84b", marginVertical: 4 },
  placeholderSubtitle: { fontSize: 11, color: "#a09070", textAlign: "center" },
});