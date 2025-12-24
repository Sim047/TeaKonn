import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {token ? <Chats onLogout={onLogout} /> : <Login onLoggedIn={onLoggedIn} />}
    </SafeAreaView>
  );
}
