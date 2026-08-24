import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, RefreshCw, Wallet } from 'lucide-react-native';
import { useClientSession } from '@/context/ClientSession';
import { EmptyState, formatMoney, LoadingState, Screen } from '@/components/ClientLayout';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import { CarreauxGrid, ReminderCard } from '@/components/CarreauxGrid';

export default function HomeScreen() {
  const { user, dashboard, loading, error, refresh } = useClientSession();
  useEffect(() => { if (user && !dashboard) refresh(); }, [user, dashboard, refresh]);

  if (!dashboard) return loading ? <LoadingState /> : <Screen><EmptyState title="Espace indisponible" text={error || 'Actualisez la page pour réessayer.'} /></Screen>;

  const firstName = dashboard.client.full_name.split(' ')[0];
  const pending = dashboard.pendingWithdrawals.filter((item) => item.status === 'PENDING').length;
  const isClassic = dashboard.client.account_type === 'CARTE_CLASSIQUE';
  const fixed = Number(dashboard.client.fixed_amount || 0);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <AnimatedEntrance delay={0}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>DIGITPOINTAGE</Text>
            <Text style={styles.greeting}>Bonjour, {firstName}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.refresh, pressed && styles.refreshPressed]} onPress={refresh}>
            <RefreshCw size={18} color="#2f5bff" />
          </Pressable>
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={60}>
        <LinearGradient colors={['#2f5bff', '#2447f5', '#1741d8']} style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
            <View style={styles.balanceIconWrap}>
              <Wallet size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.balance}>{formatMoney(dashboard.balance)}</Text>
          <View style={styles.balanceBottom}>
            <View style={styles.balanceChip}>
              <Text style={styles.account}>{isClassic ? 'Carte Classique' : 'Compte Libre'}</Text>
            </View>
            <Text style={styles.code}>{dashboard.client.code}</Text>
          </View>
        </LinearGradient>
      </AnimatedEntrance>

      <CarreauxGrid depositCount={dashboard.depositCount} fixedAmount={fixed} isClassic={isClassic} />

      <ReminderCard depositCount={dashboard.depositCount} fixedAmount={fixed} isClassic={isClassic} />

      <AnimatedEntrance delay={260}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <Text style={styles.sectionHint}>Votre compte</Text>
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={320}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: '#eaf5f0' }]}>
              <ArrowDownLeft size={18} color="#168467" />
            </View>
            <Text style={styles.statValue}>{formatMoney(dashboard.totalDeposits)}</Text>
            <Text style={styles.statLabel}>Total épargné</Text>
          </View>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: '#fff1e7' }]}>
              <ArrowUpRight size={18} color="#ce6b2d" />
            </View>
            <Text style={styles.statValue}>{formatMoney(dashboard.totalWithdrawals)}</Text>
            <Text style={styles.statLabel}>Total retiré</Text>
          </View>
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={380}>
        {pending > 0 ? (
          <View style={styles.alert}>
            <View style={styles.alertDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{pending} demande{pending > 1 ? 's' : ''} en attente</Text>
              <Text style={styles.alertText}>Votre demande sera traitée après le délai prévu.</Text>
            </View>
            <ChevronRight size={18} color="#5c7b87" />
          </View>
        ) : (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Tout est à jour</Text>
            <Text style={styles.successText}>Aucune demande de retrait en attente.</Text>
          </View>
        )}
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  kicker: { color: '#2f5bff', fontSize: 11, letterSpacing: 2, fontWeight: '800', marginBottom: 5 },
  greeting: { color: '#17233f', fontSize: 25, fontWeight: '800' },
  refresh: { backgroundColor: '#fff', borderRadius: 14, padding: 12, shadowColor: '#5265a8', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  refreshPressed: { transform: [{ scale: 0.92 }] },
  balanceCard: { borderRadius: 24, padding: 22, marginBottom: 14, shadowColor: '#2f5bff', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#dbe3ff', fontSize: 11, letterSpacing: 1.3, fontWeight: '700' },
  balanceIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  balance: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 16 },
  balanceBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 14 },
  balanceChip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  account: { color: '#eef2ff', fontSize: 12, fontWeight: '700' },
  code: { color: '#dbe3ff', fontSize: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { color: '#17233f', fontSize: 18, fontWeight: '800' },
  sectionHint: { color: '#82909e', fontSize: 13 },
  stats: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#5265a8', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { color: '#17233f', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#81909e', fontSize: 12 },
  alert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e9', borderRadius: 20, padding: 16, gap: 12 },
  alertDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#eda62d' },
  alertTitle: { color: '#74510e', fontWeight: '700', fontSize: 14 },
  alertText: { color: '#92733a', fontSize: 12, marginTop: 4 },
  success: { backgroundColor: '#eaf7f2', borderRadius: 20, padding: 16 },
  successTitle: { color: '#187257', fontWeight: '700' },
  successText: { color: '#478c75', fontSize: 13, marginTop: 4 },
});
