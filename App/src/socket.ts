import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const BASE = (Constants.expoConfig?.extra as any)?.apiBase || process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000';

export const socket = io(BASE, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
});
