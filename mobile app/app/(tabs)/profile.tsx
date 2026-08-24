import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'react-native';
import { BadgeCheck, CalendarDays, CreditCard, Hash, Home, LogOut, MapPin, Phone, User, Wallet } from 'lucide-react-native';
import { useClientSession } from '@/context/ClientSession';
import { formatMoney, Screen } from '@/components/ClientLayout';
import type { ReactNode } from 'react';

export default function ProfileScreen() {
  const { user, dashboard, signOut } = useClientSession();
  const client = dashboard?.client;
  const accountLabel = client ? (client.account_type === 'CARTE_CLASSIQUE' ? 'Carte Classique' : 'Compte Libre') : '—';

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('@/assets/images/Original_Logo_Cyan_with_White_Background.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.name}>{user?.full_name || 'Client'}</Text>
        <View style={styles.codeBadge}>
          <Hash size={12} color="#0a7fa9" />
          <Text style={styles.codeText}>{client?.code || user?.username}</Text>
        </View>
      </View>

      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>SOLDE</Text>
          <Text style={styles.balanceValue}>{formatMoney(dashboard?.balance || 0)}</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>VERSEMENTS</Text>
          <Text style={styles.balanceValue}>{formatMoney(dashboard?.totalDeposits || 0)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Informations du compte</Text>
      <View style={styles.card}>
        <Row icon={<User size={18} color="#0a7fa9" />} label="Nom complet" value={client?.full_name || user?.full_name || '—'} />
        <Row icon={<BadgeCheck size={18} color="#0a7fa9" />} label="Type de compte" value={accountLabel} />
        <Row icon={<CreditCard size={18} color="#0a7fa9" />} label="Statut" value={client?.status ? (client.status === 'ACTIVE' ? 'Actif' : client.status) : '—'} />
        <Row icon={<Wallet size={18} color="#0a7fa9" />} label="Montant fixe" value={formatMoney(client?.fixed_amount || 0)} />
        <Row icon={<Phone size={18} color="#0a7fa9" />} label="Téléphone" value={client?.phone || 'Non renseigné'} />
        <Row icon={<MapPin size={18} color="#0a7fa9" />} label="Adresse" value={client?.address || 'Non renseignée'} />
        <Row icon={<CalendarDays size={18} color="#0a7fa9" />} label="Inscrit le" value={client?.created_at ? formatDate(client.created_at) : '—'} />
      </View>

      <Pressable style={styles.signOut} onPress={signOut}>
        <LogOut size={18} color="#c0392b" />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>
      <Text style={styles.footer}>DigitPointage · Espace client</Text>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 90, height: 90, borderRadius: 20, marginBottom: 14 },
  name: { color: '#102536', fontSize: 22, fontWeight: '800' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eaf6fb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  codeText: { color: '#0a7fa9', fontSize: 13, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', backgroundColor: '#0b789c', borderRadius: 20, padding: 18, marginBottom: 24 },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  balanceLabel: { color: '#bfeaf4', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  balanceValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sectionTitle: { color: '#203245', fontSize: 16, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 4, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eaf6fb', alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { color: '#83919e', fontSize: 12, marginBottom: 4 },
  rowValue: { color: '#213344', fontSize: 15, fontWeight: '700' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fdecea', borderRadius: 16, paddingVertical: 16 },
  signOutText: { color: '#c0392b', fontSize: 16, fontWeight: '700' },
  footer: { color: '#9aa6b2', fontSize: 12, textAlign: 'center', marginTop: 20 },
});
