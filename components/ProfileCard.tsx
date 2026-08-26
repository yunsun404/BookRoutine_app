import { authFetch, BASE_URL } from "@/constants/api";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ProfileData {
  nickname: string;
  age: number | null;
  profile_image: string | null;
}

interface LevelData {
  level: number;
  level_name: string | null;
}

interface PointData {
  total_point: number;
}

interface TitleData {
  title_id: string;
  name: string;
  description: string | null;
  required_level: number;
  image_url: string | null;
  is_acquired: boolean;
  is_representative: boolean;
}

// bookshelf.tsx에 있던 것과 동일한 규칙 — 컴포넌트가 갈라졌으니 규칙도 여기 옮겨둠
const formatAge = (age: number) => {
  if (age >= 10 && age < 20) return "10대";
  if (age >= 20 && age < 30) return "20대";
  if (age >= 30 && age < 40) return "30대";
  if (age >= 40 && age < 50) return "40대";
  if (age >= 50 && age < 60) return "50대";
  return `${age}대`;
};

export default function ProfileCard() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelData | null>(null);
  const [pointInfo, setPointInfo] = useState<PointData | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- 칭호 모달 관련 상태 (신규 추가) ----
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [titles, setTitles] = useState<TitleData[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [profileRes, levelRes, pointRes] = await Promise.all([
        authFetch(`${BASE_URL}/users/me`),
        authFetch(`${BASE_URL}/level/me`),
        authFetch(`${BASE_URL}/points/me`),
      ]);

      setProfile(await profileRes.json());
      setLevelInfo(await levelRes.json());
      setPointInfo(await pointRes.json());
    } catch (error) {
      console.error("프로필 카드 로드 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---- 칭호 목록 조회 (신규 추가) ----
  const fetchTitles = async () => {
    try {
      setTitlesLoading(true);
      const res = await authFetch(`${BASE_URL}/titles`);
      const data = await res.json();
      setTitles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("칭호 목록 로드 에러:", error);
    } finally {
      setTitlesLoading(false);
    }
  };

  // 레벨 배지를 누르면 모달을 열면서 최신 칭호 목록을 같이 불러옴
  const openTitleModal = () => {
    setTitleModalVisible(true);
    fetchTitles();
  };

  // ---- 대표 칭호 설정 (신규 추가) ----
  const setRepresentativeTitle = async (titleId: string) => {
    try {
      await authFetch(`${BASE_URL}/users/me/titles`, {
        method: "PATCH",
        body: JSON.stringify({ title_id: titleId }),
      });
      // 서버 반영 후, 화면에 표시된 is_representative도 다시 불러와서 최신화
      fetchTitles();
    } catch (error) {
      console.error("대표 칭호 설정 에러:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#8B4513" />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Image
        source={
          profile.profile_image
            ? { uri: profile.profile_image }
            : { uri: "https://via.placeholder.com/56" }
        }
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.nickname}>{profile.nickname}</Text>
        {profile.age != null && (
          <Text style={styles.age}>{formatAge(profile.age)}</Text>
        )}
      </View>
      <View style={styles.badges}>
        {levelInfo && (
          // ---- TouchableOpacity로 감싸서 탭 가능하게 변경 ----
          <TouchableOpacity onPress={openTitleModal}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>
                Level {levelInfo.level} {levelInfo.level_name ?? ""}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {pointInfo && (
          <Text style={styles.pointText}>{pointInfo.total_point} 포인트</Text>
        )}
      </View>

      {/* ---- 칭호 목록 모달 (신규 추가) ---- */}
      <Modal
        visible={titleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTitleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTitleModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>칭호 도감</Text>

            {titlesLoading ? (
              <ActivityIndicator
                style={{ paddingVertical: 24 }}
                color="#8B4513"
              />
            ) : (
              <ScrollView style={styles.titleList}>
                {titles.map((t) => (
                  <View
                    key={t.title_id}
                    style={[
                      styles.titleItem,
                      !t.is_acquired && styles.titleItemLocked,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.titleName,
                          !t.is_acquired && styles.titleNameLocked,
                        ]}
                      >
                        {t.is_acquired ? t.name : "???"}
                      </Text>
                      <Text style={styles.titleCondition}>
                        Lv.{t.required_level} 달성 시 획득
                      </Text>
                    </View>

                    {t.is_representative && (
                      <View style={styles.representativeBadge}>
                        <Text style={styles.representativeBadgeText}>대표</Text>
                      </View>
                    )}

                    {t.is_acquired && !t.is_representative && (
                      <TouchableOpacity
                        style={styles.setButton}
                        onPress={() => setRepresentativeTitle(t.title_id)}
                      >
                        <Text style={styles.setButtonText}>대표 설정</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setTitleModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E1D9D1",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  age: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  badges: {
    alignItems: "flex-end",
    gap: 4,
  },
  levelBadge: {
    backgroundColor: "#F0EFED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B4513",
  },
  pointText: {
    fontSize: 12,
    color: "#C8B84A",
    fontWeight: "600",
  },

  // ---- 모달 관련 스타일 (신규 추가) ----
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  titleList: {
    maxHeight: 320,
  },
  titleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FAF8F5",
    borderRadius: 12,
    marginBottom: 8,
  },
  titleItemLocked: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  titleName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  titleNameLocked: {
    color: "#999",
  },
  titleCondition: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  representativeBadge: {
    backgroundColor: "#8B4513",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  representativeBadgeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  setButton: {
    borderWidth: 1,
    borderColor: "#8B4513",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  setButtonText: {
    fontSize: 11,
    color: "#8B4513",
    fontWeight: "600",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F0EFED",
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});
