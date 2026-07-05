import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { SkinType, Product } from '../types';
import { ROUTINES, STEP_TYPE_LABELS } from '../data/routines';
import { CONCERNS, Concern } from '../data/concerns';
import { getProfile, saveProfile } from '../utils/profileStorage';
import { PRODUCTS } from '../data/products';
import { getShelf, getShelfProduct } from '../utils/shelfStorage';
import { getCachedProduct } from '../utils/productCache';
import { getAssignments, setAssignment, removeAssignment } from '../utils/routineAssignments';
import { CATEGORY_META } from '../components/ProductCard';
import ProductPickerModal from '../components/ProductPickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_KEY = 'skinmatch_setup_banner_dismissed';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const SKIN_TYPES: { type: SkinType; icon: string; label: string; description: string }[] = [
  { type: 'oily',        icon: '💧', label: 'Oily',        description: 'Shiny, enlarged pores, breakout-prone' },
  { type: 'dry',         icon: '🌵', label: 'Dry',         description: 'Tight, flaky, rough or dull' },
  { type: 'combination', icon: '☯️', label: 'Combination', description: 'Oily T-zone, dry cheeks' },
  { type: 'sensitive',   icon: '🌸', label: 'Sensitive',   description: 'Reactive, redness or stinging' },
  { type: 'normal',      icon: '✨', label: 'Normal',      description: 'Balanced, minimal concerns' },
];

const STEP_META: Record<string, { color: string; icon: string }> = {
  cleanse:    { color: '#D6EAF8', icon: '🫧' },
  tone:       { color: '#E8DAEF', icon: '💧' },
  treat:      { color: '#FDEBD0', icon: '✨' },
  moisturize: { color: '#D5F5E3', icon: '🧴' },
  protect:    { color: '#FDEBD0', icon: '☀️' },
};

export default function RoutineScreen() {
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);
  const [pickerStep, setPickerStep] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const navigation = useNavigation<Nav>();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, saved, ids, dismissed] = await Promise.all([
          getProfile(),
          getAssignments(),
          getShelf(),
          AsyncStorage.getItem(BANNER_KEY),
        ]);
        setSkinType(profile.skinType);
        setConcerns(profile.concerns);
        setAssignments(saved);

        const resolved = await Promise.all(
          ids.map(async (id) =>
            PRODUCTS.find((p) => p.id === id) ??
            getCachedProduct(id) ??
            (await getShelfProduct(id)),
          ),
        );
        setShelfProducts(resolved.filter(Boolean) as Product[]);
        setBannerDismissed(dismissed === 'true');
        setLoaded(true);
      }
      load();
    }, []),
  );

  async function handleDismissBanner() {
    await AsyncStorage.setItem(BANNER_KEY, 'true');
    setBannerDismissed(true);
  }

  async function handleSelectSkinType(type: SkinType) {
    setSkinType(type);
    await saveProfile({ skinType: type });
  }

  async function handleAssign(stepType: string, product: Product) {
    await setAssignment(stepType, product.id);
    setAssignments((prev) => ({ ...prev, [stepType]: product.id }));
    setPickerStep(null);
  }

  async function handleUnassign(stepType: string) {
    await removeAssignment(stepType);
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[stepType];
      return next;
    });
  }

  function resolveAssignedProduct(productId: string): Product | undefined {
    return (
      shelfProducts.find((p) => p.id === productId) ??
      PRODUCTS.find((p) => p.id === productId) ??
      getCachedProduct(productId)
    );
  }

  const routine = skinType ? ROUTINES[skinType] : null;
  const activeConcerns = CONCERNS.filter((c) => concerns.includes(c.id));
  const pickerStepLabel = pickerStep ? (STEP_TYPE_LABELS[pickerStep] ?? pickerStep) : '';

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandLogo}>✨ SkinMatch</Text>
            <Text style={styles.brandSub}>
              {skinType
                ? `${skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin${activeConcerns.length > 0 ? ` · ${activeConcerns.map(c => c.label).slice(0, 2).join(' · ')}${activeConcerns.length > 2 ? ` +${activeConcerns.length - 2}` : ''}` : ''}`
                : 'Your daily skincare guide'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileEdit')}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile summary */}
        {skinType && (
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <Text style={styles.profileIcon}>
                {SKIN_TYPES.find((s) => s.type === skinType)?.icon}
              </Text>
              <View>
                <Text style={styles.profileSkinType}>
                  {skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin
                </Text>
                {activeConcerns.length > 0 ? (
                  <View style={styles.concernChips}>
                    {activeConcerns.slice(0, 3).map((c) => (
                      <View key={c.id} style={styles.concernChip}>
                        <Text style={styles.concernChipText}>{c.icon} {c.label}</Text>
                      </View>
                    ))}
                    {activeConcerns.length > 3 && (
                      <View style={styles.concernChip}>
                        <Text style={styles.concernChipText}>+{activeConcerns.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => navigation.navigate('ProfileEdit')}>
                    <Text style={styles.addConcernsText}>+ Add skin concerns</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Setup banner — shown until dismissed or shelf has products */}
        {skinType && !bannerDismissed && shelfProducts.length === 0 && (
          <View style={styles.banner}>
            <View style={styles.bannerTop}>
              <Text style={styles.bannerTitle}>👋 Set up your routine</Text>
              <TouchableOpacity onPress={handleDismissBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bannerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerSteps}>
              <Text style={styles.bannerStep}>🔍  Search or scan your products in <Text style={styles.bannerTabName}>Ingredients</Text></Text>
              <Text style={styles.bannerStep}>🔖  Tap the bookmark to save them to My Shelf</Text>
              <Text style={styles.bannerStep}>✅  Come back here and assign them to each step</Text>
            </View>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => {
                handleDismissBanner();
                navigation.getParent()?.navigate('Ingredients' as never);
              }}
            >
              <Text style={styles.bannerBtnText}>Go to Ingredients →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Skin type picker */}
        {!skinType && (
          <>
            <Text style={styles.heading}>What's your skin type?</Text>
            <View style={styles.skinGrid}>
              {SKIN_TYPES.map(({ type, icon, label, description }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.skinCard, skinType === type && styles.skinCardActive]}
                  onPress={() => handleSelectSkinType(type)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.skinIcon}>{icon}</Text>
                  <Text style={[styles.skinLabel, skinType === type && styles.skinLabelActive]}>{label}</Text>
                  <Text style={styles.skinDesc} numberOfLines={2}>{description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Daily Routine */}
        {routine && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Your {skinType!.charAt(0).toUpperCase() + skinType!.slice(1)} Routine
            </Text>
            <View style={styles.steps}>
              {routine.map((step, i) => {
                const meta = STEP_META[step.stepType] ?? { color: '#F0F0F0', icon: '•' };
                const assignedId = assignments[step.stepType];
                const assignedProduct = assignedId ? resolveAssignedProduct(assignedId) : undefined;
                const catMeta = assignedProduct
                  ? (CATEGORY_META[assignedProduct.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' })
                  : null;

                return (
                  <View key={step.order} style={[styles.stepCard, { backgroundColor: meta.color }]}>
                    {/* Step header */}
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepIcon}>{meta.icon}</Text>
                      <Text style={styles.stepLabel}>{STEP_TYPE_LABELS[step.stepType]}</Text>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                    </View>

                    {/* Assigned product */}
                    {assignedProduct ? (
                      <TouchableOpacity
                        style={styles.assignedCard}
                        onPress={() => navigation.navigate('ProductDetail', { productId: assignedProduct.id })}
                        activeOpacity={0.8}
                      >
                        {assignedProduct.imageUrl ? (
                          <Image
                            source={{ uri: assignedProduct.imageUrl }}
                            style={[styles.assignedImg, { backgroundColor: catMeta!.bg }]}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={[styles.assignedImg, { backgroundColor: catMeta!.bg }]}>
                            <Text style={{ fontSize: 20 }}>{catMeta!.icon}</Text>
                          </View>
                        )}
                        <View style={styles.assignedInfo}>
                          <Text style={styles.assignedName} numberOfLines={1}>{assignedProduct.name}</Text>
                          <Text style={styles.assignedBrand}>{assignedProduct.brand}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.unassignBtn}
                          onPress={() => handleUnassign(step.stepType)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.unassignIcon}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <Text style={styles.stepSuggestion}>{step.productSuggestion}</Text>
                        <TouchableOpacity
                          style={styles.assignBtn}
                          onPress={() => setPickerStep(step.stepType)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.assignBtnIcon}>🔖</Text>
                          <Text style={styles.assignBtnText}>Assign from My Shelf</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Targeted Treatments */}
        {activeConcerns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Targeted Treatments</Text>
            <Text style={styles.sectionSubtitle}>
              Based on your {activeConcerns.length} selected concern{activeConcerns.length !== 1 ? 's' : ''}
            </Text>
            {activeConcerns.map((concern) => (
              <ConcernCard key={concern.id} concern={concern} />
            ))}
          </View>
        )}

        {!skinType && (
          <Text style={styles.hint}>Select your skin type above to see your routine.</Text>
        )}

      </ScrollView>

      {/* Product picker modal */}
      <ProductPickerModal
        visible={pickerStep !== null}
        stepType={pickerStep ?? ''}
        stepLabel={pickerStepLabel}
        onSelect={(product) => handleAssign(pickerStep!, product)}
        onClose={() => setPickerStep(null)}
      />
    </SafeAreaView>
  );
}

function ConcernCard({ concern }: { concern: Concern }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={styles.concernCard}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.concernCardHeader}>
        <View style={styles.concernCardLeft}>
          <Text style={styles.concernCardIcon}>{concern.icon}</Text>
          <View>
            <Text style={styles.concernCardLabel}>{concern.label}</Text>
            <Text style={styles.concernKeyIng}>Key ingredient: {concern.keyIngredient}</Text>
          </View>
        </View>
        <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && (
        <View style={styles.concernCardBody}>
          <View style={styles.tipRow}>
            <View style={[styles.tipBadge, { backgroundColor: '#FEF9E7' }]}>
              <Text style={styles.tipBadgeText}>☀️ AM</Text>
            </View>
            <Text style={styles.tipText}>{concern.amTip}</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={[styles.tipBadge, { backgroundColor: '#EAF0FB' }]}>
              <Text style={styles.tipBadgeText}>🌙 PM</Text>
            </View>
            <Text style={styles.tipText}>{concern.pmTip}</Text>
          </View>
          <View style={styles.avoidBox}>
            <Text style={styles.avoidLabel}>⚠️ Avoid</Text>
            <Text style={styles.avoidText}>{concern.avoid}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 20, paddingBottom: 40, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brandLogo: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  brandSub: { fontSize: 13, color: '#AAA', marginTop: 2 },
  editBtn: { backgroundColor: '#F0E6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#9B59B6' },

  profileCard: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  profileIcon: { fontSize: 32 },
  profileSkinType: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  concernChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  concernChip: { backgroundColor: '#F0E6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  concernChipText: { fontSize: 11, color: '#9B59B6', fontWeight: '600' },
  addConcernsText: { fontSize: 12, color: '#C8A2C8', fontWeight: '600' },

  heading: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: '#EBEBEB', gap: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  skinCardActive: { borderColor: '#C8A2C8', backgroundColor: '#FCF5FC' },
  skinIcon: { fontSize: 22 },
  skinLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  skinLabelActive: { color: '#9B59B6' },
  skinDesc: { fontSize: 11, color: '#AAA', lineHeight: 15 },

  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  sectionSubtitle: { fontSize: 13, color: '#AAA', marginTop: -6 },

  steps: { gap: 10 },
  stepCard: { borderRadius: 16, padding: 14, gap: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepIcon: { fontSize: 18 },
  stepLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase' },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#555' },
  stepSuggestion: { fontSize: 13, color: '#666', lineHeight: 19 },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  assignBtnIcon: { fontSize: 14 },
  assignBtnText: { fontSize: 12, fontWeight: '700', color: '#555' },

  assignedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, padding: 10,
  },
  assignedImg: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  assignedInfo: { flex: 1 },
  assignedName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  assignedBrand: { fontSize: 11, color: '#888', marginTop: 1 },
  unassignBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  unassignIcon: { fontSize: 11, color: '#666', fontWeight: '700' },

  concernCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  concernCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  concernCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  concernCardIcon: { fontSize: 28 },
  concernCardLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  concernKeyIng: { fontSize: 12, color: '#AAA', marginTop: 2 },
  expandChevron: { fontSize: 11, color: '#CCC' },
  concernCardBody: { marginTop: 14, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  tipBadgeText: { fontSize: 11, fontWeight: '700', color: '#555' },
  tipText: { fontSize: 13, color: '#555', lineHeight: 19, flex: 1 },
  avoidBox: {
    backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, gap: 4,
    borderLeftWidth: 3, borderLeftColor: '#E74C3C',
  },
  avoidLabel: { fontSize: 12, fontWeight: '700', color: '#C0392B' },
  avoidText: { fontSize: 12, color: '#888', lineHeight: 17 },

  hint: { textAlign: 'center', color: '#CCC', fontSize: 14 },

  banner: {
    backgroundColor: '#F0E6FF', borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 1.5, borderColor: '#DDD0EE',
  },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  bannerClose: { fontSize: 14, color: '#AAA', fontWeight: '700' },
  bannerSteps: { gap: 7 },
  bannerStep: { fontSize: 13, color: '#555', lineHeight: 19 },
  bannerTabName: { fontWeight: '700', color: '#9B59B6' },
  bannerBtn: {
    backgroundColor: '#C8A2C8', borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
  },
  bannerBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
