import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkinType, BudgetPreference, IntensityPreference } from '../types';
import { getProfile, saveProfile, resetProfile, UserProfile } from '../utils/profileStorage';
import { getAssignments, clearAllAssignments } from '../utils/routineAssignments';
import { CONCERNS } from '../data/concerns';
import { IoniconName } from '../components/ProductCard';
import { ProfileEditScreenProps } from '../types/navigation';
import { colors, typography, cardStyle } from '../theme';
import { useToast } from '../context/ToastContext';
import PressableScale from '../components/PressableScale';

const SKIN_TYPES: { type: SkinType; icon: IoniconName; label: string; description: string }[] = [
  { type: 'oily',        icon: 'water',            label: 'Oily',        description: 'Shiny, pores, breakout-prone' },
  { type: 'dry',         icon: 'snow-outline',     label: 'Dry',         description: 'Tight, flaky, rough' },
  { type: 'combination', icon: 'contrast-outline', label: 'Combination', description: 'Oily T-zone, dry cheeks' },
  { type: 'sensitive',   icon: 'flower-outline',   label: 'Sensitive',   description: 'Reactive, redness, stinging' },
  { type: 'normal',      icon: 'sparkles',         label: 'Normal',      description: 'Balanced, few concerns' },
];

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

export default function ProfileEditScreen({ navigation }: ProfileEditScreenProps) {
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [budgetPreference, setBudgetPreference] = useState<BudgetPreference>('balanced');
  const [intensityPreference, setIntensityPreference] = useState<IntensityPreference>('balanced');
  const [cleanPreference, setCleanPreference] = useState(false);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<UserProfile | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    getProfile().then((p) => {
      setSkinType(p.skinType);
      setConcerns(p.concerns);
      setBudgetPreference(p.budgetPreference);
      setIntensityPreference(p.intensityPreference);
      setCleanPreference(p.cleanPreference);
      setOriginal(p);
    });
  }, []);

  function toggleConcern(id: string) {
    setConcerns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function hasProfileChanged(): boolean {
    if (!original) return false;
    return (
      skinType !== original.skinType ||
      JSON.stringify([...concerns].sort()) !== JSON.stringify([...original.concerns].sort()) ||
      budgetPreference !== original.budgetPreference ||
      intensityPreference !== original.intensityPreference ||
      cleanPreference !== original.cleanPreference
    );
  }

  async function handleSave() {
    if (hasProfileChanged()) {
      const assignments = await getAssignments();
      if (Object.keys(assignments).length > 0) {
        Alert.alert(
          'Update routine picks?',
          'Your profile changed, so your currently assigned routine products will be cleared — the routine will re-recommend products that fit your new answers.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save & Clear', style: 'destructive', onPress: handleSaveConfirm },
          ],
        );
        return;
      }
    }
    await handleSaveConfirm();
  }

  async function handleSaveConfirm() {
    setSaving(true);
    const changed = hasProfileChanged();
    if (changed) {
      await clearAllAssignments();
    }
    await saveProfile({
      skinType: skinType ?? undefined,
      concerns,
      budgetPreference,
      intensityPreference,
      cleanPreference,
    });
    setSaving(false);
    navigation.goBack();
    showToast(changed ? 'Profile updated — routine picks cleared' : 'Profile updated');
  }

  function handleResetPress() {
    Alert.alert(
      'Reset profile?',
      'This clears your skin type, concerns, and preferences so you can go through onboarding again. Your shelf and routine picks stay untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleResetConfirm },
      ],
    );
  }

  async function handleResetConfirm() {
    await resetProfile();
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      Alert.alert('Profile reset', 'Close and reopen the app to go through onboarding again.');
    }
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
                <Ionicons name={icon} size={22} color={active ? colors.sage : colors.ink} style={styles.skinIcon} />
                <Text style={[styles.skinLabel, active && styles.skinLabelActive]}>{label}</Text>
                <Text style={styles.skinDesc} numberOfLines={2}>{description}</Text>
                {active && <View style={styles.checkmark}><Ionicons name="checkmark" size={12} color={colors.surface} /></View>}
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
                  <Ionicons name={c.icon} size={22} color={active ? colors.sage : colors.ink} />
                  {active && <View style={styles.checkmark}><Ionicons name="checkmark" size={12} color={colors.surface} /></View>}
                </View>
                <Text style={[styles.concernLabel, active && styles.concernLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Budget</Text>
        <View style={styles.pillRow}>
          {BUDGET_OPTIONS.map((opt) => {
            const active = budgetPreference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setBudgetPreference(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon} size={16} color={active ? colors.sage : colors.ink} />
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Routine Intensity</Text>
        <View style={styles.pillRow}>
          {INTENSITY_OPTIONS.map((opt) => {
            const active = intensityPreference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setIntensityPreference(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon} size={16} color={active ? colors.sage : colors.ink} />
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.toggleCard, { marginTop: 24 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Prefer fewer flagged ingredients</Text>
            <Text style={styles.toggleDesc}>
              Nudges recommendations away from parabens, sulfates, and synthetic fragrance when a similar option exists.
            </Text>
          </View>
          <Switch
            value={cleanPreference}
            onValueChange={setCleanPreference}
            trackColor={{ false: colors.line, true: colors.sage }}
            thumbColor={colors.surface}
          />
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetPress} activeOpacity={0.75}>
          <Ionicons name="refresh-outline" size={16} color={colors.clay} />
          <Text style={styles.resetBtnText}>Reset profile & start over</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 8 },

  sectionLabel: { ...typography.eyebrow, color: colors.inkSoft, marginBottom: 12 },
  sectionSubLabel: { fontSize: 13, color: colors.inkSoft, marginTop: -8, marginBottom: 14 },

  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: {
    width: '47%', ...cardStyle, padding: 14, gap: 3, position: 'relative',
  },
  skinCardActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  skinIcon: { marginBottom: 2 },
  skinLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.ink },
  skinLabelActive: { color: colors.sage },
  skinDesc: { fontSize: 11, color: colors.inkSoft, lineHeight: 15 },

  concernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  concernCard: {
    width: '47%', ...cardStyle, padding: 12, gap: 4,
  },
  concernCardActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  concernTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  concernLabel: { fontSize: 12, fontWeight: '700', color: colors.ink, lineHeight: 16 },
  concernLabelActive: { color: colors.sage },

  checkmark: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center',
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    ...cardStyle, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  pillActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  pillLabel: { ...typography.bodyStrong, color: colors.ink },
  pillLabelActive: { color: colors.sage },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...cardStyle, padding: 16,
  },
  toggleInfo: { flex: 1, gap: 4 },
  toggleTitle: { ...typography.bodyStrong, fontSize: 14, color: colors.ink },
  toggleDesc: { fontSize: 12, color: colors.inkSoft, lineHeight: 16 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 28, paddingVertical: 12,
  },
  resetBtnText: { fontSize: 13, fontWeight: '700', color: colors.clay },

  footer: { padding: 20, paddingTop: 12 },
  saveBtn: {
    backgroundColor: colors.sage, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
});
