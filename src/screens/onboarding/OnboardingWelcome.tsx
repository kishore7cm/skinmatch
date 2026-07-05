import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: '🧴', title: 'Personalized routine', body: 'Built around your skin type and concerns' },
  { icon: '🔬', title: 'Ingredient intelligence', body: 'Flag comedogenic and irritating ingredients instantly' },
  { icon: '🔄', title: 'Find dupes', body: 'Scored by ingredient overlap, not just category' },
  { icon: '⚠️', title: 'Conflict checker', body: 'Know which products shouldn\'t be used together' },
];

export default function OnboardingWelcome() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>✨</Text>
          </View>
          <Text style={styles.wordmark}>SkinMatch</Text>
          <Text style={styles.tagline}>Personalized skincare.{'\n'}Ingredient intelligence.</Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={styles.featureIconBox}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
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
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 20, paddingBottom: 12 },

  logoArea: { alignItems: 'center', gap: 12, paddingTop: 16 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: '#F0E6FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C8A2C8', shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  logoEmoji: { fontSize: 44 },
  wordmark: { fontSize: 36, fontWeight: '800', color: '#1A1A2E', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24 },

  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F5F0FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1, justifyContent: 'center' },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  featureBody: { fontSize: 13, color: '#AAA', marginTop: 2, lineHeight: 18 },

  footer: { gap: 10 },
  ctaBtn: {
    backgroundColor: '#C8A2C8',
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#C8A2C8', shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  disclaimer: { fontSize: 12, color: '#CCC', textAlign: 'center' },
});
