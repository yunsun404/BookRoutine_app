import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchSessionFocusDetail, fetchSessionReward } from '../../../lib/api/ebooks';
import { SessionReward } from '../../../lib/types/ebook';

export default function ReadingResultScreen() {
  const { sessionId, bookId, title } = useLocalSearchParams<{
    sessionId: string;
    bookId: string;
    title?: string;
  }>();
  const router = useRouter();

  const [focusModalVisible, setFocusModalVisible] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [reward, setReward] = useState<SessionReward | null>(null);
  const [goldenTime, setGoldenTime] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [loadingFocus, setLoadingFocus] = useState(false);
  const [loadingReward, setLoadingReward] = useState(false);

  const openFocusResult = async () => {
    setLoadingFocus(true);
    try {
      const detailRes = await fetchSessionFocusDetail(sessionId);
      setGoldenTime({
        start: detailRes.session.golden_time_start ?? null,
        end: detailRes.session.golden_time_end ?? null,
      });
      setFocusModalVisible(true);
    } finally {
      setLoadingFocus(false);
    }
  };

  const openRewardResult = async () => {
    setLoadingReward(true);
    try {
      const rewardRes = await fetchSessionReward(sessionId);
      setReward(rewardRes);
      setRewardModalVisible(true);
    } finally {
      setLoadingReward(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{title ?? '전자책'} - 세션 종료 확인</Text>

      <Pressable style={styles.focusBox} onPress={openFocusResult} disabled={loadingFocus}>
        <Text style={styles.focusBoxText}>
          {loadingFocus ? '불러오는 중...' : '집중 세션 결과 조회'}
        </Text>
      </Pressable>

      <Pressable onPress={openRewardResult} disabled={loadingReward}>
        <Text style={styles.rewardLink}>
          {loadingReward ? '불러오는 중...' : '집중 세션 보상 (포인트, 경험치 조회)'}
        </Text>
      </Pressable>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.bottomButton} onPress={() => router.push('/ebook')}>
          <Text style={styles.bottomButtonText}>돌아가기</Text>
        </Pressable>
        <Text style={styles.divider}>|</Text>
        <Pressable
          style={styles.bottomButton}
          onPress={() =>
            router.push({
              pathname: '/ebook/[bookId]/read',
              params: { bookId, title },
            })
          }
        >
          <Text style={styles.bottomButtonText}>재개</Text>
        </Pressable>
      </View>

      {/* 집중 세션 결과 모달 */}
      <Modal visible={focusModalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setFocusModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>집중 세션 결과</Text>
            {goldenTime.start && goldenTime.end ? (
              <Text style={styles.modalText}>
                골든타임: {new Date(goldenTime.start).toLocaleTimeString()} ~{' '}
                {new Date(goldenTime.end).toLocaleTimeString()}
              </Text>
            ) : (
              <Text style={styles.modalText}>골든타임 기록이 없습니다.</Text>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 보상 결과 모달 */}
      <Modal visible={rewardModalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setRewardModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>세션 보상</Text>
            {reward && (
              <>
                <Text style={styles.modalText}>집중도 {reward.avgFocusScore}점</Text>
                <Text style={styles.modalText}>
                  +{reward.rewardPoints} 포인트 · +{reward.rewardExp} EXP
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, alignItems: 'center' },
  header: { fontSize: 15, fontWeight: '600', backgroundColor: '#eee', width: '100%', textAlign: 'center', paddingVertical: 8 },
  focusBox: {
    marginTop: 40,
    width: 220,
    height: 160,
    borderWidth: 2,
    borderColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  focusBoxText: { fontSize: 15, color: '#333' },
  rewardLink: { marginTop: 24, fontSize: 14, color: '#333' },
  bottomButtons: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomButton: {
    backgroundColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  bottomButtonText: { fontSize: 14, color: '#333' },
  divider: { color: '#999' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 260,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#333' },
});