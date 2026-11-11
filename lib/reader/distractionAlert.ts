/**
 * 딴짓 알림: "언제 울릴지"만 정하는 순수 로직 (소리·진동 재생은 hooks/useDistractionAlert.ts)
 *
 *  - 딴짓(멍때림·훑어보기 포함) / 자리 비움이 delayMs 넘게 이어지면 한 번 울림
 *  - 한 번 울리면 cooldownMs 동안은 다시 안 울림. 다시 울리려면 또 delayMs 만큼 이어져야 함
 *  - 다시 집중하면 처음부터 다시 셈
 *  - 보정 중·측정 준비 중·카메라 꺼짐 = 'skip' → 세던 것도 처음부터
 *
 * 화면 알림일 뿐, 집중 판정이나 서버로 보내는 값은 바꾸지 않음
 */

export type AlertInput = 'good' | 'bad' | 'skip';

export interface AlertState {
  /** 딴짓이 시작된 시각 (지금 집중 중이면 null) */
  badSince: number | null;
  /** 마지막으로 울린 시각 */
  lastAlertAt: number | null;
}

export const INITIAL_ALERT_STATE: AlertState = { badSince: null, lastAlertAt: null };

export interface AlertConfig {
  delayMs: number;
  cooldownMs: number;
}

/** 판정 결과 → 알림 입력 */
export function alertInputOf(
  focus: { phase: 'calibrating' | 'tracking'; state: 'focused' | 'unfocused' | 'away' } | null,
  includeAway: boolean,
): AlertInput {
  if (!focus || focus.phase !== 'tracking') return 'skip';
  if (focus.state === 'focused') return 'good';
  if (focus.state === 'away' && !includeAway) return 'good';
  return 'bad';
}

/** 울릴 때 화면에 잠깐 띄울 짧은 문구 (지금 판정 이유에 따라) */
export function alertMessageOf(
  focus: { state: 'focused' | 'unfocused' | 'away'; detail?: string | null } | null,
): string {
  if (focus?.state === 'away') return '화면을 보고 있지 않아요';
  if (focus?.detail === 'staring') return '잠깐 멍때리고 있어요';
  if (focus?.detail === 'skimming') return '너무 빨리 넘기고 있어요';
  return '집중이 흐트러졌어요';
}

/** 한 번 진행: 새 상태 + 지금 울릴지 */
export function stepAlert(
  state: AlertState,
  input: AlertInput,
  now: number,
  cfg: AlertConfig,
): { state: AlertState; fire: boolean } {
  if (input !== 'bad') return { state: { ...state, badSince: null }, fire: false };
  const badSince = state.badSince ?? now;
  const longEnough = now - badSince >= cfg.delayMs;
  const rested = state.lastAlertAt === null || now - state.lastAlertAt >= cfg.cooldownMs;
  if (longEnough && rested) {
    // 울린 뒤에는 다시 delayMs 를 셈 (쉬는 시간이 끝나도 바로 또 울리지 않게)
    return { state: { badSince: now, lastAlertAt: now }, fire: true };
  }
  return { state: { ...state, badSince }, fire: false };
}
