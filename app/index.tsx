import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { authApi, userApi } from '../lib/api';
import { syncPushToken } from '../lib/notifications';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('오류', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const { access_token, refresh_token } = await authApi.login({
        username: username.trim(),
        password,
      });

      await setAuth(
        { user_id: '', nickname: '' },
        access_token,
        refresh_token
      );

      const me = await userApi.getMe();
      await setAuth(me, access_token, refresh_token);

      // 로그인 성공 = access_token이 막 생긴 시점. PATCH /users/me/fcm-token은 인증이
      // 필요해서 이 시점보다 앞에서는 호출할 수 없습니다. 권한 거부/개발 빌드가 아닌
      // 환경(Expo Go) 등으로 실패해도 syncPushToken 내부에서 조용히 넘어가므로,
      // 로그인 흐름 자체를 막지 않도록 await만 하고 별도 에러 처리는 안 합니다.
      await syncPushToken();

      router.replace('/(tabs)/homescreen');
    } catch (e: any) {
      Alert.alert('로그인 실패', e.message || '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* ── 개발용 홈 바로가기 (배포 전 제거) ── */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => router.replace('/(tabs)/homescreen')}
      >
        <Text style={styles.devButtonText}>dev →</Text>
      </TouchableOpacity>


      <Text style={styles.title}>로그인</Text>

      <TextInput
        style={styles.input}
        placeholder="아이디"
        value={username}
        onChangeText={setUsername}
        keyboardType="default"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },

  // ── 개발용 버튼 ──
  devButton: {
    position: 'absolute',
    top: 56,
    left: 16,
  },
  devButtonText: {
    fontSize: 12,
    color: '#aaa',
  },


  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});