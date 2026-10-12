// app/sentence-search.tsx
// 모은 문장 검색 화면. 책 상세 > 문장 수집 탭의 🔍 버튼으로 들어옵니다.
//   /sentence-search?book_id=...&book_title=...  → 기본 범위 "이 책" (전체로 전환 가능)
//   /sentence-search                               → 전체 책에서 검색
//
// 입력할 때마다 요청을 보내지 않도록 300ms 디바운스를 걸고,
// 새 요청이 나가면 이전 요청은 AbortController로 취소합니다.
// → 느린 옛 응답이 늦게 도착해서 최신 결과를 덮어쓰는 "경쟁 상태(race condition)"를 막기 위함
import HighlightText from "@/components/sentences/HighlightText";
import { P } from "@/constants/palette";
import {
  searchSentences,
  type SentenceSearchItem,
  type SentenceSearchResult,
} from "@/constants/sentenceApi";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Scope = "book" | "all";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export default function SentenceSearchScreen() {
  const params = useLocalSearchParams<{ book_id?: string; book_title?: string }>();
  const bookId = params.book_id || undefined;
  const bookTitle = params.book_title || "이 책";

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>(bookId ? "book" : "all");
  const [result, setResult] = useState<SentenceSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const trimmed = query.trim();
  const scopeBookId = scope === "book" ? bookId : undefined;

  // ───────── 검색어/범위가 바뀌면 (디바운스 후) 첫 페이지 검색 ─────────
  useEffect(() => {
    abortRef.current?.abort();

    if (!trimmed) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await searchSentences(trimmed, {
          bookId: scopeBookId,
          limit: PAGE_SIZE,
          offset: 0,
          signal: controller.signal,
        });
        setResult(data);
        setError(null);
      } catch (e: any) {
        if (e?.name === "AbortError") return; // 더 새로운 검색이 시작돼서 취소된 것 → 무시
        setError(e?.message ?? "검색하지 못했어요.");
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, scopeBookId]);

  // 화면을 떠날 때 진행 중인 요청 정리
  useEffect(() => () => abortRef.current?.abort(), []);

  // ───────── 다음 페이지 ─────────
  const hasMore = !!result && result.items.length < result.total;

  const loadMore = async () => {
    if (!result || !hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const next = await searchSentences(result.query, {
        bookId: scopeBookId,
        limit: PAGE_SIZE,
        offset: result.items.length,
      });
      // 그사이 검색어가 바뀌었으면 옛 검색의 다음 페이지는 버립니다.
      setResult((prev) =>
        prev && prev.query === next.query ? { ...next, items: [...prev.items, ...next.items] } : prev
      );
    } catch (e: any) {
      setError(e?.message ?? "더 불러오지 못했어요.");
    } finally {
      setLoadingMore(false);
    }
  };

  const openSentence = (item: SentenceSearchItem) => {
    router.push({
      pathname: "/book-detail",
      params: { book_id: item.book_id, tab: "sentences" },
    });
  };

  // ───────── 렌더링 ─────────
  const terms = result?.terms ?? [];

  const renderItem = ({ item }: { item: SentenceSearchItem }) => (
    <Pressable
      onPress={() => openSentence(item)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <HighlightText text={item.content} terms={terms} style={styles.content} numberOfLines={5} />

      {item.memo ? (
        <View style={styles.memoBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={P.textSecondary} />
          <HighlightText text={item.memo} terms={terms} style={styles.memoText} numberOfLines={2} />
        </View>
      ) : null}

      <View style={styles.footer}>
        <Ionicons name="book-outline" size={13} color={P.textTertiary} />
        <Text style={styles.bookTitle} numberOfLines={1}>
          {item.book?.title ?? "알 수 없는 책"}
        </Text>
        {item.page != null && <Text style={styles.page}>p.{item.page}</Text>}
      </View>
    </Pressable>
  );

  let emptyView: React.ReactNode = null;
  if (!trimmed) {
    emptyView = (
      <View style={styles.guide}>
        <Ionicons name="search-outline" size={28} color={P.primary} />
        <Text style={styles.guideTitle}>모은 문장에서 찾아보세요</Text>
        <Text style={styles.guideDesc}>
          문장과 나의 생각(메모)에서 단어를 찾아요.{"\n"}
          띄어쓰기로 여러 단어를 넣으면{"\n"}모두 들어간 문장만 보여줘요.
        </Text>
      </View>
    );
  } else if (loading && !result) {
    emptyView = <ActivityIndicator style={{ marginTop: 40 }} color={P.primary} />;
  } else if (error) {
    emptyView = <Text style={styles.errorText}>{error}</Text>;
  } else if (result && result.items.length === 0) {
    emptyView = (
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>‘{result.query}’이(가) 들어간 문장이 없어요</Text>
        {scope === "book" && bookId && (
          <Pressable onPress={() => setScope("all")} style={styles.widenButton}>
            <Text style={styles.widenText}>전체 책에서 찾아보기</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* 검색 바 */}
      <View style={styles.searchRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={P.ink} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={16} color={P.textTertiary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="단어로 문장 찾기 (예: 용기)"
            placeholderTextColor={P.textTertiary}
            autoFocus
            returnKeyType="search"
            maxLength={50}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={P.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 검색 범위 (책 상세에서 들어왔을 때만) */}
      {bookId && (
        <View style={styles.scopeRow}>
          {(["book", "all"] as Scope[]).map((s) => {
            const active = scope === s;
            return (
              <Pressable
                key={s}
                onPress={() => setScope(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {s === "book" ? bookTitle : "전체 책"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {result && result.items.length > 0 && (
        <Text style={styles.countText}>
          문장 {result.total}개{result.truncated ? "+" : ""}
          {loading ? "  · 검색 중…" : ""}
        </Text>
      )}

      <FlatList
        data={result?.items ?? []}
        keyExtractor={(item) => item.sentence_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={emptyView}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={P.primary} /> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: P.bg },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, color: P.ink, paddingVertical: 0 },
  scopeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    maxWidth: "60%",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  chipActive: { backgroundColor: P.primary, borderColor: P.primary },
  chipText: { fontSize: 13, color: P.textSecondary, fontWeight: "600" },
  chipTextActive: { color: P.onPrimary },
  countText: {
    paddingHorizontal: 20,
    marginBottom: 6,
    fontSize: 12,
    color: P.textSecondary,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  card: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: P.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  content: { fontSize: 15, lineHeight: 24, color: P.ink },
  memoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    backgroundColor: P.lavenderTint,
    borderRadius: 8,
    padding: 8,
  },
  memoText: { flex: 1, fontSize: 13, lineHeight: 19, color: P.inkSoft },
  footer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  bookTitle: { flexShrink: 1, fontSize: 12, color: P.textSecondary },
  page: { fontSize: 12, fontWeight: "700", color: P.primary },
  guide: { alignItems: "center", marginTop: 60, gap: 10, paddingHorizontal: 24 },
  guideTitle: { fontSize: 15, fontWeight: "700", color: P.ink, textAlign: "center" },
  guideDesc: { fontSize: 13, lineHeight: 20, color: P.textSecondary, textAlign: "center" },
  widenButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: P.primary,
  },
  widenText: { color: P.onPrimary, fontSize: 13, fontWeight: "600" },
  errorText: { marginTop: 40, textAlign: "center", color: P.danger, fontSize: 14 },
});
