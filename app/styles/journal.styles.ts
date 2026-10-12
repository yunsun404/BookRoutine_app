import { StyleSheet } from 'react-native';

export const C = {
  primary: '#6B7BFF',
  primaryText: '#4B5BE0',
  primarySoft: '#E6E8FF',
  primaryTrack: '#EEF0FF',
  purple: '#A78BFA',
  purpleText: '#6D4FD6',
  purpleSoft: '#F0EBFF',
  bg: '#F7F7FA',
  ink: '#1F2233',
  inkBody: '#33374A',
  inkSub: '#5A5E73',
  inkMute: '#8A8DA0',
  line: '#C9CCDB',
  peachSoft: '#FFF1EE',
  peachText: '#C2402E',
  darkTrack: '#353A52',
  darkSub: '#B9BCD0',
  white: '#FFFFFF',
};

const softShadow = {
  shadowColor: C.ink, shadowOpacity: 0.06, shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 }, elevation: 1,
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },

  // date
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4,
    backgroundColor: C.white, borderRadius: 999, ...softShadow,
  },
  dateArrow: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  dateText: { fontSize: 14, fontWeight: '600', color: C.ink, paddingHorizontal: 8 },
  dateCaption: { fontSize: 12, fontWeight: '500', color: C.inkSub },

  // hero
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 22, backgroundColor: C.white,
    shadowColor: C.primary, shadowOpacity: 0.1, shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  coverWrap: { width: 84, height: 122, borderRadius: 10, backgroundColor: '#D9DCFF' },
  cover: {
    width: 80, height: 116, borderRadius: 10, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  coverImg: { width: 80, height: 116 },
  heroBody: { flex: 1, minWidth: 0, gap: 8 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: C.purpleSoft, borderRadius: 999,
    paddingVertical: 4, paddingLeft: 8, paddingRight: 10,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: C.purpleText },
  journalTitle: { fontSize: 19, fontWeight: '700', lineHeight: 27, color: C.ink },
  bookMeta: { fontSize: 12, color: C.inkSub },

  // content
  contentCard: {
    backgroundColor: C.white, borderRadius: 22,
    paddingVertical: 20, paddingHorizontal: 18, ...softShadow,
  },
  contentText: { fontSize: 14.5, lineHeight: 27, color: C.inkBody },

  // highlights
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  sectionCount: { fontSize: 12, color: C.inkSub },
  quoteCard: {
    flexDirection: 'row', gap: 12, backgroundColor: C.white, borderRadius: 18,
    paddingVertical: 14, paddingLeft: 14, paddingRight: 16, ...softShadow,
  },
  quoteBar: { width: 3, borderRadius: 999, backgroundColor: C.purple },
  quoteBody: { flex: 1, gap: 6 },
  quoteText: { fontSize: 14, lineHeight: 24, color: C.ink },
  quotePage: { fontSize: 11, color: C.inkMute },

  // checklist + focus
  row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  col: { flex: 1, gap: 12 },
  card: {
    flex: 1, backgroundColor: C.white, borderRadius: 22,
    paddingVertical: 16, paddingHorizontal: 14, gap: 10, ...softShadow,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  countText: { fontSize: 12, fontWeight: '600', color: C.primaryText },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: C.primaryTrack, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: C.primary },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkBox: {
    width: 20, height: 20, borderRadius: 7, borderWidth: 2, borderColor: C.line,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkLabel: { flex: 1, fontSize: 13, lineHeight: 18, color: C.ink },
  checkLabelOn: { color: C.inkMute, textDecorationLine: 'line-through' },
  emptySmall: { fontSize: 12, color: C.inkMute, lineHeight: 18 },

  focusCard: {
    backgroundColor: C.ink, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 14,
    alignItems: 'center', gap: 10,
  },
  focusTitle: { alignSelf: 'stretch', fontSize: 14, fontWeight: '700', color: C.white },
  ringBox: { width: 104, height: 104 },
  ringCenter: {
    ...StyleSheet.absoluteFillObject, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  scoreNum: { fontSize: 28, fontWeight: '700', color: C.white, letterSpacing: -1 },
  scoreUnit: { fontSize: 12, color: C.darkSub, marginTop: 8 },

  goldenCard: { backgroundColor: C.peachSoft, borderRadius: 22, padding: 14, gap: 6 },
  goldenHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goldenLabel: { fontSize: 12, fontWeight: '700', color: C.peachText },
  goldenHour: { fontSize: 20, fontWeight: '700', color: C.ink },
  goldenEmpty: { fontSize: 12, color: C.inkSub },

  // next suggestion
  suggestCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.primaryTrack, borderRadius: 22, padding: 16,
  },
  suggestIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestBody: { flex: 1, gap: 4 },
  suggestLabel: { fontSize: 12, fontWeight: '700', color: C.primaryText },
  suggestText: { fontSize: 14, lineHeight: 22, color: C.ink },

  // states
  center: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 14, color: C.inkSub, textAlign: 'center', lineHeight: 21 },
  primaryBtn: {
    paddingHorizontal: 18, height: 44, borderRadius: 999,
    backgroundColor: C.primary, justifyContent: 'center',
  },
  primaryBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});