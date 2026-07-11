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
import { getShelf, getShelfProduct, ensureOnShelfAsUsing, setShelfStatus } from '../utils/shelfStorage';
import { getCachedProduct } from '../utils/productCache';
import { getAssignments, setAssignment, removeAssignment, Assignment, AssignmentSource } from '../utils/routineAssignments';
import { checkConcernCoverage, checkSkinTypeCautions } from '../utils/routineFit';
import { routineMonthlyCost, RoutineCostLine, RoutineCostSummary } from '../utils/routineCost';
import { recommendForStep, RecommendationPreferences, scorePreferenceFit, categoryMedianPrice } from '../utils/routineRecommendations';
import { findDupes, dupeExplanation, matchLabel, LOW_CONFIDENCE_THRESHOLD } from '../utils/matching';
import ScoreRing from '../components/ScoreRing';
import { PER_USE_ML, estimatedUses } from '../data/usageDefaults';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, IoniconName } from '../components/ProductCard';
import ProductPickerModal from '../components/ProductPickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, fontFamilies, cardStyle, scoreColor, borders } from '../theme';
import { useToast } from '../context/ToastContext';
import PressableScale from '../components/PressableScale';

const BANNER_KEY = 'skinmatch_setup_banner_dismissed';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const SKIN_TYPES: { type: SkinType; icon: IoniconName; label: string; description: string }[] = [
  { type: 'oily',        icon: 'water',          label: 'Oily',        description: 'Shiny, enlarged pores, breakout-prone' },
  { type: 'dry',         icon: 'snow-outline',   label: 'Dry',         description: 'Tight, flaky, rough or dull' },
  { type: 'combination', icon: 'contrast-outline', label: 'Combination', description: 'Oily T-zone, dry cheeks' },
  { type: 'sensitive',   icon: 'flower-outline', label: 'Sensitive',   description: 'Reactive, redness or stinging' },
  { type: 'normal',      icon: 'sparkles',       label: 'Normal',      description: 'Balanced, minimal concerns' },
];

// Step type is now differentiated by icon + label only, not a per-category
// pastel background — one consistent card treatment across every step.
export const STEP_META: Record<string, { icon: IoniconName }> = {
  cleanse:    { icon: 'water-outline' },
  tone:       { icon: 'leaf-outline' },
  treat:      { icon: 'sparkles' },
  moisturize: { icon: 'cube-outline' },
  protect:    { icon: 'sunny-outline' },
};

export default function RoutineScreen() {
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<RecommendationPreferences>({});
  const [loaded, setLoaded] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);
  const [pickerStep, setPickerStep] = useState<string | null>(null);
  const [altStep, setAltStep] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();

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
        setPreferences({
          budgetPreference: profile.budgetPreference,
          intensityPreference: profile.intensityPreference,
          cleanPreference: profile.cleanPreference,
        });
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

  // A product genuinely plugged into the routine must be conflict-checked,
  // so assigning it always promotes it to "using" on the shelf — whether or
  // not it was ever separately bookmarked there.
  async function handleAssign(stepType: string, product: Product, source: AssignmentSource) {
    const previous = assignments[stepType];
    await setAssignment(stepType, product.id, source);
    await ensureOnShelfAsUsing(product);

    if (previous && previous.productId !== product.id) {
      await revertShelfStatusIfUnused(previous.productId, stepType);
    }

    setAssignments((prev) => ({ ...prev, [stepType]: { productId: product.id, source } }));
    setPickerStep(null);
    showToast(previous ? 'Swap applied' : 'Added to your routine');
  }

  // Mirrors handleAssign: a product no longer in any step shouldn't keep
  // being conflict-checked just because it once was.
  async function revertShelfStatusIfUnused(productId: string, excludeStepType: string) {
    const stillUsedElsewhere = Object.entries(assignments).some(
      ([stepType, a]) => stepType !== excludeStepType && a.productId === productId,
    );
    if (!stillUsedElsewhere) {
      await setShelfStatus(productId, 'considering');
    }
  }

  async function handleUnassign(stepType: string) {
    const removed = assignments[stepType];
    await removeAssignment(stepType);
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[stepType];
      return next;
    });
    if (removed) {
      await revertShelfStatusIfUnused(removed.productId, stepType);
    }
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

  const assignedList = Object.entries(assignments)
    .map(([stepType, assignment]) => ({ stepType, product: resolveAssignedProduct(assignment.productId) }))
    .filter((a): a is { stepType: string; product: Product } => !!a.product);

  const concernCoverage = activeConcerns.length > 0
    ? checkConcernCoverage(activeConcerns, assignedList.map((a) => a.product))
    : [];
  const cautions = skinType ? checkSkinTypeCautions(skinType, assignedList) : [];
  const showFitSection = assignedList.length > 0 && (concernCoverage.length > 0 || cautions.length > 0);

  const costSummary = routine
    ? routineMonthlyCost(
        routine.map((step) => ({
          stepType: step.stepType,
          product: assignments[step.stepType] ? resolveAssignedProduct(assignments[step.stepType].productId) : undefined,
          timesPerDay: step.timesPerDay,
        })),
      )
    : null;
  const showCostCard = !!costSummary && costSummary.breakdown.some((l) => l.product);

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.brandRow}>
              <Ionicons name="sparkles" size={18} color={colors.sage} />
              <Text style={styles.brandLogo}>SkinMatch</Text>
            </View>
            <Text style={styles.brandSub}>
              {skinType
                ? `${skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin${activeConcerns.length > 0 ? ` · ${activeConcerns.map(c => c.label).slice(0, 2).join(' · ')}${activeConcerns.length > 2 ? ` +${activeConcerns.length - 2}` : ''}` : ''}`
                : 'Your daily skincare guide'}
            </Text>
          </View>
        </View>

        {/* Profile summary */}
        {skinType && (
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <View style={styles.profileIconBox}>
                <Ionicons name={SKIN_TYPES.find((s) => s.type === skinType)?.icon ?? 'water'} size={26} color={colors.sage} />
              </View>
              <View style={styles.profileRight}>
                <Text style={styles.profileSkinType}>
                  {skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin
                </Text>
                {activeConcerns.length > 0 ? (
                  <View style={styles.concernChips}>
                    {activeConcerns.slice(0, 3).map((c) => (
                      <View key={c.id} style={styles.concernChip}>
                        <Ionicons name={c.icon} size={11} color={colors.sage} />
                        <Text style={styles.concernChipText}>{c.label}</Text>
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

        {/* Routine Cost */}
        {showCostCard && <RoutineCostCard summary={costSummary!} />}

        {/* Setup banner — shown until dismissed or shelf has products */}
        {skinType && !bannerDismissed && shelfProducts.length === 0 && (
          <View style={styles.banner}>
            <View style={styles.bannerTop}>
              <View style={styles.bannerTitleRow}>
                <Ionicons name="flag-outline" size={16} color={colors.ink} />
                <Text style={styles.bannerTitle}>Set up your routine</Text>
              </View>
              <TouchableOpacity onPress={handleDismissBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
            <View style={styles.bannerSteps}>
              <View style={styles.bannerStepRow}>
                <Ionicons name="search-outline" size={16} color={colors.sage} />
                <Text style={styles.bannerStep}>Search or scan your products in <Text style={styles.bannerTabName}>Products</Text></Text>
              </View>
              <View style={styles.bannerStepRow}>
                <Ionicons name="bookmark-outline" size={16} color={colors.sage} />
                <Text style={styles.bannerStep}>Tap the bookmark to save them to My Shelf</Text>
              </View>
              <View style={styles.bannerStepRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.sage} />
                <Text style={styles.bannerStep}>Come back here and assign them to each step</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => {
                handleDismissBanner();
                navigation.getParent()?.navigate('Ingredients' as never);
              }}
            >
              <Text style={styles.bannerBtnText}>Go to Products →</Text>
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
                  <Ionicons name={icon} size={22} color={skinType === type ? colors.sage : colors.ink} />
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
                const meta = STEP_META[step.stepType] ?? { icon: 'ellipse-outline' as IoniconName };
                const assignment = assignments[step.stepType];
                const assignedProduct = assignment ? resolveAssignedProduct(assignment.productId) : undefined;
                const isManual = assignedProduct && assignment?.source === 'manual';
                const catMeta = assignedProduct
                  ? (CATEGORY_META[assignedProduct.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.sageSoft, color: colors.sage })
                  : null;

                return (
                  <View key={step.order} style={[styles.stepCard, isManual && styles.stepCardManual]}>
                    {/* Step header */}
                    <View style={styles.stepHeader}>
                      <Ionicons name={meta.icon} size={18} color={colors.inkSoft} />
                      <Text style={styles.stepLabel}>{STEP_TYPE_LABELS[step.stepType]}</Text>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                    </View>

                    {/* Assigned product */}
                    {assignedProduct ? (
                      <>
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
                              <Ionicons name={catMeta!.icon} size={20} color={catMeta!.color} />
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
                            <Ionicons name="close" size={13} color={colors.inkSoft} />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {isManual ? (
                          <View style={styles.manualBadgeBlock}>
                            <View style={styles.manualBadge}>
                              <Ionicons name="hand-left-outline" size={12} color={colors.gold} />
                              <Text style={styles.manualBadgeText}>You picked this</Text>
                            </View>
                            <Text style={styles.manualBadgeDesc}>
                              Won't change automatically — you'll always be asked first.
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.autoNote}>Auto-assigned</Text>
                        )}

                        <TouchableOpacity
                          style={styles.altToggle}
                          onPress={() => setAltStep(altStep === step.stepType ? null : step.stepType)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="swap-horizontal-outline" size={13} color={colors.inkSoft} />
                          <Text style={styles.altToggleText}>
                            {altStep === step.stepType ? 'Hide alternatives' : "Don't love this? See alternatives"}
                          </Text>
                        </TouchableOpacity>
                        {altStep === step.stepType && (
                          <AlternativesPanel
                            source={assignedProduct}
                            preferences={preferences}
                            onPick={(product) => {
                              handleAssign(step.stepType, product, 'manual');
                              setAltStep(null);
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <RecommendedStep
                        stepType={step.stepType}
                        fallbackSuggestion={step.productSuggestion}
                        skinType={skinType!}
                        concerns={activeConcerns}
                        preferences={preferences}
                        onPick={(product) => handleAssign(step.stepType, product, 'auto')}
                        onBrowseShelf={() => setPickerStep(step.stepType)}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Routine Fit */}
        {showFitSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routine Fit</Text>
            <Text style={styles.sectionSubtitle}>How well your picks match your skin</Text>

            {concernCoverage.length > 0 && (
              <View style={styles.fitCard}>
                {concernCoverage.map(({ concern, covered, matchedProduct, matchedIngredient }, i) => (
                  <View
                    key={concern.id}
                    style={[styles.fitRow, i < concernCoverage.length - 1 && styles.fitRowBorder]}
                  >
                    <Ionicons
                      name={covered ? 'checkmark-circle' : 'alert-circle-outline'}
                      size={18}
                      color={covered ? colors.sage : colors.gold}
                    />
                    <View style={styles.fitRowText}>
                      <Text style={styles.fitRowTitle}>{concern.label}</Text>
                      <Text style={styles.fitRowDesc}>
                        {covered
                          ? `Covered by ${matchedProduct!.name} (${matchedIngredient})`
                          : `No assigned product has ${concern.keyIngredient} yet`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {cautions.length > 0 && (
              <View style={[styles.fitCard, concernCoverage.length > 0 && { marginTop: 10 }]}>
                {cautions.map((c, i) => (
                  <View
                    key={`${c.product.id}-${c.type}`}
                    style={[styles.fitRow, i < cautions.length - 1 && styles.fitRowBorder]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={c.type === 'comedogenic' ? colors.clay : colors.gold}
                    />
                    <View style={styles.fitRowText}>
                      <Text style={styles.fitRowTitle}>
                        {STEP_TYPE_LABELS[c.stepType] ?? c.stepType}: {c.product.name}
                      </Text>
                      <Text style={styles.fitRowDesc}>
                        Contains {c.ingredients.join(', ')} — {c.type === 'comedogenic' ? 'pore-clogging' : 'a common irritant'} for {skinType} skin
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
        onSelect={(product) => handleAssign(pickerStep!, product, 'manual')}
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
          <View style={styles.concernCardIconBox}>
            <Ionicons name={concern.icon} size={22} color={colors.sage} />
          </View>
          <View>
            <Text style={styles.concernCardLabel}>{concern.label}</Text>
            <Text style={styles.concernKeyIng}>Key ingredient: {concern.keyIngredient}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.inkSoft} />
      </View>
      {expanded && (
        <View style={styles.concernCardBody}>
          <View style={styles.tipRow}>
            <View style={[styles.tipBadge, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="sunny-outline" size={12} color={colors.inkSoft} />
              <Text style={styles.tipBadgeText}>AM</Text>
            </View>
            <Text style={styles.tipText}>{concern.amTip}</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={[styles.tipBadge, { backgroundColor: colors.sageSoft }]}>
              <Ionicons name="moon-outline" size={12} color={colors.inkSoft} />
              <Text style={styles.tipBadgeText}>PM</Text>
            </View>
            <Text style={styles.tipText}>{concern.pmTip}</Text>
          </View>
          <View style={styles.avoidBox}>
            <View style={styles.avoidLabelRow}>
              <Ionicons name="warning-outline" size={12} color={colors.clay} />
              <Text style={styles.avoidLabel}>Avoid</Text>
            </View>
            <Text style={styles.avoidText}>{concern.avoid}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RecommendedStep({
  stepType,
  fallbackSuggestion,
  skinType,
  concerns,
  preferences,
  onPick,
  onBrowseShelf,
}: {
  stepType: string;
  fallbackSuggestion: string;
  skinType: SkinType;
  concerns: Concern[];
  preferences: RecommendationPreferences;
  onPick: (product: Product) => void;
  onBrowseShelf: () => void;
}) {
  const recs = recommendForStep(stepType, skinType, concerns, preferences, 2);

  if (recs.length === 0) {
    return (
      <>
        <Text style={styles.stepSuggestion}>{fallbackSuggestion}</Text>
        <TouchableOpacity style={styles.assignBtn} onPress={onBrowseShelf} activeOpacity={0.75}>
          <Ionicons name="bookmark-outline" size={14} color={colors.inkSoft} />
          <Text style={styles.assignBtnText}>Assign from My Shelf</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {recs.map(({ product, reason, tags }) => {
        const meta = CATEGORY_META[product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
        return (
          <PressableScale
            key={product.id}
            style={styles.recRow}
            onPress={() => onPick(product)}
          >
            <View style={[styles.recIconBox, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={styles.recInfo}>
              <Text style={styles.recName} numberOfLines={1}>{product.name}</Text>
              {tags.length > 0 && (
                <View style={styles.recTagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.recTag}>
                      <Text style={styles.recTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.recReason} numberOfLines={2}>{reason}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={20} color={colors.sage} />
          </PressableScale>
        );
      })}
      <TouchableOpacity style={styles.assignBtn} onPress={onBrowseShelf} activeOpacity={0.75}>
        <Ionicons name="bookmark-outline" size={14} color={colors.inkSoft} />
        <Text style={styles.assignBtnText}>Or assign from My Shelf</Text>
      </TouchableOpacity>
    </View>
  );
}

function AlternativesPanel({
  source,
  preferences,
  onPick,
}: {
  source: Product;
  preferences: RecommendationPreferences;
  onPick: (product: Product) => void;
}) {
  const medianPrice = categoryMedianPrice(PRODUCTS.filter((p) => p.category === source.category));

  // Preferences nudge which alternatives surface first, but the displayed
  // match % always stays the real, untouched similarity score from
  // findDupes — never blended with the preference nudge.
  const dupes = findDupes(source, PRODUCTS)
    .filter((d) => d.score > 0)
    .map((dupe) => ({ dupe, ...scorePreferenceFit(dupe.product, preferences, medianPrice) }))
    .sort((a, b) => (b.dupe.score + b.bonus) - (a.dupe.score + a.bonus))
    .slice(0, 5);

  const hasStrongMatch = dupes.some(({ dupe }) => dupe.score >= LOW_CONFIDENCE_THRESHOLD);

  if (dupes.length === 0 || !hasStrongMatch) {
    return (
      <View style={styles.altPanel}>
        <Text style={styles.altEmpty}>
          {dupes.length === 0
            ? 'No close alternative found in the catalog yet for this product.'
            : "No strong alternatives found — nothing shares enough ingredients with this product yet."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.altPanel}>
      {dupes.map(({ dupe, tags }) => {
        const meta = CATEGORY_META[dupe.product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
        const priceLabel = (source.price === 0 || dupe.product.price === 0)
          ? 'No price data'
          : dupe.priceDiff === 0 ? 'Same price' : dupe.priceDiff > 0 ? `$${dupe.priceDiff} more` : `$${Math.abs(dupe.priceDiff)} less`;
        const isLowConfidence = dupe.score < LOW_CONFIDENCE_THRESHOLD;
        return (
          <PressableScale
            key={dupe.product.id}
            style={styles.recRow}
            onPress={() => onPick(dupe.product)}
          >
            <View style={[styles.recIconBox, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={styles.recInfo}>
              <Text style={styles.recName} numberOfLines={1}>{dupe.product.name}</Text>
              {tags.length > 0 && (
                <View style={styles.recTagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.recTag}>
                      <Text style={styles.recTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.recReason} numberOfLines={2}>
                {dupeExplanation(dupe)} · {priceLabel}
              </Text>
              {isLowConfidence && (
                <Text style={styles.lowConfidenceNote} numberOfLines={2}>
                  Limited overlap — mainly matches on price or category, not shared actives.
                </Text>
              )}
            </View>
            <View style={styles.smallScoreWrap}>
              <ScoreRing score={dupe.score} size={36} />
              <Text style={[styles.smallScoreLabel, { color: scoreColor(dupe.score) }]}>{matchLabel(dupe.score)}</Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

function currencySymbol(currency?: 'USD' | 'INR'): string {
  return currency === 'INR' ? '₹' : '$';
}

function RoutineCostCard({ summary }: { summary: RoutineCostSummary }) {
  const [expanded, setExpanded] = useState(false);
  const symbol = currencySymbol(summary.breakdown.find((l) => l.product?.currency)?.product?.currency);

  return (
    <TouchableOpacity style={styles.costCard} onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
      <View style={styles.costHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.costLabel}>Your routine</Text>
          <Text style={styles.costTotal}>{symbol}{summary.total.toFixed(2)}/month</Text>
          {summary.hasIncompleteData && (
            <Text style={styles.costIncomplete}>Some assigned products are missing price data</Text>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sage} />
      </View>

      {expanded && (
        <View style={styles.costBreakdown}>
          {summary.breakdown.map((line, i) => (
            <CostRow
              key={line.stepType}
              line={line}
              symbol={symbol}
              isLast={i === summary.breakdown.length - 1}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function CostRow({ line, symbol, isLast }: { line: RoutineCostLine; symbol: string; isLast: boolean }) {
  const [showInfo, setShowInfo] = useState(false);
  const stepLabel = STEP_TYPE_LABELS[line.stepType] ?? line.stepType;
  const canExplain = !!line.product && line.monthlyCost !== undefined;

  return (
    <View style={[styles.costRow, !isLast && styles.costRowBorder]}>
      <View style={styles.costRowTop}>
        <Text style={styles.costRowStep}>{stepLabel}</Text>
        {canExplain && (
          <TouchableOpacity
            onPress={() => setShowInfo((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={15} color={colors.inkSoft} />
          </TouchableOpacity>
        )}
      </View>

      {!line.product ? (
        <Text style={styles.costRowNotSet}>Not set</Text>
      ) : line.monthlyCost === undefined ? (
        <Text style={styles.costRowNoData} numberOfLines={1}>{line.product.name} — no price/size data</Text>
      ) : (
        <>
          <View style={styles.costRowMain}>
            <Text style={styles.costRowProduct} numberOfLines={1}>{line.product.name}</Text>
            <Text style={styles.costRowAmount}>{symbol}{line.monthlyCost.toFixed(2)}/mo</Text>
          </View>
          <Text style={styles.costRowSub}>{symbol}{line.costPerUse!.toFixed(2)}/use</Text>
        </>
      )}

      {showInfo && canExplain && (
        <View style={styles.costInfoBox}>
          <Text style={styles.costInfoText}>
            {symbol}{line.product!.price} ÷ {estimatedUses(line.product!)} estimated uses = {symbol}{line.costPerUse!.toFixed(2)}/use.
            {' '}Assumes ~{PER_USE_ML[line.product!.category]}ml per use for {line.product!.category}, applied {line.timesPerDay}×/day.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 40, gap: 20 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  // flex: 1 (not the RN View default of flexShrink: 0) so long skin-type +
  // concern combinations wrap onto a new line instead of overflowing the
  // screen edge.
  headerInfo: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandLogo: { ...typography.screenTitle, color: colors.ink },
  brandSub: { ...typography.body, color: colors.inkSoft, marginTop: 2, flexWrap: 'wrap' },

  profileCard: { ...cardStyle },
  profileLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  profileIconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.sageSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // flex: 1 so the concern chip row is actually bounded by the card's width
  // and its flexWrap can engage, instead of growing past the card edge.
  profileRight: { flex: 1 },
  profileSkinType: { ...typography.cardTitle, color: colors.ink, marginBottom: 6 },
  concernChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  concernChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.sageSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  concernChipText: { fontSize: 11, color: colors.sage, fontWeight: '600' },
  addConcernsText: { ...typography.bodyStrong, fontSize: 12, color: colors.sage },

  costCard: { ...cardStyle },
  costHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  costLabel: { ...typography.eyebrow, color: colors.inkSoft },
  costTotal: { fontFamily: fontFamilies.serif, fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 2 },
  costIncomplete: { fontSize: 11, color: colors.gold, marginTop: 3 },

  costBreakdown: { marginTop: 14, gap: 10 },
  costRow: { paddingTop: 10 },
  costRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 10 },
  costRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  costRowStep: { ...typography.eyebrow, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.5 },
  costRowNotSet: { ...typography.body, color: colors.inkSoft, fontStyle: 'italic', marginTop: 3 },
  costRowNoData: { ...typography.body, color: colors.inkSoft, marginTop: 3 },
  costRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  costRowProduct: { ...typography.bodyStrong, color: colors.ink, flex: 1, marginRight: 8 },
  costRowAmount: { ...typography.bodyStrong, color: colors.ink },
  costRowSub: { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  costInfoBox: { backgroundColor: colors.paper, borderRadius: 10, padding: 10, marginTop: 8 },
  costInfoText: { fontSize: 11, color: colors.inkSoft, lineHeight: 16 },

  heading: { ...typography.screenTitle, fontSize: 20, color: colors.ink },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: {
    width: '47%', ...cardStyle, padding: 14, gap: 3,
  },
  skinCardActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  skinLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.ink },
  skinLabelActive: { color: colors.sage },
  skinDesc: { fontSize: 11, color: colors.inkSoft, lineHeight: 15 },

  section: { gap: 12 },
  sectionTitle: { ...typography.screenTitle, fontSize: 20, color: colors.ink },
  sectionSubtitle: { ...typography.body, color: colors.inkSoft, marginTop: -6 },

  fitCard: { ...cardStyle, padding: 0, overflow: 'hidden' },
  fitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  fitRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  fitRowText: { flex: 1, gap: 2 },
  fitRowTitle: { ...typography.bodyStrong, color: colors.ink },
  fitRowDesc: { fontSize: 12, color: colors.inkSoft, lineHeight: 17 },

  steps: { gap: 12 },
  stepCard: { ...cardStyle, gap: 10 },
  stepCardManual: { borderWidth: borders.manualOverride, borderColor: colors.gold },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: { ...typography.eyebrow, flex: 1, color: colors.inkSoft },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: colors.sage },
  stepSuggestion: { ...typography.body, color: colors.inkSoft, lineHeight: 19 },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.paper, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.line,
  },
  assignBtnText: { ...typography.bodyStrong, fontSize: 12, color: colors.inkSoft },

  recRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderRadius: 12, padding: 10,
  },
  recIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  recInfo: { flex: 1, minWidth: 0, gap: 1 },
  recName: { ...typography.bodyStrong, color: colors.ink, flexShrink: 1 },
  recTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  recTag: { backgroundColor: colors.sageSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recTagText: { fontSize: 9, fontWeight: '700', color: colors.sage, textTransform: 'uppercase', letterSpacing: 0.3 },
  smallScoreWrap: { alignItems: 'center', gap: 2, flexShrink: 0 },
  smallScoreLabel: { fontSize: 9, fontWeight: '700' },
  recReason: { fontSize: 11, color: colors.inkSoft, lineHeight: 14 },
  lowConfidenceNote: { fontSize: 10, color: colors.gold, marginTop: 3, lineHeight: 13 },

  altToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 8, paddingVertical: 2,
  },
  altToggleText: { ...typography.bodyStrong, fontSize: 12, color: colors.inkSoft },
  altPanel: { gap: 8, marginTop: 10 },
  altEmpty: { fontSize: 12, color: colors.inkSoft, fontStyle: 'italic' },

  assignedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderRadius: 12, padding: 10,
  },
  assignedImg: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  assignedInfo: { flex: 1 },
  assignedName: { ...typography.bodyStrong, color: colors.ink },
  assignedBrand: { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  unassignBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },

  manualBadgeBlock: { gap: 4 },
  manualBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  manualBadgeText: { fontSize: 11, fontWeight: '700', color: colors.gold },
  manualBadgeDesc: { fontSize: 11, color: colors.inkSoft, lineHeight: 15 },
  autoNote: { fontSize: 11, color: colors.inkSoft },

  concernCard: { ...cardStyle },
  concernCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  concernCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  concernCardIconBox: {
    width: 44, height: 44, borderRadius: 13, backgroundColor: colors.sageSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  concernCardLabel: { ...typography.cardTitle, color: colors.ink },
  concernKeyIng: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  concernCardBody: { marginTop: 14, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
  },
  tipBadgeText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  tipText: { ...typography.body, color: colors.inkSoft, lineHeight: 19, flex: 1 },
  avoidBox: {
    backgroundColor: colors.claySoft, borderRadius: 10, padding: 12, gap: 4,
    borderLeftWidth: 3, borderLeftColor: colors.clay,
  },
  avoidLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avoidLabel: { fontSize: 12, fontWeight: '700', color: colors.clay },
  avoidText: { fontSize: 12, color: colors.inkSoft, lineHeight: 17 },

  hint: { textAlign: 'center', color: colors.inkSoft, fontSize: 14 },

  banner: {
    backgroundColor: colors.sageSoft, borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 1, borderColor: colors.line,
  },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { ...typography.cardTitle, fontWeight: '800', color: colors.ink },
  bannerSteps: { gap: 7 },
  bannerStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bannerStep: { flex: 1, ...typography.body, color: colors.inkSoft, lineHeight: 19 },
  bannerTabName: { fontWeight: '700', color: colors.sage },
  bannerBtn: {
    backgroundColor: colors.sage, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
  },
  bannerBtnText: { ...typography.bodyStrong, color: colors.surface },
});
