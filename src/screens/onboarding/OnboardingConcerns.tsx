import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../types/navigation';
import { saveProfile } from '../../utils/profileStorage';
import { CONCERNS } from '../../data/concerns';
import { typography, useTheme, ColorTokens } from '../../theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Concerns'>;

export default function OnboardingConcerns() {
  const [selected, setSelected] = useState<string[]>([]);
  const navigation = useNavigation<Nav>();
  const { colors, cardStyle } = useTheme();
  const styles = useMemo(() => createStyles(colors, cardStyle), [colors, cardStyle]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleContinue() {
    await saveProfile({ concerns: selected });
    navigation.navigate('Preferences');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
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
                  <Ionicons name={c.icon} size={24} color={active ? colors.sage : colors.ink} style={styles.cardIcon} />
                  {active && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={12} color={colors.surface} />
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
        <TouchableOpacity style={styles.btn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.btnText}>Continue  →</Text>
        </TouchableOpacity>
        {selected.length === 0 && (
          <Text style={styles.skipNote}>You can add concerns later from the Routine tab.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTokens, cardStyle: object) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 8 },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { height: 4, width: 16, borderRadius: 2, backgroundColor: colors.line },
  dotDone: { width: 16, backgroundColor: colors.sage },
  dotActive: { width: 32, backgroundColor: colors.sage },

  heading: { ...typography.screenTitle, fontSize: 28, color: colors.ink, marginBottom: 8 },
  subheading: { ...typography.body, fontSize: 14, color: colors.inkSoft, marginBottom: 28, lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', ...cardStyle, padding: 14, gap: 4,
  },
  cardActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIcon: { marginBottom: 6 },
  checkmark: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, lineHeight: 17 },
  cardLabelActive: { color: colors.sage },
  cardDesc: { fontSize: 11, color: colors.inkSoft, lineHeight: 16, marginTop: 2 },

  selectionCount: { fontSize: 13, color: colors.sage, fontWeight: '700', textAlign: 'center', marginTop: 16 },

  footer: { padding: 24, paddingTop: 12, gap: 8 },
  btn: {
    backgroundColor: colors.sage, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '800', color: colors.surface },
  skipNote: { fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
});
