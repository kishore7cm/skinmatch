import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../types/navigation';
import { SkinType } from '../../types';
import { saveProfile } from '../../utils/profileStorage';
import { IoniconName } from '../../components/ProductCard';
import { typography, useTheme, ColorTokens } from '../../theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'SkinType'>;

const SKIN_TYPES: { type: SkinType; icon: IoniconName; label: string; description: string }[] = [
  { type: 'oily',        icon: 'water',            label: 'Oily',        description: 'Shiny, enlarged pores, prone to breakouts' },
  { type: 'dry',         icon: 'snow-outline',     label: 'Dry',         description: 'Tight, flaky, rough or dull feeling' },
  { type: 'combination', icon: 'contrast-outline', label: 'Combination', description: 'Oily T-zone, dry or normal cheeks' },
  { type: 'sensitive',   icon: 'flower-outline',   label: 'Sensitive',   description: 'Easily irritated, redness or stinging' },
  { type: 'normal',      icon: 'sparkles',         label: 'Normal',      description: 'Balanced, few concerns, even texture' },
];

export default function OnboardingSkinType() {
  const [selected, setSelected] = useState<SkinType | null>(null);
  const navigation = useNavigation<Nav>();
  const { colors, cardStyle } = useTheme();
  const styles = useMemo(() => createStyles(colors, cardStyle), [colors, cardStyle]);

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
                <Ionicons name={icon} size={26} color={active ? colors.sage : colors.ink} style={styles.cardIcon} />
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{label}</Text>
                <Text style={[styles.cardDesc, active && styles.cardDescActive]} numberOfLines={2}>
                  {description}
                </Text>
                {active && <View style={styles.checkmark}><Ionicons name="checkmark" size={13} color={colors.surface} /></View>}
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

const createStyles = (colors: ColorTokens, cardStyle: object) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 8 },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { height: 4, width: 16, borderRadius: 2, backgroundColor: colors.line },
  dotActive: { width: 32, backgroundColor: colors.sage },

  heading: { ...typography.screenTitle, fontSize: 28, color: colors.ink, marginBottom: 8 },
  subheading: { ...typography.body, fontSize: 14, color: colors.inkSoft, marginBottom: 28, lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', ...cardStyle, padding: 16, gap: 4, position: 'relative',
  },
  cardActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  cardIcon: { marginBottom: 4 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cardLabelActive: { color: colors.sage },
  cardDesc: { fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  cardDescActive: { color: colors.sage },
  checkmark: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
  },

  footer: { padding: 24, paddingTop: 12, gap: 8 },
  btn: {
    backgroundColor: colors.sage, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.line },
  btnText: { fontSize: 17, fontWeight: '800', color: colors.surface },
  skipBtn: { alignItems: 'center', paddingVertical: 6 },
  skipText: { fontSize: 13, color: colors.inkSoft },
});
