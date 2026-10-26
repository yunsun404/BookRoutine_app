/**
 * 30초 버킷 집중도 막대 그래프 (독서 화면 하단바 / 결과 화면 공용)
 *  - 막대 높이 = 그 30초 동안 집중한 비율
 *  - 색: 골든타임 구간 = 주황 / 집중 버킷(70%↑) = 보라 / 그 외 = 회색
 */
import { StyleSheet, Text, View } from 'react-native';

export interface TimelineBar {
  start: number; // ms
  end: number; // ms
  rate: number; // 0~1 (집중 초 ÷ 버킷 길이)
}

interface Props {
  bars: TimelineBar[];
  golden?: { start: number; end: number } | null;
  height?: number;
  /** 양 끝 시각 표시 */
  showTimes?: boolean;
  /** 막대가 너무 많으면 최근 N개만 */
  maxBars?: number;
}

const COLOR = { golden: '#FF8A7C', good: '#6B7BFF', low: '#D9DBEA', axis: '#A0A3BD' };
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export function FocusTimeline({ bars, golden, height = 56, showTimes = false, maxBars = 60 }: Props) {
  const shown = bars.slice(-maxBars);
  if (shown.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>30초마다 집중 기록이 쌓여요</Text>
      </View>
    );
  }
  return (
    <View>
      <View style={[styles.row, { height }]}>
        {shown.map((b) => {
          const inGolden = !!golden && b.start >= golden.start && b.end <= golden.end;
          const color = inGolden ? COLOR.golden : b.rate >= 0.7 ? COLOR.good : COLOR.low;
          return (
            <View key={b.start} style={styles.slot}>
              <View style={[styles.bar, { height: Math.max(3, b.rate * height), backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      {showTimes && (
        <View style={styles.times}>
          <Text style={styles.time}>{hhmm(shown[0].start)}</Text>
          <Text style={styles.time}>{hhmm(shown[shown.length - 1].end)}</Text>
        </View>
      )}
    </View>
  );
}

export function TimelineLegend() {
  return (
    <View style={styles.legend}>
      {[
        ['골든타임', COLOR.golden],
        ['집중 70%↑', COLOR.good],
        ['그 외', COLOR.low],
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={styles.time}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  slot: { flex: 1, maxWidth: 14, justifyContent: 'flex-end', height: '100%' },
  bar: { borderRadius: 3, width: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: COLOR.axis },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { fontSize: 11, color: COLOR.axis },
  legend: { flexDirection: 'row', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
