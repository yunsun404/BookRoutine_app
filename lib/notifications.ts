import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { userApi } from "./api";

// 알림이 "포그라운드(앱을 보고 있는 중)"에 도착했을 때도 배너/사운드를 띄우도록 설정합니다.
// expo-notifications의 기본값은 포그라운드에서는 조용히 무시하는 거라, 이걸 안 하면
// "앱 켜놓고 테스트하는데 알림이 하나도 안 온다"고 착각하기 쉽습니다. 파일이 로드되는
// 시점에 한 번만 등록하면 되므로 함수 밖(모듈 최상단)에 둡니다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 알림 권한을 요청하고, 이 기기의 "네이티브" FCM/APNs 디바이스 토큰을 받아옵니다.
//
// 왜 Notifications.getExpoPushTokenAsync()가 아니라 getDevicePushTokenAsync()를 쓰는가:
// Expo는 두 가지 토큰 체계를 제공합니다.
//   1) Expo Push Token — Expo의 중계 서버(Expo Push Service)를 거쳐 보내는 방식.
//      서버가 firebase-admin 대신 Expo의 전송 API를 호출해야 합니다.
//   2) 네이티브 디바이스 토큰(FCM/APNs) — Firebase Admin SDK가 이 기기로 "직접" 쏘는 방식.
// 우리 백엔드(notifications.service.ts)는 firebase-admin의 admin.messaging().send({ token })을
// 그대로 쓰고 있어서, 반드시 2번 "네이티브 토큰"이 필요합니다. Expo Push Token을 넣으면
// 형식(`ExponentPushToken[...]`)이 안 맞아서 FCM이 그 토큰을 그냥 거부합니다.
//
// 그리고 이 함수는 Expo Go에서는 항상 null을 반환합니다 — Expo Go는 SDK 53부터 푸시
// 기능 자체를 지원하지 않기 때문에, 개발 빌드(dev build)로 설치한 앱에서만 동작합니다.
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // 웹은 FCM 네이티브 토큰 개념이 없고, 브라우저 알림 권한 팝업/서비스워커 대기에서
  // Promise가 끝나지 않아 로그인 버튼이 "무한 로딩"에 빠질 수 있어 아예 건너뜁니다.
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    // Android 8(API 26) 이상은 "채널"이 지정 안 된 알림은 아예 표시가 안 됩니다.
    await Notifications.setNotificationChannelAsync("default", {
      name: "기본 알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("알림 권한이 거부되어 fcm_token을 등록하지 않습니다.");
    return null;
  }

  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    return token;
  } catch (e) {
    // Expo Go(개발 빌드가 아닌 환경)에서 호출하면 여기서 에러가 납니다.
    console.warn("네이티브 푸시 토큰 발급 실패 (Expo Go에서는 지원 안 함):", e);
    return null;
  }
}

// 토큰 발급 + 서버 등록까지 한 번에 처리하는 헬퍼.
// 로그인 직후에 호출합니다 — PATCH /users/me/fcm-token 은 인증이 필요해서
// 로그인으로 access_token이 생기기 전에는 호출할 수 없습니다.
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;
    await userApi.updateFcmToken(token);
  } catch (e) {
    // 알림 등록 실패가 로그인 자체를 막으면 안 되므로 조용히 로그만 남깁니다.
    console.error("FCM 토큰 등록 실패:", e);
  }
}
