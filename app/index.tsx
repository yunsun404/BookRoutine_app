import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { authApi, userApi } from '../lib/api';
import { syncPushToken } from '../lib/notifications';
import { useAuthStore } from '../store/useAuthStore';

// RN의 Alert.alert는 웹에서 아무것도 표시하지 않습니다(no-op).
// 그래서 웹에서는 로그인 실패 메시지가 안 보여 "그냥 멈춘 것"처럼 느껴지므로 브라우저 alert로 대체합니다.
function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('오류', '아이디와 비밀번호를 입력해주세요.');
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
      showAlert('로그인 실패', e.message || '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 키보드가 올라오면 화면도 같이 올라가고, 스크롤로 아래 칸까지 볼 수 있게
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
      ></Image>

      <Text style={styles.title}>로그인</Text>

      <TextInput
        style={styles.input}
        placeholderTextColor="#A0A3BD"
        placeholder="아이디"
        value={username}
        onChangeText={setUsername}
        keyboardType="default"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholderTextColor="#A0A3BD"
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
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1, // ScrollView 안이라 flex 대신 flexGrow (내용이 적으면 가운데 정렬 유지)
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


  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2233', // 지정 안 하면 다크 모드에서 흰 글자가 됨
  },
  button: {
    backgroundColor: '#6B7BFF',
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