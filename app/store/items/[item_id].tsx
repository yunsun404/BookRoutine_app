import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { getStoreItem, purchaseItem, StoreItemDetail } from '../../../constants/storeApi';
import { useAuthStore } from '../../../store/useAuthStore';

export default function StoreDetailScreen() {
    const { item_id } = useLocalSearchParams<{ item_id: string }>();
    const router = useRouter();

    const [item, setItem] = useState<StoreItemDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    const points = useAuthStore((state) => state.user?.points ?? 0);
    const updatePoints = useAuthStore((state) => state.updatePoints);

    useEffect(() => {
        if (!item_id) return;
        getStoreItem(item_id)
            .then(setItem)
            .catch(() => Alert.alert('오류', '상품 정보를 불러오지 못했습니다.'))
            .finally(() => setLoading(false));
    }, [item_id]);

    const handlePurchase = async () => {
        if (!item || item.is_owned || points < item.price || purchasing) return;

        setPurchasing(true);
        try {
            const result = await purchaseItem(item.character_id);
            updatePoints(result.remaining_points);
            setItem({ ...item, is_owned: true, purchased_at: result.purchased_at });
            Alert.alert('알림', '상품을 구매했습니다.', [{ text: '닫기' }]);
        } catch (err: any) {
            if (err.status === 409) {
                setItem({ ...item, is_owned: true });
                Alert.alert('알림', '이미 구매한 상품입니다.', [{ text: '닫기' }]);
            } else {
                Alert.alert('구매 실패', err.message ?? '잠시 후 다시 시도해주세요.', [{ text: '닫기' }]);
            }
        } finally {
            setPurchasing(false);
        }
    };

    if (loading || !item) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7C6FEF" />
            </View>
        );
    }

    const disabled = item.is_owned || points < item.price;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.topBar}>
                <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
                <Ionicons name="menu-outline" size={26} color="#1A1A1A" />
            </View>

            <View style={styles.titleRow}>
                <Text style={styles.title}>캐릭터 상점</Text>
                <View style={styles.balancePill}>
                    <Ionicons name="server-outline" size={16} color="#7C6FEF" />
                    <Text style={styles.balanceText}>잔액 : {points}코인</Text>
                </View>
            </View>

            <Text style={styles.itemName}>{item.name}</Text>

            <View style={styles.imageCard}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" />
                ) : (
                    <View style={styles.imagePlaceholder} />
                )}
            </View>

            {item.is_owned ? (
                <Text style={styles.infoText}>
                    획득 날짜: {new Date(item.purchased_at!).toLocaleDateString('ko-KR')}
                </Text>
            ) : (
                <Text style={styles.infoText}>가격: {item.price}코인</Text>
            )}

            <TouchableOpacity
                style={[styles.buyButton, disabled && styles.buyButtonDisabled]}
                disabled={disabled || purchasing}
                onPress={handlePurchase}
            >
                {purchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.buyButtonText}>
                        {item.is_owned ? '보유중' : '구매하기'}
                    </Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F4FA',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDEBFB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    balanceText: {
        color: '#7C6FEF',
        fontWeight: '700',
        fontSize: 14,
    },
    itemName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 16,
    },
    imageCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        padding: 24,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#EEE',
        borderRadius: 8,
    },
    infoText: {
        fontSize: 16,
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 24,
    },
    buyButton: {
        backgroundColor: '#7C6FEF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    buyButtonDisabled: {
        backgroundColor: '#C9C7D6',
    },
    buyButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});