import React, { useCallback, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  onLogout: () => void;
};

export default function Chats({ onLogout }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: hook up data refresh (messages, presence)
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>This is a starter screen. Hook up sockets and message list next.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to TeaKonn</Text>
          <Text style={styles.cardText}>Pull down to refresh. Tap log out to return to login.</Text>
        </View>
        <View style={{ height: spacing.lg }} />
        <View style={styles.btnRow}>
          <Button title="Log Out" onPress={onLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.lg, textAlign: 'center', maxWidth: 420 },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  cardText: { fontSize: 14, color: colors.muted },
  btnRow: { width: '100%', maxWidth: 560 },
});
