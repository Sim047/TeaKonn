import Constants from 'expo-constants';
import axios from 'axios';

const API_BASE = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_BASE || process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3001';
const API_URL = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || `${API_BASE}/api`;

export const api = axios.create({
  baseURL: API_URL,
});

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function me(token: string) {
  const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
