import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { SkinType } from '../types';
import { getProfile, saveProfile } from '../utils/profileStorage';
import { CONCERNS } from '../data/concerns';
import { ProfileEditScreenProps } from '../types/navigation';

const SKIN_TYPES: { type: SkinType; icon: string; label: string; description: string }[] = [
  { type: 'oily',        icon: '💧', label: 'Oily',        description: 'Shiny, pores, breakout-prone' },
  { type: 'dry',         icon: '🌵', label: 'Dry',         description: 'Tight, flaky, rough' },
  { type: 'combination', icon: '☯️', label: 'Combination', description: 'Oily T-zone, dry cheeks' },
  { type: 'sensitive',   icon: '🌸', label: 'Sensitive',   description: 'Reactive, redness, stinging' },
  { type: 'normal',      icon: '✨', label: 'Normal',      description: 'Balanced, few concerns' },
];

export default function ProfileEditScreen({ navigation }: ProfileEditScreenProps) {
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setSkinType(p.skinType);
      setConcerns(p.concerns);
    });
  }, []);

  function toggleConcern(id: string) {
    setConcerns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setSaving(true);
    await saveProfile({ skinType: skinType ?? undefined, concerns });
    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>Skin Type</Text>
        <View style={styles.skinGrid}>
          {SKIN_TYPES.map(({ type, icon, label, description }) => {
            const active = skinType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.skinCard, active && styles.skinCardActive]}
                onPress={() => setSkinType(type)}
                activeOpacity={0.75}
              >
                <Text style={styles.skinIcon}>{icon}</Text>
                <Text style={[styles.skinLabel, active && styles.skinLabelActive]}>{label}</Text>
                <Text style={styles.skinDesc} numberOfLines={2}>{description}</Text>
                {active && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Skin Concerns</Text>
        <Text style={styles.sectionSubLabel}>Select all that apply</Text>
        <View style={styles.concernGrid}>
          {CONCERNS.map((c) => {
            const active = concerns.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.concernCard, active && styles.concernCardActive]}
                onPress={() => toggleConcern(c.id)}
                activeOpacity={0.75}
              >
                <View style={styles.concernTop}>
                  <Text style={styles.concernIcon}>{c.icon}</Text>
                  {active && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                </View>
                <Text style={[styles.concernLabel, active && styles.concernLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 20, paddingBottom: 8 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  sectionSubLabel: { fontSize: 13, color: '#BBB', marginTop: -8, marginBottom: 14 },

  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: '#EBEBEB', gap: 3, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  skinCardActive: { borderColor: '#C8A2C8', backgroundColor: '#FCF5FC' },
  skinIcon: { fontSize: 22, marginBottom: 2 },
  skinLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  skinLabelActive: { color: '#9B59B6' },
  skinDesc: { fontSize: 11, color: '#AAA', lineHeight: 15 },

  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  concernCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 16, padding: 12,
    borderWidth: 2, borderColor: '#EBEBEB', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  concernCardActive: { borderColor: '#C8A2C8', backgroundColor: '#FCF5FC' },
  concernTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  concernIcon: { fontSize: 22 },
  concernLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 16 },
  concernLabelActive: { color: '#9B59B6' },

  checkmark: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C8A2C8', alignItems: 'center', justifyContent: 'center',
  },
  checkmarkText: { fontSize: 11, color: '#FFF', fontWeight: '800' },

  footer: { padding: 20, paddingTop: 12 },
  saveBtn: {
    backgroundColor: '#C8A2C8', borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#C8A2C8', shadowOpacity: 0.35, shadowRadius: 10, elevation: 3,
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
