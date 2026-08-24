import { BASE_URL } from '../constants/api'; // 기존에 쓰시던 경로에 맞게 조정해주세요
import { useAuthStore } from '../store/useAuthStore';

export interface StoreItem {
    character_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    is_owned: boolean;
}

export interface PurchaseResult {
    character_id: string;
    name: string;
    purchased_at: string;
    remaining_points: number;
}

export async function getStoreList(): Promise<StoreItem[]> {
    const access_token = useAuthStore.getState().access_token;

    const res = await fetch(`${BASE_URL}/store/list`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    if (!res.ok) {
        throw new Error('상점 목록을 불러오지 못했습니다.');
    }
    return res.json();
}

export async function purchaseItem(character_id: string): Promise<PurchaseResult> {
    const access_token = useAuthStore.getState().access_token;

    const res = await fetch(`${BASE_URL}/store/items/${character_id}/purchase`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        const err = new Error(error?.message ?? '구매에 실패했습니다.') as Error & { status?: number };
        err.status = res.status;  // 409: 이미 보유, 400: 포인트 부족 등 구분용
        throw err;
    }

    return res.json();
}