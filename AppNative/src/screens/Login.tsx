import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { login } from '../api';
import GoogleLoginButton from '../components/GoogleLoginButton';

type Props = {
  onLoggedIn: (token: string) => void;
};

export default function Login({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      if (!data?.token) throw new Error('No token returned');
      onLoggedIn(data.token);
    } catch (err: any) {
      Alert.alert('Login failed', err?.response?.data?.message || err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>TeaKonn</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          maxLength={254}
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          maxLength={128}
          placeholderTextColor={colors.muted}
        />
        <View style={styles.actions}>
          <Button title={loading ? 'Logging in…' : 'Log In'} onPress={doLogin} disabled={loading} />
        </View>
        <View style={{ height: spacing.md }} />
        <GoogleLoginButton onLoggedIn={onLoggedIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.lg, color: colors.text },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
    backgroundColor: '#0f1b3d',
  },
  actions: { width: '100%' },
});
