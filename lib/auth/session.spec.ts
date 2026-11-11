/**
 * 로그인 토큰 갱신·만료 + 프로필 요청(lib/api.ts)에 토큰이 붙는지
 * fetch 는 가짜(jest.fn), AsyncStorage 는 라이브러리가 주는 테스트용 가짜를 씀
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { userApi } from '../api';
import {
  expireSession,
  refreshAccessToken,
  sendWithAuth,
  setSessionExpiredHandler,
  TOKEN_KEYS,
} from './session';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const json = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }) as unknown as Response;

const fetchMock = jest.fn();
const onExpired = jest.fn();
let unsubscribe: () => void;

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockReset();
  onExpired.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  unsubscribe = setSessionExpiredHandler(onExpired);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  unsubscribe();
  jest.restoreAllMocks();
});

const login = async (access = 'old-access', refresh = 'refresh-1') => {
  await AsyncStorage.setItem(TOKEN_KEYS.access, access);
  await AsyncStorage.setItem(TOKEN_KEYS.refresh, refresh);
};
const authHeader = (callIndex: number) => (fetchMock.mock.calls[callIndex][1].headers as Record<string, string>).Authorization;

describe('프로필 요청 (userApi.getMe)', () => {
  it('저장된 토큰이 Authorization 헤더로 붙음', async () => {
    await login('my-token');
    fetchMock.mockResolvedValueOnce(json(200, { user_id: 'u1', nickname: '나' }));
    await expect(userApi.getMe()).resolves.toMatchObject({ nickname: '나' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/users\/me$/);
    expect(authHeader(0)).toBe('Bearer my-token');
  });

  it('401 → refresh 토큰으로 갱신({ refreshToken }) → 새 토큰으로 다시 요청', async () => {
    await login();
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(201, { access_token: 'new-access' }))
      .mockResolvedValueOnce(json(200, { nickname: '나' }));

    await expect(userApi.getMe()).resolves.toMatchObject({ nickname: '나' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: 'refresh-1' });
    expect(authHeader(2)).toBe('Bearer new-access');
    expect(await AsyncStorage.getItem(TOKEN_KEYS.access)).toBe('new-access');
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('갱신도 거절되면 → 토큰 지우고 만료 처리(로그인 화면) + 오류', async () => {
    await login();
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(401, { message: 'Invalid refresh token' }));

    await expect(userApi.getMe()).rejects.toThrow('Unauthorized');
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(TOKEN_KEYS.access)).toBeNull();
    expect(await AsyncStorage.getItem(TOKEN_KEYS.refresh)).toBeNull();
  });

  it('서버가 갱신에 빈 응답(200)을 줘도 실패로 봄 (DB에 없는 refresh 토큰)', async () => {
    await login();
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(200, undefined));
    await expect(userApi.getMe()).rejects.toThrow();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('refresh 토큰이 없으면 갱신 요청 없이 만료 처리', async () => {
    await AsyncStorage.setItem(TOKEN_KEYS.access, 'old-access');
    fetchMock.mockResolvedValueOnce(json(401, {}));
    await expect(userApi.getMe()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});

describe('sendWithAuth', () => {
  it('로그인 안 한 상태(토큰 없음)의 401 은 그대로 돌려주고 만료 처리 안 함', async () => {
    const send = jest.fn().mockResolvedValue(json(401, {}));
    const res = await sendWithAuth(send);
    expect(res.status).toBe(401);
    expect(send).toHaveBeenCalledWith(null);
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('다시 보낸 요청도 401 이면 만료 처리', async () => {
    await login();
    fetchMock.mockResolvedValueOnce(json(200, { access_token: 'new-access' }));
    const send = jest.fn().mockResolvedValue(json(401, {}));
    const res = await sendWithAuth(send);
    expect(res.status).toBe(401);
    expect(send).toHaveBeenCalledTimes(2);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('갱신 중 네트워크 오류 → 로그아웃하지 않고 오류만 (토큰 유지)', async () => {
    await login();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const send = jest.fn().mockResolvedValue(json(401, {}));
    await expect(sendWithAuth(send)).rejects.toThrow('Network request failed');
    expect(onExpired).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(TOKEN_KEYS.access)).toBe('old-access');
  });
});

describe('refreshAccessToken / expireSession', () => {
  it('동시에 여러 번 불러도 갱신 요청은 1번', async () => {
    await login();
    fetchMock.mockResolvedValueOnce(json(200, { access_token: 'new-access' }));
    const [a, b, c] = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);
    expect([a, b, c]).toEqual(['new-access', 'new-access', 'new-access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('동시에 만료돼도 로그인 화면 이동은 1번', async () => {
    await login();
    await Promise.all([expireSession(), expireSession()]);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});
