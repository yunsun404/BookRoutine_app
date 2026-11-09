import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  summary: string;
};

// "5pg · 문장" 형식의 한 줄을 페이지와 문장으로 나눕니다.
// 페이지가 없는 줄(예전 형식의 요약)은 문장만 보여줍니다.
const LINE_RE = /^(\d+)\s*pg\s*·\s*(.+)$/;

export default function AiSummaryLines({ summary }: Props) {
  const lines = summary
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(LINE_RE);
      return m ? { page: m[1], text: m[2] } : { page: null, text: line };
    });

  return (
    <View style={styles.list}>
      {lines.map((line, i) => (
        <View key={i} style={styles.row}>
          {line.page ? (
            <View style={styles.pageBadge}>
              <Text style={styles.pageText}>{line.page}pg</Text>
            </View>
          ) : (
            <View style={styles.dot} />
          )}
          <Text style={styles.text}>{line.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pageBadge: {
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    marginTop: 1,
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7BFF',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
    marginTop: 8,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: '#1F2233',
  },
});