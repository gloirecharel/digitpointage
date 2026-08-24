import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircle2, Clock, Plus, XCircle } from 'lucide-react-native';
import { useClientSession } from '@/context/ClientSession';
import { requestWithdrawal } from '@/lib/api';
import { EmptyState, formatDate, formatMoney, LoadingState, Screen } from '@/components/ClientLayout';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';

export default function WithdrawalScreen() {
  const { dashboard, loading, error, refresh, token } = useClientSession();
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { if (!dashboard) refresh(); }, [dashboard, refresh]);

  const submit = async () => {
    if (!dashboard) return;
    setFormError(null);
    const value = Number(amount);
    if (!value || value <= 0) { setFormError('Indiquez un montant valide'); return; }
    if (!reason.trim()) { setFormError('Le motif est obligatoire'); return; }
    if (value > dashboard.balance) { setFormError('Solde insuffisant pour ce retrait'); return; }
    setSubmitting(true);
    try {
      await requestWithdrawal(token, value, reason.trim());
      setModal(false); setAmount(''); setReason('');
      await refresh();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Demande impossible');
    } finally { setSubmitting(false); }
  };

  if (!dashboard) return loading ? <LoadingState /> : <Screen><EmptyState title="Espace indisponible" text={error || 'Actualisez la page pour réessayer.'} /></Screen>;
  const requests = [...dashboard.pendingWithdrawals].sort((a, b) => b.id - a.id);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <AnimatedEntrance delay={0}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Demandes de retrait</Text>
            <Text style={styles.subtitle}>Suivez l'état de vos demandes</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]} onPress={() => setModal(true)}>
            <Plus size={18} color="#fff" />
          </Pressable>
        </View>
      </AnimatedEntrance>

      {requests.length === 0 ? (
        <EmptyState title="Aucune demande" text="Créez une demande de retrait via le bouton +." />
      ) : (
        <View style={styles.list}>
          {requests.map((item, index) => {
            const isPending = item.status === 'PENDING';
            const isPaid = item.status === 'PAID';
            const color = isPaid ? '#168467' : isPending ? '#b8860b' : '#c8462b';
            const Icon = isPaid ? CheckCircle2 : isPending ? Clock : XCircle;
            const label = isPaid ? 'Validée' : isPending ? 'En attente' : 'Rejetée';
            return (
              <AnimatedEntrance key={item.id} delay={40} index={index}>
                <View style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                      <Icon size={14} color={color} />
                      <Text style={[styles.badgeText, { color }]}>{label}</Text>
                    </View>
                    <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
                  </View>
                  <Text style={styles.reason}>{item.reason || 'Aucun motif'}</Text>
                  <Text style={styles.date}>Demandé le {formatDate(item.requested_at)}{isPaid && item.validated_at ? ` · Validé le ${formatDate(item.validated_at)}` : ''}</Text>
                </View>
              </AnimatedEntrance>
            );
          })}
        </View>
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Nouvelle demande</Text>
              <Pressable onPress={() => setModal(false)}><XCircle size={22} color="#83919e" /></Pressable>
            </View>
            <Text style={styles.label}>Montant (FCFA)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Ex : 50000" placeholderTextColor="#9aa5b1" keyboardType="numeric" />
            <Text style={styles.label}>Motif</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} value={reason} onChangeText={setReason} placeholder="Raison du retrait" placeholderTextColor="#9aa5b1" multiline />
            <Text style={styles.balanceInfo}>Solde disponible : {formatMoney(dashboard.balance)}</Text>
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Pressable style={({ pressed }) => [styles.submit, submitting && styles.submitDisabled, pressed && styles.submitPressed]} onPress={submit} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? 'Envoi…' : 'Envoyer la demande'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { color: '#102536', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#82909e', fontSize: 13, marginTop: 3 },
  addButton: { backgroundColor: '#0a7fa9', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addButtonPressed: { transform: [{ scale: 0.92 }] },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  amount: { fontSize: 18, fontWeight: '800', color: '#213344' },
  reason: { color: '#4a5a6a', fontSize: 14, marginBottom: 6 },
  date: { color: '#9aa6b2', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,30,45,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 32 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { color: '#102536', fontSize: 20, fontWeight: '800' },
  label: { color: '#3a4a5a', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#f4f7fa', borderWidth: 1, borderColor: '#d4dde6', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f1f2e', marginBottom: 14 },
  balanceInfo: { color: '#0a7fa9', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  formError: { color: '#c0392b', fontSize: 13, backgroundColor: '#fdecea', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 12 },
  submit: { backgroundColor: '#0a7fa9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitPressed: { transform: [{ scale: 0.98 }] },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
