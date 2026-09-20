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
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f5bff" colors={['#2f5bff']} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function LoadingState() {
  return <View style={styles.loading}><ActivityIndicator size="large" color="#2f5bff" /><Text style={styles.loadingText}>Chargement de votre espace…</Text></View>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7ff' },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 14, backgroundColor: '#f5f7ff' },
  loadingText: { color: '#52617a', fontSize: 15, fontWeight: '600' },
  empty: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e7f5', borderRadius: 20,
    padding: 28, alignItems: 'center', marginTop: 12,
    shadowColor: '#5265a8', shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  emptyTitle: { color: '#17233f', fontSize: 17, fontWeight: '800', marginBottom: 7 },
  emptyText: { color: '#71809a', fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
