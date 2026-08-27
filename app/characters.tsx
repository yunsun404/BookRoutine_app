import { authFetch, BASE_URL } from "@/constants/api";
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Text,
    View,
} from 'react-native';
import { charactersStyles as styles } from './styles/characters.styles';

// ===== 타입 =====
interface CharacterListItem {
  character_id: string;
  name: string;
  image_url: string | null;
  required_level: number;
  price: number;
  is_owned: boolean;
  is_unlockable: boolean;
  is_active: boolean;
}

// ===== API 호출 =====
async function fetchMyCharacters(): Promise<CharacterListItem[]> {
  const response = await authFetch(`${BASE_URL}/characters/me`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchMyLevel(): Promise<{ level: number }> {
  const response = await authFetch(`${BASE_URL}/level/me`);
  return response.json();
}

async function fetchMyPoints(): Promise<{ points: number }> {
  const response = await authFetch(`${BASE_URL}/points/me`);
  return response.json();
}

// ===== 화면 =====
export default function CharactersScreen() {
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [level, setLevel] = useState<number>(1);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [charList, levelInfo, pointInfo] = await Promise.all([
        fetchMyCharacters(),
        fetchMyLevel(),
        fetchMyPoints(),
      ]);
      setCharacters(charList);
      setLevel(levelInfo.level);
      setPoints(pointInfo.points);
    } catch (err) {
      console.error("에러:", err);
      Alert.alert('오류', '캐릭터 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const renderBadge = (item: CharacterListItem) => {
    if (item.is_owned) {
      return (
        <View style={[styles.badge, styles.badgeOwned]}>
          <Text style={styles.badgeOwnedText}>보유중</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeLocked]}>
        <Text style={styles.badgeLockedText}>Lv. {item.required_level} 해금</Text>
        {item.price > 0 && <Text style={styles.priceText}>{item.price}코인</Text>}
      </View>
    );
  };

  const renderItem = ({ item }: { item: CharacterListItem }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.image_url ?? undefined }}
        style={[styles.cardImage, !item.is_owned && styles.cardImageLocked]}
      />
      <Text style={styles.cardName}>{item.name}</Text>
      {renderBadge(item)}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C6CE8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <Text style={styles.levelText}>내 레벨  Lv.{level}</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>💎 잔액 : {points}코인</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>보유 캐릭터</Text>

      <FlatList
        data={characters}
        keyExtractor={(item) => item.character_id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.grid}
        onRefresh={loadAll}
        refreshing={loading}
      />
    </View>
  );
}