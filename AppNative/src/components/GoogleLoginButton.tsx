import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { api } from '../api';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onLoggedIn: (token: string) => void;
};

export default function GoogleLoginButton({ onLoggedIn }: Props) {
  const extra: any = Constants?.expoConfig?.extra || {};
  const androidClientId = extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
  const iosClientId = extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
  const webClientId = extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    const handle = async () => {
      try {
        if (response?.type !== 'success') return;
        const idToken = (response as any)?.authentication?.idToken || (response as any)?.params?.id_token;
        if (!idToken) return;
        const { data } = await api.post('/auth/google', { idToken });
        const token: string | undefined = data?.token;
        if (token) onLoggedIn(token);
      } catch (e) {
        console.warn('Google login failed', e);
      }
    };
    handle();
  }, [response]);

  const disabled = !request || (!androidClientId && !iosClientId && !webClientId);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        disabled={disabled}
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={() => promptAsync()}
      >
        <Text style={styles.txt}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12, alignItems: 'center' },
  btn: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: '#ddd' },
  btnDisabled: { opacity: 0.5 },
  txt: { color: '#111', fontSize: 14, fontWeight: '600' },
});
