import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, BackHandler } from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { api } from './src/api';
import { socket } from './src/socket';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { setToken as persistToken, getToken as readToken, removeToken } from './src/storage';

interface Event {
  _id: string;
  title: string;
  sport: string;
  description: string;
  participants?: any[];
}

const Stack = createNativeStackNavigator();

function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>('');

  const doLogin = async () => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const t = res.data.token;
      await persistToken(t);
      navigation.replace('Web');
    } catch (e: any) {
      setStatus(e.response?.data?.error || e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TeaKonn Expo App</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} autoCapitalize='none' value={email} onChangeText={setEmail} />
      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
      <View style={{ marginTop: 12 }}>
        <Button title='Login' onPress={doLogin} />
      </View>
      {!!status && <Text style={styles.status}>{status}</Text>}
      <Text style={styles.env}>API: {Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL}</Text>
    </SafeAreaView>
  );
}

function DiscoverScreen({ navigation }: any) {
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const token = await readToken();
      if (!token) {
        navigation.replace('Login');
        return;
      }
      fetchEvents();
      socket.connect();
      socket.on('participant_joined', (payload: any) => {
        setStatus(`Participant joined: ${payload.participantId}`);
        fetchEvents();
      });
    };
    init();
    return () => {
      socket.off('participant_joined');
      socket.disconnect();
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events || res.data);
    } catch (e: any) {
      setStatus(e.response?.data?.error || e.message);
    }
  };

  const joinEvent = async (id: string) => {
    try {
      await api.post(`/events/${id}/join`, {});
      setStatus('Joined event successfully');
      fetchEvents();
    } catch (e: any) {
      setStatus(e.response?.data?.error || e.message);
    }
  };

  const logout = async () => {
    await removeToken();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Discover Events</Text>
      <View style={{ marginBottom: 10 }}>
        <Button title='Logout' onPress={logout} />
      </View>
      {!!status && <Text style={styles.status}>{status}</Text>}
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.sport}</Text>
            <Text style={styles.cardText}>{item.description}</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={() => joinEvent(item._id)}>
              <Text style={styles.joinTxt}>Join</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function WebScreen({ navigation }: any) {
  const webUrl = (process.env.EXPO_PUBLIC_WEB_URL as string) || (Constants.expoConfig?.extra as any)?.webUrl || 'http://localhost:5173';
  const webRef = React.useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [authScript, setAuthScript] = useState<string>("");
  const [webError, setWebError] = useState<string>("");

  // Hard refresh once auth script is ready so injection applies before content
  useEffect(() => {
    if (authScript) {
      const t = setTimeout(() => {
        try { webRef.current?.reload(); } catch {}
      }, 50);
      return () => clearTimeout(t);
    }
  }, [authScript]);

  // Web-first: no boot preflight redirect; show banner and allow retry on errors

  useEffect(() => {
    // Build injected auth script from native token + user profile
    const loadAuth = async () => {
      try {
        const token = await readToken();
        if (!token) { setAuthScript(""); return; }
        let userJson = "";
        try {
          const res = await api.get('/users/me');
          userJson = JSON.stringify({ _id: res.data._id, username: res.data.username, email: res.data.email, avatar: res.data.avatar });
        } catch {
          userJson = "{}";
        }
        const script = `try{ 
          try{
            if (!sessionStorage.getItem('teakonnClearedOnce')) {
              localStorage.clear();
              sessionStorage.setItem('teakonnClearedOnce','true');
            }
          }catch(e){}
          localStorage.setItem('token', ${JSON.stringify(token)});
          localStorage.setItem('user', ${typeof userJson === 'string' ? userJson : JSON.stringify(userJson)});
          
          localStorage.setItem('DEBUG_WEBVIEW','true');
        }catch(e){}`;
        setAuthScript(script);
      } catch { setAuthScript(""); }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        if (canGoBack) {
          webRef.current?.goBack();
          return true; // handled by WebView history
        }
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return true; // handled by navigation stack
        }
        // At root with no history: navigate to Discover instead of exiting app
        navigation?.navigate?.('Discover');
        return true;
      } catch {
        return false;
      }
    });
    return () => sub.remove();
  }, [canGoBack, navigation]);

  // Add a header Refresh button to hard refresh on demand
  useEffect(() => {
    try {
      navigation.setOptions({
        headerRight: () => (
          <Button title='Refresh' onPress={() => { try { webRef.current?.reload(); } catch {} }} />
        )
      });
    } catch {}
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {!!webError && (
        <View style={{ padding: 8, backgroundColor: '#fde68a' }}>
          <Text style={{ color: '#92400e', fontSize: 12 }}>Web error: {webError}. Use Refresh to retry.</Text>
        </View>
      )}
      <WebView
        ref={webRef}
        source={{ uri: webUrl }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        pullToRefreshEnabled={true}
        mixedContentMode="always"
        thirdPartyCookiesEnabled
        javaScriptCanOpenWindowsAutomatically
        allowsFullscreenVideo
        onHttpError={(e) => {
          console.warn('WebView HTTP error', e?.nativeEvent);
          setWebError(String(e?.nativeEvent?.statusCode || 'HTTP error'));
        }}
        onError={() => {
          setWebError('WebView failed to load');
        }}
        injectedJavaScriptBeforeContentLoaded={`(function(){
          try {
            ${authScript}
            try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', token: localStorage.getItem('token') ? 'set' : 'missing', api: (window.__API_URL || localStorage.getItem('API_URL') || 'unset'), href: location.href })); } catch(_e){}
            if (!window.__RN_NAV_DEPTH) window.__RN_NAV_DEPTH = 1;
            function post(){
              try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nav', depth: window.__RN_NAV_DEPTH, href: location.href })); } catch(e) {}
            }
            var _push = history.pushState;
            var _replace = history.replaceState;
            history.pushState = function(){ try{ window.__RN_NAV_DEPTH++; }catch(e){}; post(); return _push.apply(this, arguments); };
            history.replaceState = function(){ try{ /* depth unchanged */ }catch(e){}; post(); return _replace.apply(this, arguments); };
            window.addEventListener('popstate', function(){ try{ if(window.__RN_NAV_DEPTH>1) window.__RN_NAV_DEPTH--; }catch(e){}; post(); });
            setTimeout(post, 0);

            // Detect Vercel 404 (DEPLOYMENT_NOT_FOUND) and notify native
            function detectVercel404(){
              try {
                var txt = '';
                try { txt = (document.body && document.body.innerText) || ''; } catch(_e) {}
                if (/DEPLOYMENT_NOT_FOUND|404:\s*NOT_FOUND/i.test(txt)) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'web_error', reason: 'vercel_404' }));
                }
              } catch(_e) {}
            }
            document.addEventListener('DOMContentLoaded', function(){ setTimeout(detectVercel404, 50); });
            setTimeout(detectVercel404, 500);
          } catch(e) {}
        })();`}
        onLoadEnd={() => {
          try {
            webRef.current?.injectJavaScript(`(function(){ try { var t = (document.body && document.body.innerText) || ''; if (/DEPLOYMENT_NOT_FOUND|404:\\s*NOT_FOUND/i.test(t)) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'web_error', reason: 'vercel_404' })); } } catch(e){} })();`);
          } catch {}
        }}
        onMessage={(evt) => {
          try {
            const data = JSON.parse(evt.nativeEvent.data || '{}');
            if (data && data.type === 'nav') {
              setCanGoBack(!!(data.depth > 1));
              return;
            }
            if (data && data.type === 'web_error') {
              setWebError(String(data?.reason || 'web error'));
              return;
            }
          } catch {}
        }}
        onNavigationStateChange={(navState) => setCanGoBack(!!navState.canGoBack)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [bootChecked, setBootChecked] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Web'>('Web');

  useEffect(() => {
    const check = async () => {
      const token = await readToken();
      setInitialRoute('Web');
      setBootChecked(true);
    };
    check();
  }, []);

  if (!bootChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name='Login' component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name='Web'
          component={WebScreen}
          options={({ navigation }) => ({
            title: 'TeaKonn',
            headerRight: () => (
              <Button title='Native' onPress={() => navigation.navigate('Discover')} />
            )
          })}
        />
        <Stack.Screen
          name='Discover'
          component={DiscoverScreen}
          options={({ navigation }) => ({
            title: 'TeaKonn (Native)',
            headerRight: () => (
              <Button title='Website' onPress={() => navigation.navigate('Web')} />
            )
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  label: { color: '#94a3b8', marginTop: 8 },
  input: { backgroundColor: '#1f2937', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4 },
  status: { color: '#fbcfe8', marginTop: 12 },
  env: { color: '#93c5fd', marginTop: 8, fontSize: 12 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cardSubtitle: { color: '#67e8f9', fontSize: 12, marginBottom: 6 },
  cardText: { color: '#e5e7eb', fontSize: 13, marginBottom: 10 },
  joinBtn: { backgroundColor: '#06b6d4', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  joinTxt: { color: '#fff', fontWeight: '600' }
});
