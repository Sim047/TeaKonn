import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

type Props = {
  onLogout: () => void;
};

export default function Chats({ onLogout }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>
      <Text style={styles.subtitle}>This is a starter screen. Hook up sockets and message list next.</Text>
      <Button title="Log Out" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 24, textAlign: 'center' },
});
