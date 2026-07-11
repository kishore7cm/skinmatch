import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCTS } from '../data/products';
import { getCachedProduct } from '../utils/productCache';
import { findDupes, dupeExplanation, matchLabel, LOW_CONFIDENCE_THRESHOLD } from '../utils/matching';
import { getIngredientFlag, countFlags } from '../utils/ingredientUtils';
import { CATEGORY_META, IoniconName } from '../components/ProductCard';
import ScoreRing from '../components/ScoreRing';
import EmptyState from '../components/EmptyState';
import { isOnShelf, toggleShelf } from '../utils/shelfStorage';
import { getPriceOverride, setPriceOverride as savePriceOverride, PriceOverride } from '../utils/priceOverrides';
import { getApprovedSubmissions } from '../api/submissions';
import { Product } from '../types';
import { AppStackParamList, ProductDetailScreenProps } from '../types/navigation';
import { colors, typography, fontFamilies, cardStyle, scoreColor } from '../theme';
import { useToast } from '../context/ToastContext';
import PressableScale from '../components/PressableScale';

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProductDetailScreen({ route, navigation }: ProductDetailScreenProps) {
  const [saved, setSaved] = useState(false);
  const [priceOverride, setPriceOverrideState] = useState<PriceOverride | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);
  const productId = route.params.productId;
  const baseProduct = PRODUCTS.find((p) => p.id === productId) ?? getCachedProduct(productId);
  const product = baseProduct && priceOverride
    ? { ...baseProduct, price: priceOverride.price, priceUpdatedAt: priceOverride.updatedAt }
    : baseProduct;
  const innerNav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      if (baseProduct) {
        isOnShelf(baseProduct.id).then(setSaved);
        getPriceOverride(baseProduct.id).then((o) => setPriceOverrideState(o ?? null));
      }
    }, [baseProduct?.id]),
  );

  // Approved user submissions are viable alternatives too, not just the
  // built-in catalog.
  useEffect(() => {
    getApprovedSubmissions().then(setApprovedProducts).catch(() => {});
  }, []);

  async function handleReportPrice(newPrice: number) {
    if (!baseProduct) return;
    const entry = await savePriceOverride(baseProduct.id, newPrice);
    setPriceOverrideState(entry);
    setReportModalOpen(false);
    showToast('Price updated');
  }

  useEffect(() => {
    if (!product) return;
    navigation.setOptions({
      title: product.name,
      headerRight: () => (
        <TouchableOpacity onPress={handleToggleShelf} style={{ marginRight: 4 }}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.sage} />
        </TouchableOpacity>
      ),
    });
  }, [product, saved]);

  async function handleToggleShelf() {
    if (!product) return;
    const added = await toggleShelf(product);
    setSaved(added);
    if (added) {
      showToast('Added to your list', {
        label: 'View Shelf',
        onPress: () => (innerNav.getParent()?.navigate as any)('Settings', { screen: 'Shelf', initial: false }),
      });
    } else {
      showToast('Removed from your shelf');
    }
  }

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Product not found.</Text>
      </View>
    );
  }

  const meta = CATEGORY_META[product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
  const { comedogenic, irritant } = countFlags(product.ingredients);
  const topDupes = findDupes(product, [...PRODUCTS, ...approvedProducts]);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: meta.bg }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="contain" />
        ) : (
          <Ionicons name={meta.icon} size={44} color={meta.color} />
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{product.name}</Text>
          <Text style={styles.heroBrand}>{product.brand}</Text>
          <View style={styles.heroMeta}>
            <View style={[styles.chip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.chipText, { color: meta.color }]}>{product.category}</Text>
            </View>
            {product.price > 0 && (
              <View style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={styles.chipText}>${product.price}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Save-to-shelf CTA */}
      <PressableScale
        style={[styles.shelfBtn, saved && styles.shelfBtnSaved]}
        onPress={handleToggleShelf}
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? colors.sage : colors.inkSoft} />
        <Text style={[styles.shelfBtnText, saved && styles.shelfBtnTextSaved]}>
          {saved ? 'Saved to My Shelf — tap to remove' : 'Add to My Shelf for conflict checking'}
        </Text>
      </PressableScale>

      {/* Price + report */}
      <View style={styles.priceCard}>
        <View style={styles.priceLeft}>
          <Text style={styles.priceNum}>{product.price > 0 ? `$${product.price}` : 'No price data'}</Text>
          <Text style={styles.priceCaption}>
            {product.priceUpdatedAt
              ? `Reported by you · ${formatUpdatedAt(product.priceUpdatedAt)}`
              : product.price > 0
                ? 'From our catalog · not independently verified'
                : "We don't have a price for this one yet"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setReportModalOpen(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="pricetag-outline" size={13} color={colors.sage} />
          <Text style={styles.reportBtnText}>{product.price > 0 ? 'Report a price' : 'Add a price'}</Text>
        </TouchableOpacity>
      </View>

      {/* Ingredient summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{product.ingredients.length}</Text>
          <Text style={styles.summaryLabel}>Ingredients</Text>
        </View>
        <View style={[styles.summaryCard, comedogenic > 0 && styles.summaryWarn]}>
          <Text style={[styles.summaryNum, comedogenic > 0 && styles.summaryWarnText]}>{comedogenic}</Text>
          <Text style={[styles.summaryLabel, comedogenic > 0 && styles.summaryWarnText]}>Comedogenic</Text>
        </View>
        <View style={[styles.summaryCard, irritant > 0 && styles.summaryWarnOrange]}>
          <Text style={[styles.summaryNum, irritant > 0 && styles.summaryOrangeText]}>{irritant}</Text>
          <Text style={[styles.summaryLabel, irritant > 0 && styles.summaryOrangeText]}>Irritants</Text>
        </View>
      </View>

      {/* Ingredient list */}
      <Text style={styles.sectionLabel}>Full Ingredient List</Text>
      <View style={styles.ingredientCard}>
        {product.ingredients.map((ing, i) => {
          const flag = getIngredientFlag(ing);
          return (
            <View key={i} style={[styles.ingredientRow, i < product.ingredients.length - 1 && styles.ingredientBorder]}>
              <View style={styles.ingLeft}>
                <Text style={styles.ingName}>{ing}</Text>
                {flag?.commonInteractions[0] && (
                  <Text style={styles.ingNote}>{flag.commonInteractions[0]}</Text>
                )}
              </View>
              <View style={styles.flags}>
                {flag?.isComedogenic && (
                  <View style={[styles.flag, styles.flagRed]}>
                    <Text style={styles.flagText}>Pore-clogging</Text>
                  </View>
                )}
                {flag?.isIrritant && (
                  <View style={[styles.flag, styles.flagOrange]}>
                    <Text style={styles.flagText}>Irritant</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Alternatives */}
      {topDupes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Alternatives</Text>
          <Text style={styles.sectionSubLabel}>
            {topDupes.length} alternative{topDupes.length !== 1 ? 's' : ''} · sorted by match score
          </Text>
          {!topDupes.some((d) => d.score >= LOW_CONFIDENCE_THRESHOLD) ? (
            <EmptyState
              icon="help-circle-outline"
              title="No strong matches found"
              description="Nothing in our current catalog shares enough ingredients with this product to call it a real alternative yet."
            />
          ) : (
          <View style={styles.dupesCard}>
            {topDupes.map((dupe, i) => {
              const dupeMeta = CATEGORY_META[dupe.product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
              const priceDiff = dupe.priceDiff;
              const priceLabel = (product.price === 0 || dupe.product.price === 0)
                ? 'No price data'
                : priceDiff === 0 ? 'Same price' : priceDiff > 0 ? `$${priceDiff} more` : `$${Math.abs(priceDiff)} less`;
              const isLowConfidence = dupe.score < LOW_CONFIDENCE_THRESHOLD;
              return (
                <TouchableOpacity
                  key={dupe.product.id}
                  style={[styles.dupeRow, i < topDupes.length - 1 && styles.dupeBorder]}
                  onPress={() => innerNav.push('ProductDetail', { productId: dupe.product.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dupeIcon, { backgroundColor: dupeMeta.bg }]}>
                    <Ionicons name={dupeMeta.icon} size={18} color={dupeMeta.color} />
                  </View>
                  <View style={styles.dupeInfo}>
                    <Text style={styles.dupeName}>{dupe.product.name}</Text>
                    <Text style={styles.dupeBrand}>{dupe.product.brand} · ${dupe.product.price}</Text>
                    <Text style={styles.dupeStat}>{dupeExplanation(dupe)} · {priceLabel}</Text>
                    {isLowConfidence && (
                      <Text style={styles.lowConfidenceNote}>
                        Limited overlap — mainly matches on price or category, not shared actives.
                      </Text>
                    )}
                  </View>
                  <View style={styles.scoreWrap}>
                    <ScoreRing score={dupe.score} size={44} />
                    <Text style={[styles.scoreLabel, { color: scoreColor(dupe.score) }]}>{matchLabel(dupe.score)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </>
      )}

    </ScrollView>

    <ReportPriceModal
      visible={reportModalOpen}
      currentPrice={product.price}
      onSubmit={handleReportPrice}
      onClose={() => setReportModalOpen(false)}
    />
    </>
  );
}

function ReportPriceModal({
  visible,
  currentPrice,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  currentPrice: number;
  onSubmit: (price: number) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (visible) setInput(currentPrice > 0 ? String(currentPrice) : '');
  }, [visible, currentPrice]);

  const parsed = parseFloat(input);
  const valid = !isNaN(parsed) && parsed > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>What's the current price?</Text>
          <Text style={modalStyles.subtitle}>
            This updates the price only on your device — it helps your own cost math stay accurate.
          </Text>
          <View style={modalStyles.inputRow}>
            <Text style={modalStyles.dollarSign}>$</Text>
            <TextInput
              style={modalStyles.input}
              value={input}
              onChangeText={setInput}
              placeholder="0.00"
              placeholderTextColor={colors.inkSoft}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PressableScale
              style={[modalStyles.saveBtn, !valid && modalStyles.saveBtnDisabled]}
              onPress={() => valid && onSubmit(Math.round(parsed * 100) / 100)}
              disabled={!valid}
            >
              <Text style={modalStyles.saveText}>Save</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: colors.inkSoft, fontSize: 16 },

  hero: { borderRadius: 20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center' },
  heroImage: { width: 72, height: 72, borderRadius: 12 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { ...typography.cardTitle, fontSize: 18, color: colors.ink, lineHeight: 24 },
  heroBrand: { fontSize: 13, color: colors.inkSoft },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft, textTransform: 'capitalize' },

  shelfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...cardStyle, padding: 14,
  },
  shelfBtnSaved: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  shelfBtnText: { fontSize: 13, color: colors.inkSoft, fontWeight: '600', flex: 1 },
  shelfBtnTextSaved: { color: colors.sage },

  priceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...cardStyle, padding: 14,
  },
  priceLeft: { flex: 1, gap: 2 },
  priceNum: { fontFamily: fontFamilies.serif, fontSize: 17, fontWeight: '700', color: colors.ink },
  priceCaption: { fontSize: 11, color: colors.inkSoft },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.sageSoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  reportBtnText: { fontSize: 11, fontWeight: '700', color: colors.sage },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, ...cardStyle, padding: 14,
    alignItems: 'center', gap: 2,
  },
  summaryWarn: { backgroundColor: colors.claySoft, borderColor: colors.claySoft },
  summaryWarnOrange: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft },
  summaryNum: { fontFamily: fontFamilies.serif, fontSize: 24, fontWeight: '700', color: colors.ink },
  summaryLabel: { fontSize: 11, color: colors.inkSoft, fontWeight: '600', textAlign: 'center' },
  summaryWarnText: { color: colors.clay },
  summaryOrangeText: { color: colors.gold },

  sectionLabel: { ...typography.eyebrow, color: colors.inkSoft },
  sectionSubLabel: { fontSize: 12, color: colors.inkSoft, marginTop: -6, marginBottom: 10 },

  ingredientCard: { ...cardStyle, padding: 0, overflow: 'hidden' },
  ingredientRow: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  ingLeft: { flex: 1 },
  ingName: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  ingNote: { fontSize: 11, color: colors.inkSoft, marginTop: 2, lineHeight: 15 },
  flags: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  flag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagRed: { backgroundColor: colors.claySoft },
  flagOrange: { backgroundColor: colors.goldSoft },
  flagText: { fontSize: 10, fontWeight: '700', color: colors.inkSoft },

  dupesCard: { ...cardStyle, padding: 0, overflow: 'hidden' },
  dupeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dupeBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dupeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dupeInfo: { flex: 1, gap: 2 },
  dupeName: { ...typography.cardTitle, color: colors.ink },
  dupeBrand: { fontSize: 12, color: colors.inkSoft },
  dupeStat: { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  lowConfidenceNote: { fontSize: 11, color: colors.gold, marginTop: 3, lineHeight: 15 },
  scoreWrap: { alignItems: 'center', gap: 2 },
  scoreLabel: { fontSize: 10, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheet: {
    width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 20,
    padding: 22, gap: 14,
  },
  title: { ...typography.cardTitle, fontSize: 17, color: colors.ink },
  subtitle: { fontSize: 12, color: colors.inkSoft, lineHeight: 17, marginTop: -8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.line, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  dollarSign: { fontSize: 20, fontWeight: '700', color: colors.inkSoft },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.ink, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  cancelText: { fontSize: 14, fontWeight: '700', color: colors.inkSoft },
  saveBtn: {
    flex: 1, backgroundColor: colors.sage, borderRadius: 14,
    alignItems: 'center', paddingVertical: 13,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 14, fontWeight: '700', color: colors.surface },
});
