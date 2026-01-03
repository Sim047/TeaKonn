import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, BackHandler, ToastAndroid } from 'react-native';
import Login from './screens/Login';
import Chats from './screens/Chats';
import { saveToken, getToken, clearToken } from './storage';
import { me } from './api';

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try {
          await me(t);
          setToken(t);
        } catch {
          await clearToken();
        }
      }
    })();
  }, []);

  const onLoggedIn = async (t: string) => {
    await saveToken(t);
    setToken(t);
  };

  const onLogout = async () => {
    await clearToken();
    setToken(null);
  };

  // Guard Android hardware back to avoid accidental app exit
  const lastBackRef = useRef<number>(0);
  useEffect(() => {
    const onBackPress = () => {
      // If not authenticated, let default behavior occur
      if (!token) return false;
      const now = Date.now();
      if (now - lastBackRef.current < 1500) {
        // Double press: allow exit
        return false;
      }
      lastBackRef.current = now;
      try {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      } catch {}
      return true; // consume first back
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [token]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {token ? <Chats onLogout={onLogout} /> : <Login onLoggedIn={onLoggedIn} />}
    </SafeAreaView>
  );
}
