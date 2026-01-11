import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, BackHandler, View, Text, Button, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';

export default function App() {
  const webUrl = (process.env.EXPO_PUBLIC_WEB_URL as string) || (Constants.expoConfig?.extra as any)?.webUrl || 'http://localhost:5173';
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webError, setWebError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        if (canGoBack) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ height: 56, backgroundColor: '#0b0b0b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>TeaKonn</Text>
        <Button title='Refresh' onPress={() => { try { webRef.current?.reload(); } catch {} }} />
      </View>
      {!!webError && (
        <View style={{ padding: 8, backgroundColor: '#fde68a' }}>
          <Text style={{ color: '#92400e', fontSize: 12 }}>Web error: {webError}. Use Refresh to retry.</Text>
        </View>
      )}
      {isLoading && (
        <View style={{ position: 'absolute', top: 72, alignSelf: 'center', zIndex: 50, backgroundColor: '#00000060', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }} pointerEvents="none">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 8 }}>Loading…</Text>
          </View>
        </View>
      )}
      <WebView
        ref={webRef}
        source={{ uri: webUrl }}
        originWhitelist={["*"]}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        mixedContentMode="always"
        thirdPartyCookiesEnabled
        javaScriptCanOpenWindowsAutomatically
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        onLoadStart={() => { try { setIsLoading(true); } catch {} }}
        onHttpError={(e) => { try { setWebError(String(e?.nativeEvent?.statusCode || 'HTTP error')); } catch { setWebError('HTTP error'); } }}
        onError={() => { setWebError('WebView failed to load'); }}
        onLoadEnd={() => { try { setIsLoading(false); } catch {} }}
        onMessage={() => {}}
        onNavigationStateChange={(navState) => setCanGoBack(!!navState.canGoBack)}
        onLoadProgress={({ nativeEvent }) => {
          try {
            setIsLoading(nativeEvent.progress < 1);
            if (nativeEvent.progress === 1) setWebError("");
          } catch {}
        }}
      />
    </SafeAreaView>
  );
}
