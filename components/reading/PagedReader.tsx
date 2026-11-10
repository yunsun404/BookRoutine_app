/**
 * 좌우로 넘기는 전자책 화면 (페이지 모드)
 *
 * 흐름
 *   1. 화면 크기를 잼 (onLayout) → 글이 들어갈 폭·높이
 *      크기를 알기 전에는 로딩만 보여 주고, 페이지 계산(PagedReaderBody)은 아예 그리지 않음
 *      (React Compiler 는 함수 안에서 쓰는 box.w·box.h 를 렌더 중에 미리 읽음 → box 가 null 이면 오류.
 *       그래서 box 가 확실히 있을 때만 Body 를 그림)
 *   2. 화면 밖(안 보이게)에서 같은 스타일의 Text 로 본문 조각을 하나씩 그려 onTextLayout 으로 줄 위치를 받음
 *      (긴 본문도 한 번에 무거워지지 않게 조각마다 따로. 조각이 끝날 때마다 페이지를 다시 묶음)
 *   3. 줄을 한 화면 높이만큼 묶어 페이지 {startChar, endChar} → FlatList(가로, 한 장씩)
 *      아직 다 안 잰 마지막 페이지는 숨겨 둠 → 첫 페이지부터 먼저 보여 줌
 *   4. 글자가 안 맞으면(줄 맞추기·합계 검사 실패) onFallback → 화면은 스크롤 모드로
 *
 * 넘기는 방법: 손가락으로 밀기 / 화면 왼쪽·오른쪽 끝 탭. 가운데 탭은 메뉴(위·아래 바)
 * 화면 크기나 시스템 글자 크기가 바뀌면 다시 나누고, 보던 글자가 들어 있는 페이지로 돌아감
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  type TextLayoutEventData,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  type AlignedLine,
  alignLines,
  buildPages,
  type Page,
  pageIndexOf,
  pageText,
  splitChunks,
} from '../../lib/reader/paginate';
import { READER_CONFIG } from '../../lib/reader/readerConfig';

const PAD = READER_CONFIG.PAGE_PADDING;
const EDGE = READER_CONFIG.TAP_ZONE_EDGE_RATIO;
/** 조각 1개를 재는 데 이 시간이 넘으면 실패로 보고 스크롤 모드로 */
const MEASURE_TIMEOUT_MS = 4000;

export interface PageInfo {
  /** 사용자가 넘긴 것인지 (false = 처음 열기·이어 읽기·다시 나누기로 화면이 정함) */
  isTurn: boolean;
  /** 마지막 페이지인지 */
  isLast: boolean;
}

interface Props {
  content: string;
  title: string;
  textStyle: TextStyle;
  titleStyle: TextStyle;
  backgroundColor: string;
  /** 처음 열 페이지 (이 글자가 들어 있는 페이지) */
  initialCharIndex: number;
  onPage: (index: number, page: Page, info: PageInfo) => void;
  /** 가운데 탭 */
  onTapCenter: () => void;
  /** 페이지 나누기 실패 → 스크롤 모드로 */
  onFallback: () => void;
}

interface Measure {
  /** 화면 크기·글자 크기·본문이 같으면 같은 키 */
  key: string;
  /** 제목 높이 + 아래 여백 (첫 페이지에서 뺌). null = 아직 안 잼 */
  titleH: number | null;
  /** 다음에 잴 조각 번호 */
  chunk: number;
  lines: AlignedLine[];
  /** 지금까지 잰 글의 아래 끝 y */
  bottom: number;
  done: boolean;
  failed: boolean;
}

interface Box {
  w: number;
  h: number;
}

/** 바깥: 화면 크기만 잼. 크기를 모르면 로딩 */
export function PagedReader(props: Props) {
  const [box, setBox] = useState<Box | null>(null);

  const onRootLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  };

  return (
    <View testID="paged-reader" style={[styles.root, { backgroundColor: props.backgroundColor }]} onLayout={onRootLayout}>
      {box ? <PagedReaderBody {...props} box={box} /> : <Loading info="화면 크기 기다리는 중" />}
    </View>
  );
}

/** 로딩 표시. info = [개발] 측정이 어느 단계인지 (멈췄을 때 원인 찾기용) */
function Loading({ info }: { info?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator />
      {READER_CONFIG.SHOW_PAGE_DEBUG && !!info && <Text style={styles.loadingInfo}>{info}</Text>}
    </View>
  );
}

/** 안쪽: 크기를 아는 상태에서 줄을 재고 페이지를 나눠 보여 줌 (box 는 절대 null 이 아님) */
function PagedReaderBody({
  content,
  title,
  textStyle,
  titleStyle,
  backgroundColor,
  initialCharIndex,
  onPage,
  onTapCenter,
  onFallback,
  box,
}: Props & { box: Box }) {
  const { fontScale } = useWindowDimensions();
  const chunks = useMemo(() => splitChunks(content, READER_CONFIG.CHUNK_CHARS), [content]);
  const layoutKey = `${box.w}x${box.h}@${fontScale}#${content.length}`;

  // 크기·글자 크기·본문이 바뀌면 처음부터 다시 잼 (렌더 중 상태 맞추기)
  const [m, setM] = useState<Measure | null>(null);
  if (m?.key !== layoutKey) {
    setM({ key: layoutKey, titleH: null, chunk: 0, lines: [], bottom: 0, done: content.length === 0, failed: false });
  }
  /** 이 크기에서 처음 보여 줄 페이지가 정해졌는지 */
  const [settled, setSettled] = useState<{ key: string; index: number } | null>(null);

  const titleMarginRaw = StyleSheet.flatten(titleStyle).marginBottom;
  const titleMargin = typeof titleMarginRaw === 'number' ? titleMarginRaw : 0;

  const onTitleLayout = (key: string) => (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height + titleMargin;
    setM((prev) => (prev && prev.key === key && prev.titleH == null ? { ...prev, titleH: h } : prev));
  };

  const onChunkLayout = (key: string, idx: number) => (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const measured = e.nativeEvent.lines;
    setM((prev) => {
      if (!prev || prev.key !== key || prev.done || prev.chunk !== idx) return prev; // 지난 크기 / 이미 잰 조각
      const r = alignLines(chunks[idx], measured, prev.bottom);
      if (!r) return { ...prev, done: true, failed: true };
      const next = idx + 1;
      return { ...prev, chunk: next, lines: [...prev.lines, ...r.lines], bottom: r.bottom, done: next >= chunks.length };
    });
  };

  // 조각 하나가 너무 오래 안 재지면 실패로 처리 (onTextLayout 이 안 오는 경우 대비)
  const mKey = m?.key;
  const mChunk = m?.chunk;
  const mDone = m?.done;
  useEffect(() => {
    if (!mKey || mDone) return;
    const timer = setTimeout(() => {
      setM((prev) =>
        prev && prev.key === mKey && prev.chunk === mChunk && !prev.done ? { ...prev, done: true, failed: true } : prev,
      );
    }, MEASURE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mKey, mChunk, mDone]);

  // 전체 안전장치: 이 크기에서 정해진 시간 안에 첫 페이지가 안 나오면 실패
  // (제목 높이가 안 오거나, 시작 페이지가 안 정해지는 등 조각 시간 제한이 못 잡는 경우)
  const [stalledKey, setStalledKey] = useState<string | null>(null);
  const readyForKey = !!settled && settled.key === layoutKey;
  useEffect(() => {
    if (readyForKey) return;
    const timer = setTimeout(() => setStalledKey(layoutKey), READER_CONFIG.PAGE_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [layoutKey, readyForKey]);

  const failed = !!m?.failed || stalledKey === layoutKey;
  useEffect(() => {
    if (failed) onFallback();
  }, [failed, onFallback]);

  /** 보여 줄 페이지 (측정 중이면 아직 덜 찬 마지막 페이지는 숨김) */
  const pages = useMemo<Page[]>(() => {
    if (!m || m.titleH == null || m.failed) return [];
    const h = box.h - PAD.top - PAD.bottom;
    const all = buildPages(m.lines, h, h - m.titleH, content.length);
    if (m.done && all.length === 0) return [{ startChar: 0, endChar: content.length, lineCount: 1 }];
    return m.done ? all : all.slice(0, -1);
  }, [m, box.h, content.length]);

  /* ─────────── 지금 페이지 ─────────── */
  /** 지금 페이지 첫 글자 (다시 나눠도 이 글자가 있는 페이지로 돌아감) */
  const anchorRef = useRef(initialCharIndex);
  const indexRef = useRef(0);
  const listRef = useRef<FlatList<Page>>(null);
  const done = !!m?.done;

  useEffect(() => {
    if (!mKey || settled?.key === mKey || pages.length === 0) return;
    const anchor = anchorRef.current;
    if (!done && pages[pages.length - 1].endChar <= anchor) return; // 아직 그 위치까지 못 잼
    const index = pageIndexOf(pages, anchor);
    indexRef.current = index;
    setSettled({ key: mKey, index });
    onPage(index, pages[index], { isTurn: false, isLast: done && index === pages.length - 1 });
  }, [mKey, pages, done, settled, onPage]);

  /** 사용자가 i 페이지로 넘김 (탭·밀기 공통). 같은 번호면 무시 → 한 번 넘김이 두 번 세지지 않음 */
  const commit = useCallback(
    (i: number) => {
      if (i < 0 || i >= pages.length || i === indexRef.current) return;
      indexRef.current = i;
      anchorRef.current = pages[i].startChar;
      onPage(i, pages[i], { isTurn: true, isLast: done && i === pages.length - 1 });
    },
    [pages, done, onPage],
  );

  /** 끝 탭: 애니메이션으로 넘기고 바로 기록 (Android 는 코드로 넘길 때 onMomentumScrollEnd 가 안 올 수 있음) */
  const tapTo = useCallback(
    (delta: number) => {
      const i = indexRef.current + delta;
      if (i < 0 || i >= pages.length) return;
      listRef.current?.scrollToIndex({ index: i, animated: true });
      commit(i);
    },
    [pages.length, commit],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commit(Math.round(e.nativeEvent.contentOffset.x / box.w));
  };

  const renderPage = ({ item, index }: ListRenderItemInfo<Page>) => (
    <View style={[styles.page, { width: box.w, height: box.h, backgroundColor }]}>
      <View style={styles.pageInner}>
        {index === 0 && <Text style={titleStyle}>{title}</Text>}
        <Text style={textStyle} numberOfLines={item.lineCount}>
          {pageText(content, item)}
        </Text>
      </View>
      <View style={styles.tapZones}>
        <Pressable style={{ flex: EDGE }} onPress={() => tapTo(-1)} accessibilityLabel="이전 페이지" />
        <Pressable style={{ flex: 1 - 2 * EDGE }} onPress={onTapCenter} accessibilityLabel="메뉴 보기" />
        <Pressable style={{ flex: EDGE }} onPress={() => tapTo(1)} accessibilityLabel="다음 페이지" />
      </View>
    </View>
  );

  const ready = readyForKey && !!settled;

  /** [개발] 로딩 중 측정 단계 */
  const loadingInfo = m
    ? `화면 ${box.w}×${box.h} · 제목 ${m.titleH != null ? '✓' : '…'} · 본문 ${Math.min(m.chunk, chunks.length)}/${chunks.length}` +
      ` · 페이지 ${pages.length} · ${m.failed ? '실패' : m.done ? '시작 대기' : '측정 중'}`
    : `화면 ${box.w}×${box.h}`;

  return (
    <>
      {/* 측정용 (안 보임): 제목 높이 */}
      {m && m.titleH == null && (
        <View style={[styles.measure, { width: box.w - PAD.horizontal * 2 }]} pointerEvents="none">
          <Text
            testID="paged-reader-title-measure"
            // 다시 잴 때마다 새 글자로 → 크기가 그대로여도 onLayout 이 꼭 다시 옴
            key={`title:${m.key}`}
            style={[titleStyle, { marginBottom: 0 }]}
            onLayout={onTitleLayout(m.key)}
          >
            {title}
          </Text>
        </View>
      )}
      {/* 측정용 (안 보임): 본문 조각 1개 */}
      {m && !m.done && (
        <View style={[styles.measure, { width: box.w - PAD.horizontal * 2 }]} pointerEvents="none">
          <Text
            testID="paged-reader-chunk-measure"
            key={`${m.key}:${m.chunk}`}
            style={textStyle}
            onTextLayout={onChunkLayout(m.key, m.chunk)}
          >
            {chunks[m.chunk].text}
          </Text>
        </View>
      )}

      {ready ? (
        <FlatList
          key={settled.key}
          ref={listRef}
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={settled.index}
          getItemLayout={(_, i) => ({ length: box.w, offset: box.w * i, index: i })}
          keyExtractor={(p) => String(p.startChar)}
          renderItem={renderPage}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onMomentumScrollEnd={onMomentumEnd}
        />
      ) : (
        <Loading info={loadingInfo} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  measure: { position: 'absolute', top: 0, left: PAD.horizontal, opacity: 0 },
  page: { overflow: 'hidden' },
  pageInner: { paddingHorizontal: PAD.horizontal, paddingTop: PAD.top },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingInfo: { fontSize: 11, color: '#A0A3BD', textAlign: 'center', paddingHorizontal: 24 },
});
