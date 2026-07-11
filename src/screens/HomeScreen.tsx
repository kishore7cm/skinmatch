import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../types/navigation';
import { SkinType, Product } from '../types';
import { ROUTINES } from '../data/routines';
import { CONCERNS } from '../data/concerns';
import { getProfile } from '../utils/profileStorage';
import { PRODUCTS } from '../data/products';
import { getShelf, getShelfProduct } from '../utils/shelfStorage';
import { getCachedProduct } from '../utils/productCache';
import { getAssignments, Assignment } from '../utils/routineAssignments';
import { checkConcernCoverage, checkSkinTypeCautions } from '../utils/routineFit';
import { routineMonthlyCost } from '../utils/routineCost';
import { checkConflicts } from '../utils/conflictChecker';
import { colors, typography, fontFamilies, cardStyle } from '../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function HomeScreen() {
  const [loaded, setLoaded] = useState(false);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);
  const navigation = useNavigation<Nav>();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, saved, ids] = await Promise.all([
          getProfile(),
          getAssignments(),
          getShelf(),
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
        setLoaded(true);
      }
      load();
    }, []),
  );

  function resolveAssignedProduct(productId: string): Product | undefined {
    return (
      shelfProducts.find((p) => p.id === productId) ??
      PRODUCTS.find((p) => p.id === productId) ??
      getCachedProduct(productId)
    );
  }

  function goToTab(tab: string) {
    navigation.getParent()?.navigate(tab as never);
  }

  if (!loaded) return null;

  if (!skinType) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="water-outline" size={48} color={colors.line} />
          <Text style={styles.emptyTitle}>Let's get you set up</Text>
          <Text style={styles.emptyDesc}>
            Pick your skin type in the Routine tab and your dashboard will fill in here.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => goToTab('Routine')}>
            <Text style={styles.emptyBtnText}>Go to Routine →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const routine = ROUTINES[skinType];
  const activeConcerns = CONCERNS.filter((c) => concerns.includes(c.id));

  const assignedList = Object.entries(assignments)
    .map(([stepType, assignment]) => ({ stepType, product: resolveAssignedProduct(assignment.productId) }))
    .filter((a): a is { stepType: string; product: Product } => !!a.product);

  const concernCoverage = activeConcerns.length > 0
    ? checkConcernCoverage(activeConcerns, assignedList.map((a) => a.product))
    : [];
  const coveredCount = concernCoverage.filter((c) => c.covered).length;
  const cautions = checkSkinTypeCautions(skinType, assignedList);

  const costSummary = routineMonthlyCost(
    routine.map((step) => ({
      stepType: step.stepType,
      product: assignments[step.stepType] ? resolveAssignedProduct(assignments[step.stepType].productId) : undefined,
      timesPerDay: step.timesPerDay,
    })),
  );
  const symbol = costSummary.breakdown.find((l) => l.product?.currency)?.product?.currency === 'INR' ? '₹' : '$';
  const hasCost = costSummary.breakdown.some((l) => l.product);

  const conflicts = shelfProducts.length >= 2 ? checkConflicts(shelfProducts) : [];

  // Activity-based, not account-age-based: a long-dormant account with zero
  // shelf items and zero assignments is still "first-week" for this purpose.
  const isFirstWeek = shelfProducts.length === 0 && assignedList.length === 0;

  const firstWeekPrompts: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string; tab: string }[] = [
    {
      icon: 'camera-outline',
      title: 'Scan your first product',
      desc: 'Add a product to check for conflicts and find dupes.',
      tab: 'Ingredients',
    },
    {
      icon: 'clipboard-outline',
      title: 'View your routine',
      desc: 'See what a routine for your skin type looks like.',
      tab: 'Routine',
    },
    {
      icon: 'swap-horizontal-outline',
      title: 'Find your first dupe',
      desc: 'Compare a product against cheaper alternatives.',
      tab: 'Dupes',
    },
  ];

  const lockedTiles: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { icon: 'wallet-outline', label: 'Monthly cost' },
    { icon: 'checkmark-circle-outline', label: 'Concerns covered' },
    { icon: 'warning-outline', label: 'Routine cautions' },
    { icon: 'bookmark-outline', label: 'Shelf conflicts' },
  ];

  const nextStep: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string; tab: string } =
    shelfProducts.length === 0
      ? {
          icon: 'camera-outline',
          title: 'Scan your first product',
          desc: 'Add a product to check for conflicts and find dupes.',
          tab: 'Ingredients',
        }
      : assignedList.length === 0
      ? {
          icon: 'clipboard-outline',
          title: 'Build your routine',
          desc: 'Assign your shelf products to each step.',
          tab: 'Routine',
        }
      : assignedList.length < routine.length
      ? {
          icon: 'checkmark-circle-outline',
          title: 'Finish your routine',
          desc: `${assignedList.length}/${routine.length} steps assigned`,
          tab: 'Routine',
        }
      : {
          icon: 'swap-horizontal-outline',
          title: 'Find a cheaper dupe',
          desc: 'Compare your products against thousands of alternatives.',
          tab: 'Dupes',
        };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Ionicons name="sparkles" size={20} color={colors.sage} />
            <Text style={styles.brandLogo}>SkinMatch</Text>
          </View>
          <Text style={styles.brandSub}>
            {skinType.charAt(0).toUpperCase() + skinType.slice(1)} skin · your skincare at a glance
          </Text>
        </View>

        {isFirstWeek ? (
          <>
            <View style={styles.welcomeCard}>
              <Ionicons name="sparkles" size={26} color={colors.sage} />
              <Text style={styles.welcomeTitle}>Welcome to SkinMatch</Text>
              <Text style={styles.welcomeDesc}>
                A few quick steps and your dashboard fills in with real numbers.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Get started</Text>
              <View style={{ gap: 10 }}>
                {firstWeekPrompts.map((p) => (
                  <TouchableOpacity
                    key={p.title}
                    style={styles.nextStepCard}
                    onPress={() => goToTab(p.tab)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.nextStepIconBox}>
                      <Ionicons name={p.icon} size={22} color={colors.sage} />
                    </View>
                    <View style={styles.nextStepText}>
                      <Text style={styles.nextStepTitle}>{p.title}</Text>
                      <Text style={styles.nextStepDesc}>{p.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your stats</Text>
              <View style={styles.grid}>
                {lockedTiles.map((t) => (
                  <View key={t.label} style={[styles.tile, styles.tileLocked]}>
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={9} color={colors.inkSoft} />
                    </View>
                    <View style={[styles.tileIconBox, { backgroundColor: colors.line }]}>
                      <Ionicons name={t.icon} size={20} color={colors.inkSoft} />
                    </View>
                    <Text style={styles.tileValue}>—</Text>
                    <Text style={styles.tileLabel}>{t.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.lockedHint}>Unlocks automatically as you scan products and build your routine.</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.tile} onPress={() => goToTab('Routine')} activeOpacity={0.85}>
                <View style={[styles.tileIconBox, { backgroundColor: colors.sageSoft }]}>
                  <Ionicons name="wallet-outline" size={20} color={colors.sage} />
                </View>
                <Text style={styles.tileValue}>
                  {hasCost ? `${symbol}${costSummary.total.toFixed(2)}` : '—'}
                </Text>
                <Text style={styles.tileLabel}>{hasCost ? 'per month' : 'No products assigned yet'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tile} onPress={() => goToTab('Routine')} activeOpacity={0.85}>
                <View style={[styles.tileIconBox, { backgroundColor: colors.sageSoft }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.sage} />
                </View>
                <Text style={styles.tileValue}>
                  {activeConcerns.length > 0 ? `${coveredCount}/${activeConcerns.length}` : '—'}
                </Text>
                <Text style={styles.tileLabel}>
                  {activeConcerns.length > 0 ? 'concerns covered' : 'No concerns set'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tile} onPress={() => goToTab('Routine')} activeOpacity={0.85}>
                <View style={[styles.tileIconBox, { backgroundColor: cautions.length > 0 ? colors.claySoft : colors.sageSoft }]}>
                  <Ionicons name="warning-outline" size={20} color={cautions.length > 0 ? colors.clay : colors.inkSoft} />
                </View>
                <Text style={styles.tileValue}>{cautions.length}</Text>
                <Text style={styles.tileLabel}>routine caution{cautions.length !== 1 ? 's' : ''}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tile} onPress={() => goToTab('My Shelf')} activeOpacity={0.85}>
                <View style={[styles.tileIconBox, { backgroundColor: conflicts.length > 0 ? colors.claySoft : colors.sageSoft }]}>
                  <Ionicons
                    name={shelfProducts.length < 2 ? 'bookmark-outline' : conflicts.length > 0 ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                    size={20}
                    color={conflicts.length > 0 ? colors.clay : colors.sage}
                  />
                </View>
                <Text style={styles.tileValue}>
                  {shelfProducts.length < 2 ? '—' : conflicts.length}
                </Text>
                <Text style={styles.tileLabel}>
                  {shelfProducts.length < 2 ? 'Add 2+ shelf items' : `shelf conflict${conflicts.length !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Up next</Text>
              <TouchableOpacity style={styles.nextStepCard} onPress={() => goToTab(nextStep.tab)} activeOpacity={0.85}>
                <View style={styles.nextStepIconBox}>
                  <Ionicons name={nextStep.icon} size={22} color={colors.sage} />
                </View>
                <View style={styles.nextStepText}>
                  <Text style={styles.nextStepTitle}>{nextStep.title}</Text>
                  <Text style={styles.nextStepDesc}>{nextStep.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 40, gap: 20 },

  header: { gap: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { ...typography.screenTitle, color: colors.ink },
  brandSub: { ...typography.body, color: colors.inkSoft },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', ...cardStyle, gap: 6 },
  tileLocked: { opacity: 0.5 },
  lockBadge: { position: 'absolute', top: 12, right: 12 },
  tileIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tileValue: { fontFamily: fontFamilies.serif, fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: 2 },
  tileLabel: { ...typography.body, fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
  lockedHint: { ...typography.body, fontSize: 12, color: colors.inkSoft, textAlign: 'center' },

  welcomeCard: { ...cardStyle, alignItems: 'center', gap: 6, paddingVertical: 24 },
  welcomeTitle: { ...typography.cardTitle, fontSize: 18, color: colors.ink },
  welcomeDesc: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 19, maxWidth: 260 },

  section: { gap: 12 },
  sectionTitle: { ...typography.eyebrow, color: colors.inkSoft },
  nextStepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...cardStyle,
  },
  nextStepIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.sageSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nextStepText: { flex: 1, gap: 2 },
  nextStepTitle: { ...typography.cardTitle, color: colors.ink },
  nextStepDesc: { ...typography.body, fontSize: 12, color: colors.inkSoft },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyDesc: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, backgroundColor: colors.sage, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyBtnText: { ...typography.bodyStrong, fontSize: 14, color: colors.surface },
});
