import { Stack } from 'expo-router';

export default function EbookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}> {/* 이 옵션 추가 */}
      <Stack.Screen name="index" options={{ title: '전자책' }} />
      <Stack.Screen name="history" options={{ title: '독서 이력' }} />
      <Stack.Screen name="[bookId]/index" options={{ title: '전자책 상세' }} />
      <Stack.Screen name="[bookId]/read" options={{ title: '읽기', headerBackVisible: false }} />
      <Stack.Screen name="[bookId]/result" options={{ title: '결과' }} />
    </Stack>
  );
}