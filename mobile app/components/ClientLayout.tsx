import { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export function formatMoney(value: number | string) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

export function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f5bff" /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function LoadingState() {
  return <View style={styles.loading}><ActivityIndicator size="large" color="#0a7fa9" /><Text style={styles.loadingText}>Chargement de votre espace…</Text></View>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7ff' },
  content: { padding: 20, paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 14, backgroundColor: '#f5f7ff' },
  loadingText: { color: '#5a6b7b', fontSize: 15 },
  empty: { backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center', marginTop: 12 },
  emptyTitle: { color: '#203245', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#718091', fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
