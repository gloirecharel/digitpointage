import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useClientSession } from '@/context/ClientSession';
import { EmptyState, formatDate, formatMoney, LoadingState, Screen } from '@/components/ClientLayout';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import type { Transaction } from '@/lib/api';

export default function HistoryScreen() {
  const { dashboard, loading, error, refresh } = useClientSession();
  useEffect(() => { if (!dashboard) refresh(); }, [dashboard, refresh]);

  if (!dashboard) return loading ? <LoadingState /> : <Screen><EmptyState title="Espace indisponible" text={error || 'Actualisez la page pour réessayer.'} /></Screen>;

  const items: Transaction[] = [...dashboard.withdrawals].sort((a, b) => b.id - a.id);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <AnimatedEntrance delay={0}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.subtitle}>Vos opérations de retrait et dépôt</Text>
      </AnimatedEntrance>

      {items.length === 0 ? (
        <EmptyState title="Aucune opération" text="Vos dépôts et retraits apparaîtront ici." />
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const isDeposit = item.type === 'DEPOT';
            return (
              <AnimatedEntrance key={item.id} delay={40} index={index}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: isDeposit ? '#e6f5f0' : '#fdeee9' }]}>
                    {isDeposit ? <ArrowDownLeft size={18} color="#168467" /> : <ArrowUpRight size={18} color="#c8462b" />}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{isDeposit ? 'Dépôt' : 'Retrait'}</Text>
                    <Text style={styles.rowSub}>{formatDate(item.created_at)}{item.reason ? ` · ${item.reason}` : ''}</Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: isDeposit ? '#168467' : '#c8462b' }]}>
                    {isDeposit ? '+' : '−'}{formatMoney(item.amount)}
                  </Text>
                </View>
              </AnimatedEntrance>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: '#17233f', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#82909e', fontSize: 14, marginBottom: 18 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { color: '#213344', fontSize: 15, fontWeight: '700' },
  rowSub: { color: '#83919e', fontSize: 12, marginTop: 3 },
  rowAmount: { fontSize: 15, fontWeight: '800' },
});
