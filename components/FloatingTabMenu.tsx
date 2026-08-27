import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { name: string; title: string; icon: IoniconsName; route: string }[] = [
  { name: 'stats', title: '통계', icon: 'bar-chart-outline', route: '/(tabs)/stats' },
  { name: 'calendar', title: '달력', icon: 'calendar-outline', route: '/(tabs)/calendar' },
  { name: 'homescreen', title: '홈', icon: 'home-outline', route: '/(tabs)/homescreen' },
  { name: 'group', title: '그룹', icon: 'people-outline', route: '/(tabs)/group' },
  { name: 'recommend', title: '추천', icon: 'sparkles-outline', route: '/(tabs)/recommend' },
  { name: 'characters', title: '캐릭터', icon: 'paw-outline', route: '/characters' },
];

// 이 버튼을 숨겨야 할 화면 경로 (로그인, 회원가입, 로그아웃)
const HIDDEN_ROUTES = ['/', '/signup', '/logout'];

export default function FloatingTabMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 숨김 대상 경로면 아예 렌더링하지 않음
  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  const handlePress = (route: string) => {
    setOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="apps" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menuBox}>
            {MENU_ITEMS.map((item) => {
              const isActive = pathname.includes(item.name);
              return (
                <TouchableOpacity
                  key={item.name}
                  style={styles.menuItem}
                  onPress={() => handlePress(item.route)}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? '#4A3B32' : '#999'}
                  />
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 90,
    paddingRight: 24,
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuLabel: { fontSize: 14, color: '#999' },
  menuLabelActive: { color: '#4A3B32', fontWeight: '600' },
});