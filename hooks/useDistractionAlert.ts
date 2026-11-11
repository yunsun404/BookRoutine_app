/**
 * 딴짓 알림: 딴짓이 이어지면 "띵동" 소리 + 짧은 진동 + 화면 문구(onAlert) (얇은 어댑터, 타이밍 판단은 lib/reader/distractionAlert.ts)
 *
 *  - 1초마다 지금 판정을 보고 stepAlert 로 울릴지 정함
 *    (판정이 갱신되지 않는 동안에도 시간이 흐르게, 판정이 바뀔 때가 아니라 1초 타이머로 확인)
 *  - 소리 켜기/끄기는 기기에 저장 (AsyncStorage 'reader_alert_sound')
 *  - 진동은 expo-haptics (진동 권한을 패키지가 직접 가짐 → 앱 설정에 권한을 따로 안 넣어도 됨)
 *  - expo-av / expo-haptics 가 빌드에 없거나 소리 파일을 못 읽으면 그 부분만 건너뜀 (앱은 멈추지 않음)
 *  - Android 는 "미디어 볼륨"으로 소리가 남 (미디어 볼륨 0 이면 진동만)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  alertInputOf,
  alertMessageOf,
  INITIAL_ALERT_STATE,
  stepAlert,
  type AlertState,
} from '../lib/reader/distractionAlert';
import { READER_CONFIG } from '../lib/reader/readerConfig';

const SOUND_KEY = 'reader_alert_sound';
type ExpoAv = typeof import('expo-av');
type ExpoHaptics = typeof import('expo-haptics');
type LoadedSound = InstanceType<ExpoAv['Audio']['Sound']>;

/** expo-av 를 필요할 때만 불러옴 → 예전 빌드에 네이티브 모듈이 없어도 화면이 깨지지 않게 */
function loadExpoAv(): ExpoAv | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-av') as ExpoAv;
  } catch {
    return null;
  }
}

function loadHaptics(): ExpoHaptics | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics') as ExpoHaptics;
  } catch {
    return null;
  }
}

type FocusLike =
  | (NonNullable<Parameters<typeof alertInputOf>[0]> & NonNullable<Parameters<typeof alertMessageOf>[0]>)
  | null;

/** onAlert: 울릴 때 화면에 잠깐 띄울 문구 */
export function useDistractionAlert({
  focus,
  active,
  onAlert,
}: {
  focus: FocusLike;
  active: boolean;
  onAlert?: (message: string) => void;
}) {
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);
  const focusRef = useRef<FocusLike>(focus);
  focusRef.current = focus;
  const stateRef = useRef<AlertState>(INITIAL_ALERT_STATE);
  const soundRef = useRef<LoadedSound | null>(null);

  // 저장된 켜기/끄기 불러오기
  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY)
      .then((v) => {
        if (v === 'off') {
          soundOnRef.current = false;
          setSoundOn(false);
        }
      })
      .catch(() => {});
  }, []);

  // 소리 미리 불러오기 (실패하면 진동만)
  useEffect(() => {
    const av = loadExpoAv();
    if (!av) return;
    let cancelled = false;
    (async () => {
      try {
        await av.Audio.setAudioModeAsync({ playsInSilentModeIOS: false, shouldDuckAndroid: true });
        const { sound } = await av.Audio.Sound.createAsync(require('../assets/sounds/focus-alert.wav'));
        if (cancelled) sound.unloadAsync().catch(() => {});
        else soundRef.current = sound;
      } catch {
        soundRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const fire = useCallback(() => {
    const haptics = loadHaptics();
    haptics?.notificationAsync(haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (soundOnRef.current) soundRef.current?.replayAsync().catch(() => {});
    onAlertRef.current?.(alertMessageOf(focusRef.current));
  }, []);

  // 1초마다 확인 (active 가 아니면 세던 것도 버림)
  useEffect(() => {
    const cfg = READER_CONFIG.DISTRACTION_ALERT;
    if (!active) {
      stateRef.current = { ...stateRef.current, badSince: null };
      return;
    }
    const t = setInterval(() => {
      const input = alertInputOf(focusRef.current, cfg.INCLUDE_AWAY);
      const r = stepAlert(stateRef.current, input, Date.now(), { delayMs: cfg.DELAY_MS, cooldownMs: cfg.COOLDOWN_MS });
      stateRef.current = r.state;
      if (r.fire) fire();
    }, 1000);
    return () => clearInterval(t);
  }, [active, fire]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    AsyncStorage.setItem(SOUND_KEY, next ? 'on' : 'off').catch(() => {});
  }, []);

  return { soundOn, toggleSound };
}
