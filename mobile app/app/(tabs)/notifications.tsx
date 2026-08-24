import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { useClientSession } from '@/context/ClientSession';
import { EmptyState, formatDate, formatMoney, LoadingState, Screen } from '@/components/ClientLayout';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import type { WithdrawalRequest } from '@/lib/api';

type NotifItem = {
  id: number;
  level: 'success' | 'info' | 'error';
  title: string;
  message: string;
  amount: number;
  date: string;
};

export default function NotificationsScreen() {
  const { dashboard, loading, error, refresh } = useClientSession();
  useEffect(() => { if (!dashboard) refresh(); }, [dashboard, refresh]);

  const notifications = useMemo<NotifItem[]>(() => {
    if (!dashboard) return [];
    const items = [...dashboard.pendingWithdrawals].sort((a, b) => b.id - a.id);
    return items.map((req: WithdrawalRequest) => mapRequestToNotif(req));
  }, [dashboard]);

  if (!dashboard) return loading ? <LoadingState /> : <Screen><EmptyState title="Espace indisponible" text={error || 'Actualisez la page pour réessayer.'} /></Screen>;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <AnimatedEntrance delay={0}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Suivi de vos demandes de retrait</Text>
        </View>
      </AnimatedEntrance>

      {notifications.length === 0 ? (
        <EmptyState title="Aucune notification" text="Vos notifications liées aux demandes de retrait apparaîtront ici." />
      ) : (
        <View style={styles.list}>
          {notifications.map((item, index) => {
            const color = item.level === 'success' ? '#168467' : item.level === 'error' ? '#c8462b' : '#b8860b';
            const Icon = item.level === 'success' ? CheckCircle2 : item.level === 'error' ? XCircle : Clock;
            return (
              <AnimatedEntrance key={item.id} delay={40} index={index}>
                <View style={styles.card}>
                  <View style={[styles.iconWrap, { backgroundColor: color + '1a' }]}>
                    <Icon size={20} color={color} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                    <View style={styles.meta}>
                      <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
                      <Text style={styles.dot}>·</Text>
                      <Text style={styles.date}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                </View>
              </AnimatedEntrance>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function mapRequestToNotif(req: WithdrawalRequest): NotifItem {
  const amount = Number(req.amount);
  const requested = new Date(req.requested_at.replace(' ', 'T'));
  const diffHours = Number.isNaN(requested.getTime()) ? 0 : (Date.now() - requested.getTime()) / 3600000;

  if (req.status === 'PAID') {
    return {
      id: req.id, level: 'success', amount, date: req.validated_at || req.requested_at,
      title: 'Retrait validé',
      message: `Votre demande de retrait a été validée et payée.`,
    };
  }
  if (req.status === 'REJECTED') {
    return {
      id: req.id, level: 'error', amount, date: req.validated_at || req.requested_at,
      title: 'Demande rejetée',
      message: `Votre demande de retrait a été rejetée. Contactez votre agence pour plus d'informations.`,
    };
  }
  const isReady = diffHours >= 24;
  return {
    id: req.id, level: isReady ? 'success' : 'info', amount, date: req.requested_at,
    title: isReady ? 'Retrait prêt à être validé' : 'Demande en attente',
    message: isReady
      ? 'Votre demande a atteint le délai de 24h et peut être validée.'
      : `Encore ${Math.max(1, Math.ceil(24 - diffHours))}h avant validation possible.`,
  };
}

const styles = StyleSheet.create({
  header: { marginBottom: 18 },
  title: { color: '#102536', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#82909e', fontSize: 13, marginTop: 4 },
  list: { gap: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  cardTitle: { color: '#203245', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardMessage: { color: '#6b7a88', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { color: '#0a7fa9', fontSize: 13, fontWeight: '800' },
  dot: { color: '#b6c0ca' },
  date: { color: '#9aa6b2', fontSize: 12 },
});
