/**
 * 읽던 위치 저장소 (AsyncStorage) — 형식·환산은 readingPosition.ts
 * 저장·불러오기가 실패해도 읽기는 계속되도록 오류는 조용히 무시한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parsePosition, positionKey, serializePosition } from './readingPosition';

/** 저장된 위치(글자 칸). 없거나 실패하면 0 */
export async function loadReadingPosition(bookId: string, length: number): Promise<number> {
  try {
    return parsePosition(await AsyncStorage.getItem(positionKey(bookId)), length);
  } catch {
    return 0;
  }
}

export async function saveReadingPosition(bookId: string, charIndex: number, total: number): Promise<void> {
  try {
    await AsyncStorage.setItem(positionKey(bookId), serializePosition(charIndex, total));
  } catch {
    // 저장 실패 → 다음에 처음부터 읽게 될 뿐
  }
}
