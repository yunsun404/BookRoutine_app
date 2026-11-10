/**
 * PagedReader 화면 테스트
 *
 * jest 도 앱처럼 React Compiler 를 켜고 변환함 (package.json 의 jest.transform).
 * 화면 크기(onLayout)·줄 측정(onTextLayout) 이 오기 전·후로 나눠서,
 * "측정값이 아직 없을 때(null) 그려도 오류가 안 나는지"를 확인함.
 */
import { act, type ReactElement } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';

import { PagedReader, type PageInfo } from './PagedReader';
import type { Page } from '../../lib/reader/paginate';
import { READER_CONFIG } from '../../lib/reader/readerConfig';

/** react-test-renderer 에서 쓰는 부분만 (타입 패키지 없이) */
interface TestNode {
  type: unknown;
  props: Record<string, any>;
  findAll: (pred: (n: TestNode) => boolean) => TestNode[];
}
interface TestRenderer {
  root: TestNode;
  update: (el: ReactElement) => void;
  unmount: () => void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { create } = require('react-test-renderer') as { create: (el: ReactElement) => TestRenderer };

const noop = () => {};

function renderReader(
  content: string,
  onPage: (i: number, p: Page, info: PageInfo) => void = noop,
  onFallback: () => void = noop,
) {
  const el = (
    <PagedReader
      content={content}
      title="테스트 책"
      textStyle={{ fontSize: 17, lineHeight: 31 }}
      titleStyle={{ fontSize: 24, marginBottom: 24 }}
      backgroundColor="#fff"
      initialCharIndex={0}
      onPage={onPage}
      onTapCenter={noop}
      onFallback={onFallback}
    />
  );
  let r!: TestRenderer;
  act(() => {
    r = create(el);
  });
  return { r, el };
}

const byTestId = (r: TestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id && typeof n.type === 'string');
const isType = (type: unknown) => (n: TestNode) => n.type === type;

/** 화면 크기 알려 주기 (onLayout) */
function layoutRoot(r: TestRenderer, width = 360, height = 640) {
  const [root] = byTestId(r, 'paged-reader');
  act(() => root.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height } } }));
}
/** 제목 높이 알려 주기 */
function layoutTitle(r: TestRenderer, height = 30) {
  const [title] = byTestId(r, 'paged-reader-title-measure');
  act(() => title.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 312, height } } }));
}
/** 본문 조각의 줄 위치 알려 주기 (onTextLayout) */
function layoutChunk(r: TestRenderer, lines: string[], lineHeight = 31) {
  const [chunk] = byTestId(r, 'paged-reader-chunk-measure');
  const measured = lines.map((text, i) => ({ text, x: 0, y: i * lineHeight, width: 300, height: lineHeight }));
  act(() => chunk.props.onTextLayout({ nativeEvent: { lines: measured } }));
}

describe('PagedReader', () => {
  it('화면 크기를 재기 전(null)에 그려도 오류 없이 로딩만 보여 줌', () => {
    // 고치기 전: React Compiler 가 renderPage 의 box.h 를 렌더 중에 읽어서
    // "Cannot read property 'h' of null" 이 났음
    const { r, el } = renderReader('첫 줄\n둘째 줄');
    expect(r.root.findAll(isType(ActivityIndicator))).toHaveLength(1);
    expect(r.root.findAll(isType(FlatList))).toHaveLength(0);
    // 크기가 오기 전에 부모가 다시 그려도(1초 타이머 등) 오류가 없어야 함
    act(() => r.update(el));
    expect(r.root.findAll(isType(ActivityIndicator))).toHaveLength(1);
    act(() => r.unmount());
  });

  it('크기만 오고 줄 측정 전에는 여전히 로딩, 측정이 끝나면 첫 페이지', () => {
    const onPage = jest.fn();
    const { r } = renderReader('첫 줄\n둘째 줄', onPage);
    layoutRoot(r);
    expect(r.root.findAll(isType(ActivityIndicator))).toHaveLength(1);
    expect(onPage).not.toHaveBeenCalled();

    layoutTitle(r);
    layoutChunk(r, ['첫 줄\n', '둘째 줄']);
    expect(r.root.findAll(isType(FlatList))).toHaveLength(1);
    expect(r.root.findAll(isType(ActivityIndicator))).toHaveLength(0);
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(onPage).toHaveBeenCalledWith(0, { startChar: 0, endChar: 8, lineCount: 2 }, { isTurn: false, isLast: true });
    act(() => r.unmount());
  });

  it('빈 본문이어도 오류 없이 빈 페이지 1장', () => {
    const onPage = jest.fn();
    const { r } = renderReader('', onPage);
    layoutRoot(r);
    layoutTitle(r);
    expect(byTestId(r, 'paged-reader-chunk-measure')).toHaveLength(0); // 잴 글이 없음
    expect(r.root.findAll(isType(FlatList))).toHaveLength(1);
    expect(onPage).toHaveBeenCalledWith(0, { startChar: 0, endChar: 0, lineCount: 1 }, { isTurn: false, isLast: true });
    act(() => r.unmount());
  });

  it('화면 크기가 바뀌면 다시 재는 동안 로딩, 다 재면 다시 페이지', () => {
    const onPage = jest.fn();
    const { r } = renderReader('첫 줄\n둘째 줄', onPage);
    layoutRoot(r);
    layoutTitle(r);
    layoutChunk(r, ['첫 줄\n', '둘째 줄']);
    layoutRoot(r, 640, 360); // 가로로 돌림
    expect(r.root.findAll(isType(FlatList))).toHaveLength(0);
    layoutTitle(r);
    layoutChunk(r, ['첫 줄\n', '둘째 줄']);
    expect(r.root.findAll(isType(FlatList))).toHaveLength(1);
    expect(onPage).toHaveBeenCalledTimes(2);
    act(() => r.unmount());
  });

  it('제목 높이가 오기 전에 화면 높이가 바뀌면, 제목 재는 글자를 새로 만듦 (= 휴대폰이 onLayout 을 다시 보냄)', () => {
    // 휴대폰은 크기가 그대로인 글자에는 onLayout 을 다시 보내지 않음.
    // 폭이 같고 높이만 바뀌면 제목 크기는 그대로 → 같은 글자를 쓰면 제목 높이를 영영 못 받음
    const onPage = jest.fn();
    const { r } = renderReader('첫 줄\n둘째 줄', onPage);
    layoutRoot(r, 360, 640);
    const [before] = byTestId(r, 'paged-reader-title-measure');
    layoutRoot(r, 360, 600); // 안전 영역 여백이 늦게 적용된 경우 등
    const [after] = byTestId(r, 'paged-reader-title-measure');
    expect(after).not.toBe(before); // 새로 만들어졌어야 onLayout 이 다시 옴

    layoutTitle(r);
    layoutChunk(r, ['첫 줄\n', '둘째 줄']);
    expect(r.root.findAll(isType(FlatList))).toHaveLength(1);
    expect(onPage).toHaveBeenCalledTimes(1);
    act(() => r.unmount());
  });

  describe('안전장치: 첫 페이지가 안 나오면 스크롤 모드로', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it(`제목 높이가 끝내 안 오면 ${READER_CONFIG.PAGE_READY_TIMEOUT_MS / 1000}초 뒤 onFallback`, () => {
      const onFallback = jest.fn();
      const { r } = renderReader('첫 줄\n둘째 줄', noop, onFallback);
      layoutRoot(r);
      layoutChunk(r, ['첫 줄\n', '둘째 줄']); // 본문은 다 잼, 제목만 안 옴
      act(() => jest.advanceTimersByTime(READER_CONFIG.PAGE_READY_TIMEOUT_MS - 1));
      expect(onFallback).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(onFallback).toHaveBeenCalledTimes(1);
      act(() => r.unmount());
    });

    it('제때 첫 페이지가 나오면 시간이 지나도 onFallback 없음', () => {
      const onFallback = jest.fn();
      const { r } = renderReader('첫 줄\n둘째 줄', noop, onFallback);
      layoutRoot(r);
      layoutTitle(r);
      layoutChunk(r, ['첫 줄\n', '둘째 줄']);
      act(() => jest.advanceTimersByTime(READER_CONFIG.PAGE_READY_TIMEOUT_MS * 2));
      expect(onFallback).not.toHaveBeenCalled();
      act(() => r.unmount());
    });
  });
});
