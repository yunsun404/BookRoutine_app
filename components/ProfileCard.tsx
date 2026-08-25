import { authFetch, BASE_URL } from "@/constants/api";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

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
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              Level {levelInfo.level} {levelInfo.level_name ?? ""}
            </Text>
          </View>
        )}
        {pointInfo && (
          <Text style={styles.pointText}>{pointInfo.total_point} 포인트</Text>
        )}
      </View>
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
});
