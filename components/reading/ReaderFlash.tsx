/**
 * 읽기 화면 위에 잠깐 나타나는 표시들 (모두 터치를 막지 않음, 움직임은 네이티브 드라이버)
 *
 *  - ChipGlow          : 상태 칩 테두리가 숨 쉬듯 은은하게 밝아졌다 어두워짐 (집중 중)
 *  - AlertFlash        : 딴짓 알림 문구가 위에서 살짝 내려와 잠깐 보였다 사라짐 (짧게)
 *  - CelebrationBanner : 골든타임 달성 연출 — 톡 튀어나오고 해 아이콘이 빛나다 위로 사라짐
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/** 한 번 띄울 내용. id 가 바뀔 때마다 새로 보여 줌 (같은 문구가 연달아 와도) */
export interface Flash {
  id: number;
  title: string;
  sub?: string;
}

/* ─────────── 상태 칩 테두리 빛 ─────────── */
const GLOW_HALF_MS = 1_500; // 밝아지는 데 1.5초, 어두워지는 데 1.5초

export function ChipGlow({ active, color }: { active: boolean; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      const out = Animated.timing(v, { toValue: 0, duration: 400, useNativeDriver: true });
      out.start();
      return () => out.stop();
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.25, duration: GLOW_HALF_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);

  return (
    <>
      {/* 바깥 번짐 (넓고 옅게) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glowOuter, { borderColor: color, opacity: Animated.multiply(v, 0.35) }]}
      />
      {/* 테두리 */}
      <Animated.View pointerEvents="none" style={[styles.glowInner, { borderColor: color, opacity: v }]} />
    </>
  );
}

/* ─────────── 딴짓 알림 문구 ─────────── */
export function AlertFlash({ flash, durationMs, top }: { flash: Flash | null; durationMs: number; top: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flash) return;
    v.setValue(0);
    const a = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(Math.max(0, durationMs - 500)),
      Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [flash, durationMs, v]);

  if (!flash) return null;
  return (
    <View pointerEvents="none" style={[styles.flashWrap, { top }]}>
      <Animated.View
        style={[
          styles.alertBox,
          { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
        ]}
      >
        <Ionicons name="notifications" size={14} color="#B26A00" />
        <Text style={styles.alertText} numberOfLines={1}>
          {flash.title}
        </Text>
      </Animated.View>
    </View>
  );
}

/* ─────────── 골든타임 달성 연출 ─────────── */
const CELEBRATE_HOLD_MS = 2_800;

export function CelebrationBanner({ flash, top }: { flash: Flash | null; top: number }) {
  const enter = useRef(new Animated.Value(0)).current; // 0 → 1 나타남, 1 → 2 사라짐
  const shine = useRef(new Animated.Value(0)).current; // 해 아이콘 빛
  useEffect(() => {
    if (!flash) return;
    enter.setValue(0);
    shine.setValue(0);
    const a = Animated.sequence([
      Animated.spring(enter, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.delay(CELEBRATE_HOLD_MS),
      Animated.timing(enter, { toValue: 2, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    const s = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    a.start();
    s.start();
    return () => {
      a.stop();
      s.stop();
    };
  }, [flash, enter, shine]);

  if (!flash) return null;
  return (
    <View pointerEvents="none" style={[styles.flashWrap, { top }]}>
      <Animated.View
        style={[
          styles.celebrateBox,
          {
            opacity: enter.interpolate({ inputRange: [0, 0.6, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1, 2], outputRange: [-18, 0, -14] }) },
              { scale: enter.interpolate({ inputRange: [0, 1, 2], outputRange: [0.85, 1, 0.96] }) },
            ],
          },
        ]}
      >
        <View style={styles.sunWrap}>
          <Animated.View
            style={[
              styles.sunHalo,
              {
                opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] }),
                transform: [{ scale: shine.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) }],
              },
            ]}
          />
          <Animated.View
            style={{ transform: [{ rotate: shine.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) }] }}
          >
            <Ionicons name="sunny" size={22} color="#FF9F2E" />
          </Animated.View>
        </View>
        <View style={styles.celebrateTexts}>
          <Text style={styles.celebrateTitle} numberOfLines={1}>
            {flash.title}
          </Text>
          {!!flash.sub && (
            <Text style={styles.celebrateSub} numberOfLines={1}>
              {flash.sub}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowInner: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 999,
    borderWidth: 2,
  },
  glowOuter: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 999,
    borderWidth: 4,
  },

  flashWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 17 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '80%',
    backgroundColor: '#FFF6E0',
    borderWidth: 1,
    borderColor: '#F5D48A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 3,
  },
  alertText: { fontSize: 13, fontWeight: '700', color: '#8A5300', flexShrink: 1 },

  celebrateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: '88%',
    backgroundColor: '#FFF8EC',
    borderWidth: 1.5,
    borderColor: '#FFD48A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#FF9F2E',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sunWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sunHalo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFE2A8' },
  celebrateTexts: { flexShrink: 1 },
  celebrateTitle: { fontSize: 16, fontWeight: '800', color: '#B4473A', letterSpacing: -0.3 },
  celebrateSub: { fontSize: 12, fontWeight: '600', color: '#C0705F', marginTop: 2 },
});
