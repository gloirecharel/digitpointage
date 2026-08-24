import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, interpolateColor } from 'react-native-reanimated';
import { Bell, CalendarClock, CheckCircle2, Grid3x3, Sparkles } from 'lucide-react-native';
import { formatMoney } from '@/components/ClientLayout';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';

const TOTAL_CELLS = 31;

export function CarreauxGrid({
  depositCount,
  fixedAmount,
  isClassic,
}: {
  depositCount: number;
  fixedAmount: number;
  isClassic: boolean;
}) {
  const filled = Math.min(depositCount, TOTAL_CELLS);
  const progress = Math.round((filled / TOTAL_CELLS) * 100);

  return (
    <AnimatedEntrance delay={120}>
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <View style={styles.iconWrap}>
              <Grid3x3 size={18} color="#2f5bff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Carreaux de versement</Text>
              <Text style={styles.subtitle}>{filled} / {TOTAL_CELLS} versements effectués</Text>
            </View>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>

        <ProgressBar progress={progress} />

        <View style={styles.grid}>
          {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
            <Carreau key={i} index={i} filled={i < filled} total={filled} />
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2f5bff' }]} />
            <Text style={styles.legendText}>Versé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e3e8f5' }]} />
            <Text style={styles.legendText}>À verser</Text>
          </View>
        </View>
      </View>
    </AnimatedEntrance>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(200, withTiming(progress, { duration: 800, easing: Easing.out(Easing.exp) }));
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, style]} />
    </View>
  );
}

function Carreau({ index, filled, total }: { index: number; filled: boolean; total: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 22;
    scale.value = withDelay(delay, withTiming(1, { duration: 280, easing: Easing.out(Easing.back(1.5)) }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 240 }));
  }, [index]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.cell, filled ? styles.cellFilled : styles.cellEmpty, style]}>
      {filled && index === total - 1 && <Sparkles size={12} color="#fff" style={styles.cellSpark} />}
    </Animated.View>
  );
}

export function ReminderCard({
  depositCount,
  fixedAmount,
  isClassic,
}: {
  depositCount: number;
  fixedAmount: number;
  isClassic: boolean;
}) {
  const remaining = Math.max(0, TOTAL_CELLS - depositCount);
  const isComplete = remaining === 0;
  const today = new Date();
  const dayLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AnimatedEntrance delay={200}>
      <View style={[styles.reminder, isComplete ? styles.reminderDone : styles.reminderPending]}>
        <View style={[styles.reminderIcon, isComplete ? styles.reminderIconDone : styles.reminderIconPending]}>
          {isComplete ? <CheckCircle2 size={22} color="#168467" /> : <Bell size={20} color="#b8860b" />}
        </View>
        <View style={styles.reminderBody}>
          <Text style={[styles.reminderTitle, isComplete ? styles.reminderTitleDone : styles.reminderTitlePending]}>
            {isComplete ? 'Objectif atteint !' : 'Rappel de versement'}
          </Text>
          <Text style={[styles.reminderText, isComplete ? { color: '#478c75' } : { color: '#92733a' }]}>
            {isComplete
              ? 'Vous avez versé les 31 carreaux. Bravo pour votre régularité.'
              : `Il vous reste ${remaining} versement${remaining > 1 ? 's' : ''} à effectuer pour compléter votre carte.`}
          </Text>
          <View style={styles.reminderMeta}>
            <CalendarClock size={13} color={isComplete ? '#478c75' : '#92733a'} />
            <Text style={[styles.reminderMetaText, isComplete ? { color: '#478c75' } : { color: '#92733a' }]}>
              {isClassic ? `${formatMoney(fixedAmount)} / versement` : 'Versement libre'} · {dayLabel}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedEntrance>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#5265a8',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#17233f', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#83919e', fontSize: 12, marginTop: 2 },
  progressBadge: { backgroundColor: '#eef2ff', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 6 },
  progressText: { color: '#2f5bff', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#eef2ff', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2f5bff', borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cellFilled: { backgroundColor: '#2f5bff', shadowColor: '#2f5bff', shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cellEmpty: { backgroundColor: '#f0f3fa', borderWidth: 1, borderColor: '#e0e6f2' },
  cellSpark: { position: 'absolute' },
  legend: { flexDirection: 'row', gap: 18, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: '#83919e', fontSize: 12 },

  reminder: { flexDirection: 'row', borderRadius: 22, padding: 18, gap: 14, marginBottom: 14 },
  reminderPending: { backgroundColor: '#fff8e9' },
  reminderDone: { backgroundColor: '#eaf7f2' },
  reminderIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reminderIconPending: { backgroundColor: '#fcefc4' },
  reminderIconDone: { backgroundColor: '#d4f0e5' },
  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  reminderTitlePending: { color: '#74510e' },
  reminderTitleDone: { color: '#15704f' },
  reminderText: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  reminderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reminderMetaText: { fontSize: 12, fontWeight: '600' },
});
