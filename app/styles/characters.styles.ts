import { StyleSheet } from 'react-native';

export const charactersStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FC',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  levelText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A3550',
  },
  pointBadge: {
    backgroundColor: '#EFEAFB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pointText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C6CE8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A3550',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F3F0FA',
    marginBottom: 10,
  },
  cardImageLocked: {
    opacity: 0.5,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3550',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  badgeOwned: {
    backgroundColor: '#7C6CE8',
  },
  badgeOwnedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeLocked: {
    backgroundColor: '#F1EEF7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeLockedText: {
    color: '#A9A3BC',
    fontSize: 11,
    fontWeight: '600',
  },
  priceText: {
    color: '#B9ACD6',
    fontSize: 11,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});