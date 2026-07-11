import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkinType, BudgetPreference, IntensityPreference, Product } from '../types';
import { getProfile, saveProfile, UserProfile } from '../utils/profileStorage';
import { getAssignments, setAssignment, removeAssignment } from '../utils/routineAssignments';
import { CONCERNS, Concern } from '../data/concerns';
import { ROUTINES } from '../data/routines';
import { PRODUCTS } from '../data/products';
import { getCachedProduct } from '../utils/productCache';
import { getShelfProduct } from '../utils/shelfStorage';
import { recommendForStep, RecommendationPreferences } from '../utils/routineRecommendations';
import { IoniconName } from '../components/ProductCard';
import { ProfileEditScreenProps } from '../types/navigation';
import { colors, typography, cardStyle } from '../theme';
import { useToast } from '../context/ToastContext';
import PressableScale from '../components/PressableScale';
import ProfileRegenerationReview, { RegenerationPlanStep, ManualChoice } from '../components/ProfileRegenerationReview';

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
  const [reviewVisible, setReviewVisible] = useState(false);
  const [plan, setPlan] = useState<RegenerationPlanStep[]>([]);
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

  async function resolveProduct(id: string): Promise<Product | null> {
    return (
      PRODUCTS.find((p) => p.id === id) ??
      getCachedProduct(id) ??
      (await getShelfProduct(id)) ??
      null
    );
  }

  // The step lineup varies by skin type (sensitive has no "treat" step, none
  // has "tone" today) — always read it from the new skin type's own routine
  // rather than assuming a fixed count.
  async function buildRegenerationPlan(): Promise<RegenerationPlanStep[]> {
    const [assignments, activeConcerns] = [
      await getAssignments(),
      CONCERNS.filter((c: Concern) => concerns.includes(c.id)),
    ];
    const preferences: RecommendationPreferences = { budgetPreference, intensityPreference, cleanPreference };
    const routine = ROUTINES[skinType!];

    return Promise.all(
      routine.map(async (step): Promise<RegenerationPlanStep> => {
        const currentAssignment = assignments[step.stepType] ?? null;
        const currentProduct = currentAssignment ? await resolveProduct(currentAssignment.productId) : null;
        const suggestion = recommendForStep(step.stepType, skinType!, activeConcerns, preferences, 1)[0] ?? null;
        return { stepType: step.stepType, currentAssignment, currentProduct, suggestion };
      }),
    );
  }

  async function handleSave() {
    if (hasProfileChanged()) {
      const assignments = await getAssignments();
      if (Object.keys(assignments).length > 0) {
        setPlan(await buildRegenerationPlan());
        setReviewVisible(true);
        return;
      }
    }
    await handleSaveConfirm();
  }

  async function handleReviewCancel() {
    setReviewVisible(false);
    setPlan([]);
  }

  async function handleReviewConfirm(choices: Record<string, ManualChoice>) {
    setReviewVisible(false);
    setSaving(true);

    // Drop assignments for step types that no longer exist in the new
    // routine (e.g. switching to "sensitive", which has no "treat" step).
    const currentAssignments = await getAssignments();
    const newStepTypes = new Set(plan.map((p) => p.stepType));
    await Promise.all(
      Object.keys(currentAssignments)
        .filter((stepType) => !newStepTypes.has(stepType))
        .map((stepType) => removeAssignment(stepType)),
    );

    await Promise.all(plan.map(async (step) => {
      if (!step.currentAssignment) return;

      if (step.currentAssignment.source === 'auto') {
        if (step.suggestion) {
          await setAssignment(step.stepType, step.suggestion.product.id, 'auto');
        } else {
          await removeAssignment(step.stepType);
        }
        return;
      }

      // Manual: default is to keep it untouched. Explicitly accepting the
      // fresh suggestion here is the same as accepting a recommendation
      // elsewhere in the app, so it becomes 'auto' going forward.
      const choice = choices[step.stepType] ?? 'keep';
      if (choice === 'suggested' && step.suggestion) {
        await setAssignment(step.stepType, step.suggestion.product.id, 'auto');
      }
    }));

    await saveProfile({
      skinType: skinType ?? undefined,
      concerns,
      budgetPreference,
      intensityPreference,
      cleanPreference,
    });
    setPlan([]);
    setSaving(false);
    navigation.goBack();
    showToast('Profile updated — routine refreshed');
  }

  async function handleSaveConfirm() {
    setSaving(true);
    await saveProfile({
      skinType: skinType ?? undefined,
      concerns,
      budgetPreference,
      intensityPreference,
      cleanPreference,
    });
    setSaving(false);
    navigation.goBack();
    showToast('Profile updated');
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

      <ProfileRegenerationReview
        visible={reviewVisible}
        plan={plan}
        onCancel={handleReviewCancel}
        onConfirm={handleReviewConfirm}
      />
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

  footer: { padding: 20, paddingTop: 12 },
  saveBtn: {
    backgroundColor: colors.sage, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnLoading: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.surface },
});
