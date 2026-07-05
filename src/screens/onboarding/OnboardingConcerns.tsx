import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { saveProfile } from '../../utils/profileStorage';
import { useOnboardingComplete } from '../../context/OnboardingContext';
import { CONCERNS } from '../../data/concerns';

export default function OnboardingConcerns() {
  const [selected, setSelected] = useState<string[]>([]);
  const onComplete = useOnboardingComplete();

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleFinish() {
    await saveProfile({ concerns: selected, onboarded: true });
    onComplete();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.heading}>Any skin concerns?</Text>
        <Text style={styles.subheading}>
          Select all that apply — your routine will include targeted treatment tips.
        </Text>

        <View style={styles.grid}>
          {CONCERNS.map((c) => {
            const active = selected.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => toggle(c.id)}
                activeOpacity={0.75}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardIcon}>{c.icon}</Text>
                  {active && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{c.label}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{c.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selected.length > 0 && (
          <Text style={styles.selectionCount}>
            {selected.length} concern{selected.length !== 1 ? 's' : ''} selected
          </Text>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {selected.length === 0 ? 'Skip for Now  →' : `Finish Setup  →`}
          </Text>
        </TouchableOpacity>
        {selected.length === 0 && (
          <Text style={styles.skipNote}>You can add concerns later from the Routine tab.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 24, paddingBottom: 8 },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { height: 4, width: 16, borderRadius: 2, backgroundColor: '#E5E5E5' },
  dotDone: { width: 16, backgroundColor: '#C8A2C8' },
  dotActive: { width: 32, backgroundColor: '#C8A2C8' },

  heading: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 14, color: '#AAA', marginBottom: 28, lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 18,
    padding: 14, borderWidth: 2, borderColor: '#EBEBEB', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardActive: { borderColor: '#C8A2C8', backgroundColor: '#FCF5FC' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIcon: { fontSize: 26, marginBottom: 6 },
  checkmark: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C8A2C8', alignItems: 'center', justifyContent: 'center',
  },
  checkmarkText: { fontSize: 11, color: '#FFF', fontWeight: '800' },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', lineHeight: 17 },
  cardLabelActive: { color: '#9B59B6' },
  cardDesc: { fontSize: 11, color: '#AAA', lineHeight: 16, marginTop: 2 },

  selectionCount: { fontSize: 13, color: '#C8A2C8', fontWeight: '700', textAlign: 'center', marginTop: 16 },

  footer: { padding: 24, paddingTop: 12, gap: 8 },
  btn: {
    backgroundColor: '#C8A2C8', borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#C8A2C8', shadowOpacity: 0.35, shadowRadius: 10, elevation: 3,
  },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  skipNote: { fontSize: 12, color: '#CCC', textAlign: 'center' },
});
