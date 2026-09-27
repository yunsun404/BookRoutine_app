import FloatingTabMenu from '@/components/FloatingTabMenu';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function EbookLayout() {
  // 각 화면이 자체 헤더(뒤로가기 버튼)를 가지고 있어서 기본 헤더는 끔
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: '전자책' }} />
        <Stack.Screen name="history" options={{ title: '독서 이력' }} />
        <Stack.Screen name="[bookId]/index" options={{ title: '전자책 상세' }} />
        <Stack.Screen name="[bookId]/read" options={{ title: '읽기', gestureEnabled: false }} />
        <Stack.Screen name="[bookId]/result" options={{ title: '결과' }} />
      </Stack>
      <FloatingTabMenu />
    </View>
  );
}