import { userApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";

// 마이페이지 > 알림 설정. 이 앱엔 알림 "종류"가 습관 리마인더 하나뿐이라
// 스위치도 계정 전체를 한 번에 켜고 끄는 것 하나만 둡니다 — 책(목표)별로
// 나누거나 "빈도를 직접 고르는" 옵션은 일부러 넣지 않았습니다. 빈도 계산
// (습관 형성도에 따라 하루 3→2→1회로 자동으로 줄어드는 로직)은 서버가 알아서
// 판단하는 내부 동작이라, 유저가 신경 쓸 부분은 "받을지 말지" 뿐입니다.
export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await userApi.getMe();
        setEnabled(result.notifications_enabled ?? true);
      } catch (error) {
        console.error("알림 설정 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 낙관적 업데이트 — 폴더 표지 변경 기능에서 쓴 것과 같은 패턴입니다.
  // 스위치를 누르는 즉시 화면부터 바꾸고, 서버 저장이 실패하면 되돌립니다.
  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      await userApi.updateNotificationSettings(value);
    } catch (error) {
      console.error("알림 설정 변경 오류:", error);
      setEnabled(!value);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 24 }}>
        알림 설정
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "500" }}>알림 받기</Text>
          <Text style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            습관 리마인더와 타래 요약 알림을 받습니다. 꺼두면 어떤 책이든
            알림이 오지 않아요.
          </Text>
        </View>
        <Switch value={enabled} onValueChange={handleToggle} disabled={saving} />
      </View>
    </View>
  );
}
