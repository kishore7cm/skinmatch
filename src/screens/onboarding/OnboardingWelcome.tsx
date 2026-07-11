import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStackParamList } from '../../types/navigation';
import { IoniconName } from '../../components/ProductCard';
import { colors, typography, fontFamilies } from '../../theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const FEATURES: { icon: IoniconName; title: string; body: string }[] = [
  { icon: 'clipboard-outline', title: 'Personalized routine', body: 'Built around your skin type and concerns' },
  { icon: 'flask-outline', title: 'Ingredient intelligence', body: 'Flag comedogenic and irritating ingredients instantly' },
  { icon: 'swap-horizontal-outline', title: 'Find dupes', body: 'Scored by ingredient overlap, not just category' },
  { icon: 'warning-outline', title: 'Conflict checker', body: 'Know which products shouldn\'t be used together' },
];

export default function OnboardingWelcome() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="sparkles" size={40} color={colors.sage} />
          </View>
          <Text style={styles.wordmark}>SkinMatch</Text>
          <Text style={styles.tagline}>Personalized skincare.{'\n'}Ingredient intelligence.</Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={styles.featureIconBox}>
                <Ionicons name={f.icon} size={22} color={colors.sage} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('SkinType')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Get Started  →</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>Takes about 30 seconds. No account needed.</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 20, paddingBottom: 12 },

  logoArea: { alignItems: 'center', gap: 12, paddingTop: 16 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: colors.sageSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  wordmark: { fontFamily: fontFamilies.serif, fontSize: 36, fontWeight: '700', color: colors.ink, letterSpacing: -1 },
  tagline: { ...typography.body, fontSize: 16, color: colors.inkSoft, textAlign: 'center', lineHeight: 24 },

  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.sageSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { flex: 1, justifyContent: 'center' },
  featureTitle: { ...typography.cardTitle, color: colors.ink },
  featureBody: { fontSize: 13, color: colors.inkSoft, marginTop: 2, lineHeight: 18 },

  footer: { gap: 10 },
  ctaBtn: {
    backgroundColor: colors.sage,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: colors.surface, letterSpacing: 0.2 },
  disclaimer: { fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
});
