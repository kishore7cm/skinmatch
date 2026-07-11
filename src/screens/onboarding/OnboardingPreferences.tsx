import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveProfile } from '../../utils/profileStorage';
import { BudgetPreference, IntensityPreference } from '../../types';
import { useOnboardingComplete } from '../../context/OnboardingContext';
import { IoniconName } from '../../components/ProductCard';
import { colors, typography, cardStyle } from '../../theme';

const BUDGET_OPTIONS: { value: BudgetPreference; icon: IoniconName; label: string }[] = [
  { value: 'budget', icon: 'wallet-outline', label: 'Budget-friendly' },
  { value: 'balanced', icon: 'options-outline', label: 'No preference' },
  { value: 'premium', icon: 'diamond-outline', label: 'Premium OK' },
];

const INTENSITY_OPTIONS: { value: IntensityPreference; icon: IoniconName; label: string }[] = [
  { value: 'gentle', icon: 'leaf-outline', label: 'Gentle & gradual' },
  { value: 'balanced', icon: 'options-outline', label: 'No preference' },
  { value: 'active', icon: 'flash-outline', label: 'More active ingredients' },
];

export default function OnboardingPreferences() {
  const [budget, setBudget] = useState<BudgetPreference>('balanced');
  const [intensity, setIntensity] = useState<IntensityPreference>('balanced');
  const [clean, setClean] = useState(false);
  const onComplete = useOnboardingComplete();

  async function handleFinish() {
    await saveProfile({
      budgetPreference: budget,
      intensityPreference: intensity,
      cleanPreference: clean,
      onboarded: true,
    });
    onComplete();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.heading}>A couple more things</Text>
        <Text style={styles.subheading}>
          This fine-tunes which products we recommend for your routine.
        </Text>

        <Text style={styles.sectionLabel}>Budget</Text>
        <View style={styles.row}>
          {BUDGET_OPTIONS.map((opt) => {
            const active = budget === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setBudget(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon} size={18} color={active ? colors.sage : colors.ink} />
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Routine intensity</Text>
        <View style={styles.row}>
          {INTENSITY_OPTIONS.map((opt) => {
            const active = intensity === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setIntensity(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon} size={18} color={active ? colors.sage : colors.ink} />
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Prefer fewer flagged ingredients</Text>
            <Text style={styles.toggleDesc}>
              Nudges recommendations away from parabens, sulfates, and synthetic fragrance when a similar option exists.
            </Text>
          </View>
          <Switch
            value={clean}
            onValueChange={setClean}
            trackColor={{ false: colors.line, true: colors.sage }}
            thumbColor={colors.surface}
          />
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.btnText}>Finish Setup  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 8 },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { height: 4, width: 16, borderRadius: 2, backgroundColor: colors.line },
  dotDone: { backgroundColor: colors.sage },
  dotActive: { width: 32, backgroundColor: colors.sage },

  heading: { ...typography.screenTitle, fontSize: 28, color: colors.ink, marginBottom: 8 },
  subheading: { ...typography.body, fontSize: 14, color: colors.inkSoft, marginBottom: 24, lineHeight: 20 },

  sectionLabel: { ...typography.eyebrow, color: colors.inkSoft, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    ...cardStyle, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  pillActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  pillLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  pillLabelActive: { color: colors.sage },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...cardStyle, padding: 16,
  },
  toggleInfo: { flex: 1, gap: 4 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  toggleDesc: { fontSize: 12, color: colors.inkSoft, lineHeight: 16 },

  footer: { padding: 24, paddingTop: 12 },
  btn: {
    backgroundColor: colors.sage, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '800', color: colors.surface },
});
