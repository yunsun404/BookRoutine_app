import Header from '@/components/Header';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { getStoreList, purchaseItem, StoreItem } from '../constants/storeApi';
import { useAuthStore } from '../store/useAuthStore';

export default function StoreListScreen() {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    const points = useAuthStore((state) => state.user?.points ?? 0);
    const updatePoints = useAuthStore((state) => state.updatePoints);
    const user = useAuthStore((state) => state.user);

    const loadItems = useCallback(async () => {
        try {
            const data = await getStoreList();
            setItems(data);
        } catch (err) {
            Alert.alert('오류', '상점 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadItems();
    };

    const handlePurchase = async (item: StoreItem) => {
        if (item.is_owned) {
            console.log('이미 구매한 상품입니다.');
            Alert.alert('알림', '이미 구매한 상품입니다.', [{ text: '닫기' }]);
            return;
        }

        if (points < item.price || purchasingId) return;

        setPurchasingId(item.character_id);
        try {
            const result = await purchaseItem(item.character_id);
            updatePoints(result.remaining_points);
            setItems((prev) =>
                prev.map((i) =>
                    i.character_id === item.character_id ? { ...i, is_owned: true } : i)
            );
            console.log(`${result.name}을(를)을 구매했습니다.`);
            Alert.alert('알림', `${result.name}을(를)을 구매했습니다.`, [{ text: '닫기' }]);
        } catch (err: any) {
            if (err.status === 409) {
                Alert.alert('알림', '이미 구매한 상품입니다.', [{ text: '닫기' }]);
                setItems((prev) =>
                    prev.map((i) =>
                        i.character_id === item.character_id ? { ...i, is_owned: true } : i)
                );
            } else {
                Alert.alert('구매 실패', err.message ?? '잠시 후 다시 시도해주세요.');
            }
        } finally {
            setPurchasingId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7C6FEF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header />

            <View style={styles.titleRow}>
                <Text style={styles.title}>캐릭터 상점</Text>
                <View style={styles.balancePill}>
                    <Ionicons name="server-outline" size={16} color="#7C6FEF" />
                    <Text style={styles.balanceText}>잔액 : {points}코인</Text>
                </View>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.character_id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.row}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                renderItem={({ item }) => {
                    const affordable = points >= item.price;
                    const disabled = !affordable || item.is_owned;
                    const isPurchasing = purchasingId === item.character_id;

                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push({
                                pathname: '/store/items/[item_id]',
                                params: { item_id: item.character_id }
                            })
                            }
                            activeOpacity={0.8}>

                            <View style={styles.card}>
                                <View style={styles.imageWrapper}>
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="contain" />
                                    ) : (
                                        <View style={styles.imagePlaceholder} />
                                    )}
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.price}>{item.price}코인</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.buyButton, disabled && styles.buyButtonDisabled]}
                                    disabled={disabled || isPurchasing}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handlePurchase(item);
                                    }}
                                >
                                    {isPurchasing ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.buyButtonText}>구매하기</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const CARD_WIDTH = '48%';

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
        marginBottom: 16,
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
    listContent: {
        paddingBottom: 24,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
    },
    imageWrapper: {
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
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
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    price: {
        fontSize: 14,
        color: '#8A8A8A',
    },
    buyButton: {
        width: '100%',
        backgroundColor: '#7C6FEF',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    buyButtonDisabled: {
        backgroundColor: '#C9C7D6',
    },
    buyButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});