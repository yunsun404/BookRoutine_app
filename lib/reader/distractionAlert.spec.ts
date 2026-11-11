import { alertInputOf, alertMessageOf, INITIAL_ALERT_STATE, stepAlert, type AlertInput, type AlertState } from './distractionAlert';

const cfg = { delayMs: 10_000, cooldownMs: 60_000 };

/** [시각(ms), 입력] 을 차례로 넣고 울린 시각 목록을 돌려줌 */
const run = (steps: [number, AlertInput][]) => {
  let s: AlertState = INITIAL_ALERT_STATE;
  const fired: number[] = [];
  for (const [t, input] of steps) {
    const r = stepAlert(s, input, t, cfg);
    s = r.state;
    if (r.fire) fired.push(t);
  }
  return fired;
};
/** from~to 를 1초마다 같은 입력으로 */
const span = (from: number, to: number, input: AlertInput): [number, AlertInput][] => {
  const out: [number, AlertInput][] = [];
  for (let t = from; t <= to; t += 1000) out.push([t, input]);
  return out;
};

describe('stepAlert (딴짓 알림 타이밍)', () => {
  it('딴짓이 10초 이어지면 한 번 울림', () => {
    expect(run(span(0, 15_000, 'bad'))).toEqual([10_000]);
  });

  it('10초 전에 다시 집중하면 안 울리고 처음부터 셈', () => {
    expect(run([...span(0, 8_000, 'bad'), [9_000, 'good'], ...span(10_000, 18_000, 'bad')])).toEqual([]);
  });

  it('계속 딴짓해도 60초 동안은 다시 안 울림', () => {
    expect(run(span(0, 75_000, 'bad'))).toEqual([10_000, 70_000]);
  });

  it('쉬는 시간이 끝나도 새 딴짓이 10초 이어져야 울림', () => {
    const steps = [...span(0, 10_000, 'bad'), ...span(11_000, 69_000, 'good'), ...span(70_000, 85_000, 'bad')];
    expect(run(steps)).toEqual([10_000, 80_000]);
  });

  it('보정 중(skip)이면 안 울리고 세던 것도 버림', () => {
    expect(run([...span(0, 9_000, 'bad'), [9_500, 'skip'], ...span(10_000, 15_000, 'bad')])).toEqual([]);
  });
});

describe('alertInputOf (판정 → 알림 입력)', () => {
  const tr = (state: 'focused' | 'unfocused' | 'away') => ({ phase: 'tracking' as const, state });

  it('집중 = good, 딴짓 = bad', () => {
    expect(alertInputOf(tr('focused'), true)).toBe('good');
    expect(alertInputOf(tr('unfocused'), true)).toBe('bad');
  });

  it('자리 비움은 설정에 따라', () => {
    expect(alertInputOf(tr('away'), true)).toBe('bad');
    expect(alertInputOf(tr('away'), false)).toBe('good');
  });

  it('측정 준비 중·기준 잡는 중이면 skip', () => {
    expect(alertInputOf(null, true)).toBe('skip');
    expect(alertInputOf({ phase: 'calibrating', state: 'unfocused' }, true)).toBe('skip');
  });
});

describe('alertMessageOf (화면에 잠깐 뜨는 문구)', () => {
  it('이유별 짧은 문구', () => {
    expect(alertMessageOf({ state: 'away' })).toBe('화면을 보고 있지 않아요');
    expect(alertMessageOf({ state: 'unfocused', detail: 'staring' })).toBe('잠깐 멍때리고 있어요');
    expect(alertMessageOf({ state: 'unfocused', detail: 'skimming' })).toBe('너무 빨리 넘기고 있어요');
    expect(alertMessageOf({ state: 'unfocused', detail: 'head' })).toBe('집중이 흐트러졌어요');
  });
});
