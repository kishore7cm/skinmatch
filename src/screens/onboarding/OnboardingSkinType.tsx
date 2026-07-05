import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../types/navigation';
import { SkinType } from '../../types';
import { saveProfile } from '../../utils/profileStorage';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'SkinType'>;

const SKIN_TYPES: { type: SkinType; icon: string; label: string; description: string }[] = [
  { type: 'oily',        icon: '💧', label: 'Oily',        description: 'Shiny, enlarged pores, prone to breakouts' },
  { type: 'dry',         icon: '🌵', label: 'Dry',         description: 'Tight, flaky, rough or dull feeling' },
  { type: 'combination', icon: '☯️', label: 'Combination', description: 'Oily T-zone, dry or normal cheeks' },
  { type: 'sensitive',   icon: '🌸', label: 'Sensitive',   description: 'Easily irritated, redness or stinging' },
  { type: 'normal',      icon: '✨', label: 'Normal',      description: 'Balanced, few concerns, even texture' },
];

export default function OnboardingSkinType() {
  const [selected, setSelected] = useState<SkinType | null>(null);
  const navigation = useNavigation<Nav>();

  async function handleContinue() {
    if (selected) await saveProfile({ skinType: selected });
    navigation.navigate('Concerns');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.heading}>What's your skin type?</Text>
        <Text style={styles.subheading}>This personalizes your routine and product picks.</Text>

        <View style={styles.grid}>
          {SKIN_TYPES.map(({ type, icon, label, description }) => {
            const active = selected === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setSelected(type)}
                activeOpacity={0.75}
              >
                <Text style={styles.cardIcon}>{icon}</Text>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{label}</Text>
                <Text style={[styles.cardDesc, active && styles.cardDescActive]} numberOfLines={2}>
                  {description}
                </Text>
                {active && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continue  →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Concerns')} style={styles.skipBtn}>
          <Text style={styles.skipText}>I'm not sure, skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 24, paddingBottom: 8 },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { height: 4, width: 16, borderRadius: 2, backgroundColor: '#E5E5E5' },
  dotActive: { width: 32, backgroundColor: '#C8A2C8' },

  heading: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 14, color: '#AAA', marginBottom: 28, lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 18,
    padding: 16, borderWidth: 2, borderColor: '#EBEBEB', gap: 4, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardActive: { borderColor: '#C8A2C8', backgroundColor: '#FCF5FC' },
  cardIcon: { fontSize: 28, marginBottom: 4 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  cardLabelActive: { color: '#9B59B6' },
  cardDesc: { fontSize: 12, color: '#AAA', lineHeight: 17 },
  cardDescActive: { color: '#BF8FBF' },
  checkmark: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#C8A2C8', alignItems: 'center', justifyContent: 'center',
  },
  checkmarkText: { fontSize: 12, color: '#FFF', fontWeight: '800' },

  footer: { padding: 24, paddingTop: 12, gap: 8 },
  btn: {
    backgroundColor: '#C8A2C8', borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#C8A2C8', shadowOpacity: 0.35, shadowRadius: 10, elevation: 3,
  },
  btnDisabled: { backgroundColor: '#E5E5E5', shadowOpacity: 0 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  skipBtn: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontSize: 13, color: '#CCC' },
});
