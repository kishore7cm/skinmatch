import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PRODUCTS } from '../data/products';
import { getCachedProduct } from '../utils/productCache';
import { findDupes, dupeExplanation } from '../utils/matching';
import { getIngredientFlag, countFlags } from '../utils/ingredientUtils';
import { CATEGORY_META } from '../components/ProductCard';
import { isOnShelf, toggleShelf } from '../utils/shelfStorage';
import { AppStackParamList, ProductDetailScreenProps } from '../types/navigation';

export default function ProductDetailScreen({ route, navigation }: ProductDetailScreenProps) {
  const [saved, setSaved] = useState(false);
  const productId = route.params.productId;
  const product = PRODUCTS.find((p) => p.id === productId) ?? getCachedProduct(productId);
  const innerNav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  useFocusEffect(
    useCallback(() => {
      if (product) isOnShelf(product.id).then(setSaved);
    }, [product?.id]),
  );

  useEffect(() => {
    if (!product) return;
    navigation.setOptions({
      title: product.name,
      headerRight: () => (
        <TouchableOpacity onPress={handleToggleShelf} style={{ marginRight: 4 }}>
          <Text style={{ fontSize: 24 }}>{saved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [product, saved]);

  async function handleToggleShelf() {
    if (!product) return;
    const added = await toggleShelf(product);
    setSaved(added);
  }

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Product not found.</Text>
      </View>
    );
  }

  const meta = CATEGORY_META[product.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
  const { comedogenic, irritant } = countFlags(product.ingredients);
  const topDupes = findDupes(product, PRODUCTS).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: meta.bg }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="contain" />
        ) : (
          <Text style={styles.heroIcon}>{meta.icon}</Text>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{product.name}</Text>
          <Text style={styles.heroBrand}>{product.brand}</Text>
          <View style={styles.heroMeta}>
            <View style={[styles.chip, { backgroundColor: '#FFF' }]}>
              <Text style={[styles.chipText, { color: meta.color }]}>{product.category}</Text>
            </View>
            {product.price > 0 && (
              <View style={[styles.chip, { backgroundColor: '#FFF' }]}>
                <Text style={styles.chipText}>${product.price}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Save-to-shelf CTA */}
      <TouchableOpacity
        style={[styles.shelfBtn, saved && styles.shelfBtnSaved]}
        onPress={handleToggleShelf}
        activeOpacity={0.8}
      >
        <Text style={styles.shelfBtnIcon}>{saved ? '🔖' : '🏷️'}</Text>
        <Text style={[styles.shelfBtnText, saved && styles.shelfBtnTextSaved]}>
          {saved ? 'Saved to My Shelf — tap to remove' : 'Add to My Shelf for conflict checking'}
        </Text>
      </TouchableOpacity>

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

      {/* Top dupes */}
      {topDupes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Top Alternatives</Text>
          <View style={styles.dupesCard}>
            {topDupes.map((dupe, i) => {
              const dupeMeta = CATEGORY_META[dupe.product.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
              const priceDiff = dupe.priceDiff;
              const priceLabel = (product.price === 0 || dupe.product.price === 0)
                ? 'No price data'
                : priceDiff === 0 ? 'Same price' : priceDiff > 0 ? `$${priceDiff} more` : `$${Math.abs(priceDiff)} less`;
              const scoreBg = dupe.score >= 70 ? '#D4F5E2' : dupe.score >= 40 ? '#FFF3CD' : '#FFE0E0';
              const scoreColor = dupe.score >= 70 ? '#1A6B3C' : dupe.score >= 40 ? '#7A5700' : '#8B1A1A';
              return (
                <TouchableOpacity
                  key={dupe.product.id}
                  style={[styles.dupeRow, i < topDupes.length - 1 && styles.dupeBorder]}
                  onPress={() => innerNav.push('ProductDetail', { productId: dupe.product.id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dupeIcon, { backgroundColor: dupeMeta.bg }]}>
                    <Text>{dupeMeta.icon}</Text>
                  </View>
                  <View style={styles.dupeInfo}>
                    <Text style={styles.dupeName}>{dupe.product.name}</Text>
                    <Text style={styles.dupeBrand}>{dupe.product.brand} · ${dupe.product.price}</Text>
                    <Text style={styles.dupeStat}>{dupeExplanation(dupe)} · {priceLabel}</Text>
                  </View>
                  <View style={[styles.scorePill, { backgroundColor: scoreBg }]}>
                    <Text style={[styles.scorePillNum, { color: scoreColor }]}>{dupe.score}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#999', fontSize: 16 },

  hero: { borderRadius: 20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center' },
  heroIcon: { fontSize: 48 },
  heroImage: { width: 72, height: 72, borderRadius: 12 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', lineHeight: 24 },
  heroBrand: { fontSize: 13, color: '#666' },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'capitalize' },

  shelfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E5E5E5',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  shelfBtnSaved: { borderColor: '#C8A2C8', backgroundColor: '#FAF0FA' },
  shelfBtnIcon: { fontSize: 20 },
  shelfBtnText: { fontSize: 13, color: '#888', fontWeight: '600', flex: 1 },
  shelfBtnTextSaved: { color: '#9B59B6' },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  summaryWarn: { backgroundColor: '#FFF5F5' },
  summaryWarnOrange: { backgroundColor: '#FFF8EE' },
  summaryNum: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  summaryLabel: { fontSize: 11, color: '#888', fontWeight: '600', textAlign: 'center' },
  summaryWarnText: { color: '#C0392B' },
  summaryOrangeText: { color: '#CA6F1E' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.8 },

  ingredientCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  ingredientRow: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  ingLeft: { flex: 1 },
  ingName: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  ingNote: { fontSize: 11, color: '#AAA', marginTop: 2, lineHeight: 15 },
  flags: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  flag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagRed: { backgroundColor: '#FFE0E0' },
  flagOrange: { backgroundColor: '#FFF0D0' },
  flagText: { fontSize: 10, fontWeight: '700', color: '#555' },

  dupesCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  dupeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dupeBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dupeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dupeInfo: { flex: 1, gap: 2 },
  dupeName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  dupeBrand: { fontSize: 12, color: '#888' },
  dupeStat: { fontSize: 11, color: '#AAA', marginTop: 1 },
  scorePill: { borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scorePillNum: { fontSize: 18, fontWeight: '800' },
});
